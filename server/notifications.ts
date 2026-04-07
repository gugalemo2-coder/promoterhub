/**
 * Push Notifications Service — Web Push (VAPID)
 * Usa a Web Push API padrão do browser, compatível com PWA em Android e iOS 16.4+.
 * Substitui o Expo Push Notification Service que só funcionava em apps nativos.
 */

import * as db from "./db";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface WebPushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

// ─── VAPID config ─────────────────────────────────────────────────────────────

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_EMAIL = process.env.VAPID_EMAIL ?? "mailto:admin@promoterhub.app";

// ─── Crypto helpers ───────────────────────────────────────────────────────────

function b64ToBuffer(b64url: string): Buffer {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - b64url.length % 4) % 4);
  return Buffer.from(b64, "base64");
}

/** Constrói PKCS8 DER para chave privada P-256 raw (32 bytes) */
function buildP256PKCS8(rawPriv: Buffer): Buffer {
  // ASN.1 PKCS8 envelope para EC P-256
  const ecHeader = Buffer.from("308141020100301306072a8648ce3d020106082a8648ce3d030107042730250201010420", "hex");
  return Buffer.concat([ecHeader, rawPriv.slice(0, 32)]);
}

async function buildVAPIDJWT(audience: string): Promise<{ jwt: string }> {
  const { subtle } = (require("crypto") as any).webcrypto;
  const privRaw = b64ToBuffer(VAPID_PRIVATE_KEY);
  const pkcs8 = buildP256PKCS8(privRaw);
  const key = await subtle.importKey("pkcs8", pkcs8, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ aud: audience, exp: now + 43200, sub: VAPID_EMAIL })).toString("base64url");
  const sigInput = `${header}.${payload}`;
  const sig = Buffer.from(await subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, Buffer.from(sigInput))).toString("base64url");
  return { jwt: `${sigInput}.${sig}` };
}

// ─── Send ─────────────────────────────────────────────────────────────────────

async function sendWebPush(sub: WebPushSubscription, payload: PushPayload): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn("[WebPush] VAPID keys not configured");
    return;
  }
  try {
    const url = new URL(sub.endpoint);
    const audience = `${url.protocol}//${url.host}`;
    const { jwt } = await buildVAPIDJWT(audience);
    const body = JSON.stringify(payload);
    const res = await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        "Authorization": `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`,
        "Content-Type": "application/json",
        "TTL": "86400",
      },
      body,
    });
    if (res.status === 410 || res.status === 404) {
      await db.deactivatePushSubscription(sub.endpoint).catch(() => {});
    } else if (!res.ok) {
      console.warn("[WebPush] Push failed:", res.status);
    }
  } catch (err) {
    console.warn("[WebPush] Error:", err);
  }
}

async function sendToUsers(userIds: number[], payload: PushPayload): Promise<void> {
  if (userIds.length === 0) return;
  const subs = await db.getWebPushSubscriptionsByUserIds(userIds);
  await Promise.allSettled(
    subs.map((s) => {
      try { return sendWebPush(JSON.parse(s.token), payload); } catch { return Promise.resolve(); }
    })
  );
}

async function sendToManagersAndMasters(payload: PushPayload): Promise<void> {
  const ids = await db.getManagerAndMasterUserIds();
  await sendToUsers(ids, payload);
}

// ─── Notification Triggers ────────────────────────────────────────────────────

export async function notifyPhotoApproved(promoterUserId: number, brandName: string, managerNotes?: string): Promise<void> {
  await sendToUsers([promoterUserId], {
    title: "✅ Foto aprovada!",
    body: managerNotes ? `Sua foto de ${brandName} foi aprovada. Obs: ${managerNotes}` : `Sua foto de ${brandName} foi aprovada pelo gestor.`,
    data: { type: "photo_approved" },
  });
}

export async function notifyPhotoRejected(promoterUserId: number, brandName: string, managerNotes?: string): Promise<void> {
  await sendToUsers([promoterUserId], {
    title: "❌ Foto recusada",
    body: managerNotes ? `Sua foto de ${brandName} foi recusada. Motivo: ${managerNotes}` : `Sua foto de ${brandName} foi recusada pelo gestor.`,
    data: { type: "photo_rejected" },
  });
}

export async function notifyClockEntry(promoterName: string, entryType: "entry" | "exit", storeName: string, time: string): Promise<void> {
  const isEntry = entryType === "entry";
  await sendToManagersAndMasters({
    title: isEntry ? "🟢 Entrada registrada" : "🔴 Saída registrada",
    body: `${promoterName} registrou ${isEntry ? "entrada" : "saída"} na loja ${storeName} às ${time}.`,
    data: { type: "clock_entry", action: entryType },
  });
}

export async function notifyNewMaterialRequest(promoterName: string, materialName: string, quantity: number): Promise<void> {
  await sendToManagersAndMasters({
    title: "📦 Nova solicitação de material",
    body: `${promoterName} solicitou ${quantity}x ${materialName}.`,
    data: { type: "material_request" },
  });
}

export async function notifyRequestApproved(promoterUserId: number, materialName: string, quantity: number): Promise<void> {
  await sendToUsers([promoterUserId], {
    title: "✅ Solicitação aprovada",
    body: `Sua solicitação de ${quantity}x ${materialName} foi aprovada!`,
    data: { type: "material_approved" },
  });
}

export async function notifyRequestRejected(promoterUserId: number, materialName: string, reason?: string): Promise<void> {
  await sendToUsers([promoterUserId], {
    title: "❌ Solicitação recusada",
    body: reason ? `${materialName}: ${reason}` : `Sua solicitação de ${materialName} foi recusada.`,
    data: { type: "material_rejected" },
  });
}

export async function notifyJourneyInconsistency(promoterName: string, date: string): Promise<void> {
  await sendToManagersAndMasters({
    title: "🕐 Inconsistência de jornada",
    body: `${promoterName} não registrou entrada em ${date}.`,
    data: { type: "journey_inconsistency" },
  });
}

export async function notifyNewPhotoForReview(promoterName: string, brandName: string, managerUserIds: number[]): Promise<void> {
  if (managerUserIds.length === 0) return;
  const title = "📸 Nova foto para revisar";
  const body = `${promoterName} enviou uma foto de ${brandName} aguardando aprovação.`;
  await Promise.all(managerUserIds.map((userId) => db.createNotification({ userId, title, body, type: "photo_approved", isRead: false }).catch(() => {})));
  await sendToUsers(managerUserIds, { title, body, data: { type: "photo_review" } });
}

export async function notifyNewFileAvailable(promoterUserIds: number[], brandName: string, fileName: string): Promise<void> {
  await sendToUsers(promoterUserIds, {
    title: "📄 Novo arquivo disponível",
    body: `${fileName} foi adicionado para a marca ${brandName}.`,
    data: { type: "new_file" },
  });
}

export async function notifyNewProductExpiration(promoterName: string, brandName: string, storeName: string): Promise<void> {
  await sendToManagersAndMasters({
    title: "⚠️ Novo vencimento registrado",
    body: `${promoterName} registrou um vencimento de ${brandName} na loja ${storeName}.`,
    data: { type: "product_expiration" },
  });
}

export async function checkAndNotifyLowDailyHours(managerId: number): Promise<{ notified: string[]; threshold: number }> {
  const settings = await db.getAppSettings(managerId);
  const threshold = settings?.dailyHoursAlertThreshold ?? 6;
  if (!(settings?.notifyLowHours ?? true) || threshold <= 0) return { notified: [], threshold };
  const now = new Date();
  const ranking = await db.getPromoterRanking(now.getFullYear(), now.getMonth() + 1);
  const low = ranking.filter((p) => p.workedDays > 0 && p.avgDailyHours < threshold);
  if (low.length === 0) return { notified: [], threshold };
  const body = low.length === 1
    ? `${low[0].userName} está com média de ${low[0].avgDailyHours}h/dia (abaixo de ${threshold}h).`
    : `${low.length} promotores abaixo de ${threshold}h/dia: ${low.map((p) => p.userName).join(", ")}.`;
  await sendToManagersAndMasters({ title: "⏱️ Média diária baixa", body, data: { type: "low_hours" } });
  await db.createNotification({ userId: managerId, title: "⏱️ Média diária baixa", body, type: "geo_alert", isRead: false }).catch(() => {});
  return { notified: low.map((p) => p.userName), threshold };
}

/** Verifica promotores com entradas em aberto por mais de X horas e notifica. */
export async function checkAndNotifyPendingExits(thresholdHours: number = 3): Promise<string[]> {
  const promoters = await db.getAllPromoterUsers();
  if (promoters.length === 0) return [];
  const now = new Date();
  const notified: string[] = [];
  for (const promoter of promoters) {
    const openEntry = await db.getLastOpenEntry(promoter.id);
    if (!openEntry) continue;
    const hoursElapsed = (now.getTime() - new Date(openEntry.entryTime).getTime()) / (1000 * 60 * 60);
    if (hoursElapsed >= thresholdHours) {
      const h = Math.floor(hoursElapsed);
      const m = Math.floor((hoursElapsed - h) * 60);
      const timeStr = m > 0 ? `${h}h ${m}min` : `${h}h`;
      const promoterName = promoter.name ?? promoter.email ?? "Promotor";
      await sendToUsers([promoter.id], {
        title: "⏰ Saída pendente",
        body: `Você está com entrada em aberto há ${timeStr}. Não esqueça de registrar sua saída!`,
        data: { type: "pending_exit" },
      });
      await sendToManagersAndMasters({
        title: "⚠️ Saída pendente",
        body: `${promoterName} está com entrada em aberto há ${timeStr} sem registrar saída.`,
        data: { type: "pending_exit", promoterId: promoter.id },
      });
      notified.push(promoterName);
    }
  }
  return notified;
}
