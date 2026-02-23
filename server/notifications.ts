/**
 * Push Notifications Service
 * Uses Expo Push Notification Service to deliver notifications to iOS and Android.
 * Docs: https://docs.expo.dev/push-notifications/sending-notifications/
 */

import * as db from "./db";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

type PushMessage = {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  badge?: number;
  priority?: "default" | "normal" | "high";
};

async function sendPushNotifications(messages: PushMessage[]): Promise<void> {
  if (messages.length === 0) return;
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });
    if (!res.ok) {
      const text = await res.text();
      console.warn("[Push] Expo push error:", text);
    }
  } catch (err) {
    console.warn("[Push] Failed to send push notifications:", err);
  }
}

async function getTokensForUsers(userIds: number[]): Promise<string[]> {
  const tokens = await db.getPushTokensByUserIds(userIds);
  return tokens.map((t) => t.token).filter((t) => t.startsWith("ExponentPushToken[") || t.startsWith("ExpoPushToken["));
}

async function getManagerTokens(): Promise<string[]> {
  const managerIds = await db.getManagerUserIds();
  if (managerIds.length === 0) return [];
  return getTokensForUsers(managerIds);
}

// ─── Notification Triggers ────────────────────────────────────────────────────

/**
 * Notify all managers when a promoter leaves the store radius.
 */
export async function notifyPromoterLeftRadius(promoterName: string, storeName: string): Promise<void> {
  const tokens = await getManagerTokens();
  if (tokens.length === 0) return;
  await sendPushNotifications(
    tokens.map((to) => ({
      to,
      title: "⚠️ Promotor fora do raio",
      body: `${promoterName} saiu do raio da loja ${storeName}.`,
      data: { type: "geo_alert", action: "left_radius" },
      sound: "default",
      priority: "high",
    }))
  );
}

/**
 * Notify all managers when a new material request is submitted.
 */
export async function notifyNewMaterialRequest(promoterName: string, materialName: string, quantity: number): Promise<void> {
  const tokens = await getManagerTokens();
  if (tokens.length === 0) return;
  await sendPushNotifications(
    tokens.map((to) => ({
      to,
      title: "📦 Nova solicitação de material",
      body: `${promoterName} solicitou ${quantity}x ${materialName}.`,
      data: { type: "material_request", action: "new" },
      sound: "default",
      priority: "high",
    }))
  );
}

/**
 * Notify a promoter when their material request is approved.
 */
export async function notifyRequestApproved(promoterUserId: number, materialName: string, quantity: number): Promise<void> {
  const tokens = await getTokensForUsers([promoterUserId]);
  if (tokens.length === 0) return;
  await sendPushNotifications(
    tokens.map((to) => ({
      to,
      title: "✅ Solicitação aprovada",
      body: `Sua solicitação de ${quantity}x ${materialName} foi aprovada!`,
      data: { type: "material_request", action: "approved" },
      sound: "default",
      priority: "high",
    }))
  );
}

/**
 * Notify a promoter when their material request is rejected.
 */
export async function notifyRequestRejected(promoterUserId: number, materialName: string, reason?: string): Promise<void> {
  const tokens = await getTokensForUsers([promoterUserId]);
  if (tokens.length === 0) return;
  await sendPushNotifications(
    tokens.map((to) => ({
      to,
      title: "❌ Solicitação recusada",
      body: reason ? `${materialName}: ${reason}` : `Sua solicitação de ${materialName} foi recusada.`,
      data: { type: "material_request", action: "rejected" },
      sound: "default",
      priority: "default",
    }))
  );
}

/**
 * Notify all managers when a promoter has a journey inconsistency (no entry registered).
 */
export async function notifyJourneyInconsistency(promoterName: string, date: string): Promise<void> {
  const tokens = await getManagerTokens();
  if (tokens.length === 0) return;
  await sendPushNotifications(
    tokens.map((to) => ({
      to,
      title: "🕐 Inconsistência de jornada",
      body: `${promoterName} não registrou entrada em ${date}.`,
      data: { type: "geo_alert", action: "no_entry" },
      sound: "default",
      priority: "default",
    }))
  );
}

/**
 * Notify a promoter when a new file is available for their brand.
 */
export async function notifyNewFileAvailable(promoterUserIds: number[], brandName: string, fileName: string): Promise<void> {
  const tokens = await getTokensForUsers(promoterUserIds);
  if (tokens.length === 0) return;
  await sendPushNotifications(
    tokens.map((to) => ({
      to,
      title: "📄 Novo arquivo disponível",
      body: `${fileName} foi adicionado para a marca ${brandName}.`,
      data: { type: "file", action: "new" },
      sound: "default",
      priority: "default",
    }))
  );
}
