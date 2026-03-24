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
 * Notify all managers and masters when a promoter uploads a new photo for review.
 */
export async function notifyNewPhotoForReview(
  promoterName: string,
  brandName: string,
  managerUserIds: number[]
): Promise<void> {
  if (managerUserIds.length === 0) return;
  const title = "📸 Nova foto para revisar";
  const body = `${promoterName} enviou uma foto de ${brandName} aguardando aprovação.`;
  // Save to notification history for each manager
  await Promise.all(
    managerUserIds.map((userId) =>
      db.createNotification({
        userId,
        title,
        body,
        type: "photo_approved",
        isRead: false,
      }).catch(() => {})
    )
  );
  // Send push notifications
  const tokens = await getTokensForUsers(managerUserIds);
  if (tokens.length === 0) return;
  await sendPushNotifications(
    tokens.map((to) => ({
      to,
      title,
      body,
      data: { type: "photo_review", action: "new" },
      sound: "default" as const,
      priority: "high" as const,
    }))
  );
}

/**
 * Check all promoters for the current month and notify managers about those
 * whose daily average hours are below the configured threshold.
 * Returns a list of promoter names that triggered the alert.
 */
export async function checkAndNotifyLowDailyHours(
  managerId: number
): Promise<{ notified: string[]; threshold: number }> {
  const settings = await db.getAppSettings(managerId);
  const threshold = settings?.dailyHoursAlertThreshold ?? 6;
  const notifyEnabled = settings?.notifyLowHours ?? true;

  if (!notifyEnabled || threshold <= 0) return { notified: [], threshold };

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // Get full ranking with avgDailyHours for all promoters
  const ranking = await db.getPromoterRanking(year, month);

  // Filter promoters with avgDailyHours below threshold (only those who worked at least 1 day)
  const lowPromoters = ranking.filter(
    (p) => p.workedDays > 0 && p.avgDailyHours < threshold
  );

  if (lowPromoters.length === 0) return { notified: [], threshold };

  const managerTokens = await getManagerTokens();
  if (managerTokens.length === 0) return { notified: lowPromoters.map((p) => p.userName), threshold };

  const names = lowPromoters.map((p) => p.userName).join(", ");
  const body =
    lowPromoters.length === 1
      ? `${lowPromoters[0].userName} está com média de ${lowPromoters[0].avgDailyHours}h/dia (abaixo de ${threshold}h).`
      : `${lowPromoters.length} promotores abaixo de ${threshold}h/dia: ${names}.`;

  await sendPushNotifications(
    managerTokens.map((to) => ({
      to,
      title: "⏱️ Média diária baixa",
      body,
      data: { type: "low_hours_alert", action: "daily_avg" },
      sound: "default" as const,
      priority: "high" as const,
    }))
  );

  // Save to notification history for the manager
  await db.createNotification({
    userId: managerId,
    title: "⏱️ Média diária baixa",
    body,
    type: "geo_alert",
    isRead: false,
  }).catch(() => {});

  return { notified: lowPromoters.map((p) => p.userName), threshold };
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

/**
 * Check all promoters for open entries older than the given threshold (in hours).
 * Sends a push notification directly to the promoter reminding them to register exit.
 * Also notifies managers about the pending exit.
 * Returns the list of promoter names notified.
 */
export async function checkAndNotifyPendingExits(thresholdHours: number = 3): Promise<string[]> {
  const promoters = await db.getAllPromoterUsers();
  if (promoters.length === 0) return [];

  const now = new Date();
  const notified: string[] = [];

  for (const promoter of promoters) {
    const openEntry = await db.getLastOpenEntry(promoter.id);
    if (!openEntry) continue;

    const entryTime = new Date(openEntry.entryTime);
    const hoursElapsed = (now.getTime() - entryTime.getTime()) / (1000 * 60 * 60);

    if (hoursElapsed >= thresholdHours) {
      const hoursInt = Math.floor(hoursElapsed);
      const minutesInt = Math.floor((hoursElapsed - hoursInt) * 60);
      const timeStr = minutesInt > 0 ? `${hoursInt}h ${minutesInt}min` : `${hoursInt}h`;
      const promoterName = promoter.name ?? promoter.email ?? "Promotor";

      // Notify the promoter directly
      const promoterTokens = await getTokensForUsers([promoter.id]);
      if (promoterTokens.length > 0) {
        await sendPushNotifications(
          promoterTokens.map((to) => ({
            to,
            title: "⏰ Saída pendente",
            body: `Você está com entrada em aberto há ${timeStr}. Não esqueça de registrar sua saída!`,
            data: { type: "pending_exit", action: "reminder" },
            sound: "default" as const,
            priority: "high" as const,
          }))
        );
      }

      // Also notify managers
      const managerTokens = await getManagerTokens();
      if (managerTokens.length > 0) {
        await sendPushNotifications(
          managerTokens.map((to) => ({
            to,
            title: "⚠️ Saída pendente",
            body: `${promoterName} está com entrada em aberto há ${timeStr} sem registrar saída.`,
            data: { type: "pending_exit", action: "manager_alert", promoterId: promoter.id },
            sound: "default" as const,
            priority: "high" as const,
          }))
        );
      }

      notified.push(promoterName);
    }
  }

  return notified;
}
