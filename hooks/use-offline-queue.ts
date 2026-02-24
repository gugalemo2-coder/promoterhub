/**
 * useOfflineQueue
 *
 * Fila local persistida no AsyncStorage para o Promotor registrar ações
 * (ponto, fotos, solicitações de material) sem conexão com a internet.
 * A sincronização ocorre automaticamente quando a conectividade é restaurada.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { trpc } from "@/lib/trpc";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OfflineActionType =
  | "clock_entry"
  | "clock_exit"
  | "photo_upload"
  | "material_request";

export interface OfflineAction {
  id: string;
  type: OfflineActionType;
  payload: Record<string, unknown>;
  createdAt: string; // ISO string
  retries: number;
  status: "pending" | "syncing" | "failed";
  errorMessage?: string;
}

const QUEUE_KEY = "offline_queue_v1";
const MAX_RETRIES = 3;

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function loadQueue(): Promise<OfflineAction[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as OfflineAction[]) : [];
  } catch {
    return [];
  }
}

async function saveQueue(queue: OfflineAction[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // silently ignore storage errors
  }
}

function generateId(): string {
  return `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOfflineQueue() {
  const [queue, setQueue] = useState<OfflineAction[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncInProgress = useRef(false);

  const utils = trpc.useUtils();

  // ─── Load queue on mount ────────────────────────────────────────────────
  useEffect(() => {
    loadQueue().then(setQueue);
  }, []);

  // ─── Monitor network connectivity ──────────────────────────────────────
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const online = !!(state.isConnected && state.isInternetReachable);
      setIsOnline(online);
      if (online) {
        // Trigger sync when connection is restored
        syncQueueRef.current();
      }
    });
    return () => unsubscribe();
  }, []);

  // ─── Sync when app comes to foreground ─────────────────────────────────
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (nextState === "active" && isOnline) {
        syncQueueRef.current();
      }
    });
    return () => subscription.remove();
  }, [isOnline]);

  // ─── Enqueue action ────────────────────────────────────────────────────
  const enqueue = useCallback(
    async (type: OfflineActionType, payload: Record<string, unknown>) => {
      const action: OfflineAction = {
        id: generateId(),
        type,
        payload,
        createdAt: new Date().toISOString(),
        retries: 0,
        status: "pending",
      };

      const updated = [...queue, action];
      setQueue(updated);
      await saveQueue(updated);
      return action.id;
    },
    [queue]
  );

  // ─── Remove action from queue ──────────────────────────────────────────
  const dequeue = useCallback(
    async (id: string) => {
      const updated = queue.filter((a) => a.id !== id);
      setQueue(updated);
      await saveQueue(updated);
    },
    [queue]
  );

  // ─── Mark action as failed ─────────────────────────────────────────────
  const markFailed = useCallback(
    async (id: string, errorMessage: string) => {
      const updated = queue.map((a) =>
        a.id === id
          ? { ...a, status: "failed" as const, retries: a.retries + 1, errorMessage }
          : a
      );
      setQueue(updated);
      await saveQueue(updated);
    },
    [queue]
  );

  // ─── Sync queue ────────────────────────────────────────────────────────
  const syncQueue = useCallback(async () => {
    if (syncInProgress.current || !isOnline) return;
    const currentQueue = await loadQueue();
    const pending = currentQueue.filter(
      (a) => a.status === "pending" && a.retries < MAX_RETRIES
    );
    if (pending.length === 0) return;

    syncInProgress.current = true;
    setIsSyncing(true);

    for (const action of pending) {
      try {
        await processAction(action, utils);
        // Remove from queue on success
        const q = await loadQueue();
        const updated = q.filter((a) => a.id !== action.id);
        await saveQueue(updated);
        setQueue(updated);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erro desconhecido";
        const q = await loadQueue();
        const updated = q.map((a) =>
          a.id === action.id
            ? {
                ...a,
                status: a.retries + 1 >= MAX_RETRIES ? ("failed" as const) : ("pending" as const),
                retries: a.retries + 1,
                errorMessage: msg,
              }
            : a
        );
        await saveQueue(updated);
        setQueue(updated);
      }
    }

    syncInProgress.current = false;
    setIsSyncing(false);
    // Invalidate relevant queries after sync
    utils.timeEntries.invalidate();
    utils.photos.invalidate();
    utils.materialRequests.invalidate();
  }, [isOnline, utils]);

  // Keep a ref so event listeners always call the latest version
  const syncQueueRef = useRef(syncQueue);
  useEffect(() => {
    syncQueueRef.current = syncQueue;
  }, [syncQueue]);

  // ─── Clear failed actions ──────────────────────────────────────────────
  const clearFailed = useCallback(async () => {
    const updated = queue.filter((a) => a.status !== "failed");
    setQueue(updated);
    await saveQueue(updated);
  }, [queue]);

  // ─── Retry failed actions ──────────────────────────────────────────────
  const retryFailed = useCallback(async () => {
    const updated = queue.map((a) =>
      a.status === "failed" ? { ...a, status: "pending" as const, retries: 0, errorMessage: undefined } : a
    );
    setQueue(updated);
    await saveQueue(updated);
    syncQueue();
  }, [queue, syncQueue]);

  const pendingCount = queue.filter((a) => a.status === "pending").length;
  const failedCount = queue.filter((a) => a.status === "failed").length;

  return {
    queue,
    isOnline,
    isSyncing,
    pendingCount,
    failedCount,
    enqueue,
    dequeue,
    markFailed,
    syncQueue,
    clearFailed,
    retryFailed,
  };
}

// ─── Process individual action ────────────────────────────────────────────────

async function processAction(
  action: OfflineAction,
  utils: ReturnType<typeof trpc.useUtils>
): Promise<void> {
  switch (action.type) {
    case "clock_entry":
    case "clock_exit": {
      const p = action.payload as {
        storeId: number;
        entryType: "entry" | "exit";
        latitude: number;
        longitude: number;
        accuracy?: number;
        distanceFromStore?: number;
        isWithinRadius?: boolean;
        notes?: string;
      };
      await utils.client.timeEntries.create.mutate({
        storeId: p.storeId,
        entryType: p.entryType,
        latitude: p.latitude,
        longitude: p.longitude,
        accuracy: p.accuracy,
        notes: p.notes,
      });
      break;
    }
    case "material_request": {
      const p = action.payload as {
        materialId: number;
        storeId: number;
        quantityRequested: number;
        priority?: "low" | "medium" | "high";
        notes?: string;
      };
      await utils.client.materialRequests.create.mutate({
        materialId: p.materialId,
        storeId: p.storeId,
        quantityRequested: p.quantityRequested,
        priority: p.priority ?? "medium",
        notes: p.notes,
      });
      break;
    }
    case "photo_upload": {
      // Photos with base64 payload — re-upload when online
      const p = action.payload as {
        brandId: number;
        storeId: number;
        photoBase64: string;
        fileType: string;
        description?: string;
        latitude?: number;
        longitude?: number;
      };
      await utils.client.photos.upload.mutate({
        brandId: p.brandId,
        storeId: p.storeId,
        fileBase64: p.photoBase64,
        fileType: p.fileType ?? "image/jpeg",
        description: p.description,
        latitude: p.latitude,
        longitude: p.longitude,
      });
      break;
    }
    default:
      throw new Error(`Tipo de ação desconhecido: ${(action as OfflineAction).type}`);
  }
}
