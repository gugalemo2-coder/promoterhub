import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  brands,
  geoAlerts,
  materialRequests,
  materials,
  notifications,
  photos,
  promoterProfiles,
  pushTokens,
  signedReports,
  stockFiles,
  stores,
  timeEntries,
  users,
  type Brand,
  type GeoAlert,
  type InsertBrand,
  type InsertGeoAlert,
  type InsertMaterial,
  type InsertMaterialRequest,
  type InsertNotification,
  type InsertPhoto,
  type InsertPromoterProfile,
  type InsertSignedReport,
  type InsertStockFile,
  type InsertStore,
  type InsertTimeEntry,
  type InsertUser,
  type Material,
  type MaterialRequest,
  type Notification,
  type Photo,
  type PromoterProfile,
  type InsertPushToken,
  type PushToken,
  type SignedReport,
  type StockFile,
  type Store,
  type TimeEntry,
  type User,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── USERS ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── PROMOTER PROFILES ────────────────────────────────────────────────────────

export async function getPromoterProfile(userId: number): Promise<PromoterProfile | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(promoterProfiles).where(eq(promoterProfiles.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertPromoterProfile(data: InsertPromoterProfile): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(promoterProfiles).values(data).onDuplicateKeyUpdate({ set: { appRole: data.appRole, storeId: data.storeId, status: data.status } });
}

export async function getAllPromoterUsers(): Promise<User[]> {
  const db = await getDb();
  if (!db) return [];
  const profiles = await db.select().from(promoterProfiles).where(eq(promoterProfiles.appRole, "promoter"));
  if (profiles.length === 0) return [];
  const userIds = profiles.map((p) => p.userId);
  const allUsers = await db.select().from(users);
  return allUsers.filter((u) => userIds.includes(u.id));
}

// ─── STORES ───────────────────────────────────────────────────────────────────

export async function getStores(): Promise<Store[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(stores).where(eq(stores.status, "active"));
}

export async function getStoreById(id: number): Promise<Store | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(stores).where(eq(stores.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createStore(data: InsertStore): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(stores).values(data);
  return result[0].insertId;
}

// ─── BRANDS ───────────────────────────────────────────────────────────────────

export async function getBrands(): Promise<Brand[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(brands).where(eq(brands.status, "active")).orderBy(brands.sortOrder);
}

export async function getBrandById(id: number): Promise<Brand | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(brands).where(eq(brands.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function seedBrands(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(brands);
  if (existing.length > 0) return;
  const defaultBrands = [
    { name: "Sinhá", colorHex: "#E53E3E", iconName: "local_offer", sortOrder: 1 },
    { name: "LeitBom", colorHex: "#3182CE", iconName: "local_drink", sortOrder: 2 },
    { name: "Paraná", colorHex: "#38A169", iconName: "eco", sortOrder: 3 },
    { name: "Emana", colorHex: "#D69E2E", iconName: "star", sortOrder: 4 },
    { name: "UltraPlas", colorHex: "#805AD5", iconName: "inventory_2", sortOrder: 5 },
  ];
  await db.insert(brands).values(defaultBrands);
}

// ─── TIME ENTRIES ─────────────────────────────────────────────────────────────

export async function createTimeEntry(data: InsertTimeEntry): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(timeEntries).values(data);
  return result[0].insertId;
}

export async function getTimeEntriesByUser(userId: number, startDate?: Date, endDate?: Date): Promise<TimeEntry[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(timeEntries.userId, userId)];
  if (startDate) conditions.push(gte(timeEntries.entryTime, startDate));
  if (endDate) conditions.push(lte(timeEntries.entryTime, endDate));
  return db.select().from(timeEntries).where(and(...conditions)).orderBy(desc(timeEntries.entryTime));
}

export async function getLastOpenEntry(userId: number): Promise<TimeEntry | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const result = await db.select().from(timeEntries).where(and(eq(timeEntries.userId, userId), gte(timeEntries.entryTime, today))).orderBy(desc(timeEntries.entryTime)).limit(1);
  if (result.length === 0) return undefined;
  return result[0].entryType === "entry" ? result[0] : undefined;
}

export async function getDailySummary(userId: number, date: Date) {
  const db = await getDb();
  if (!db) return null;
  const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999);
  const entries = await db.select().from(timeEntries).where(and(eq(timeEntries.userId, userId), gte(timeEntries.entryTime, dayStart), lte(timeEntries.entryTime, dayEnd))).orderBy(timeEntries.entryTime);
  let totalMinutes = 0; let lastEntry: TimeEntry | null = null;
  for (const entry of entries) {
    if (entry.entryType === "entry") { lastEntry = entry; }
    else if (entry.entryType === "exit" && lastEntry) { totalMinutes += (entry.entryTime.getTime() - lastEntry.entryTime.getTime()) / 60000; lastEntry = null; }
  }
  return { date, entries, totalMinutes, totalHours: totalMinutes / 60, hasOpenEntry: lastEntry !== null };
}

export async function getAllTimeEntriesForDate(date: Date): Promise<TimeEntry[]> {
  const db = await getDb();
  if (!db) return [];
  const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999);
  return db.select().from(timeEntries).where(and(gte(timeEntries.entryTime, dayStart), lte(timeEntries.entryTime, dayEnd))).orderBy(desc(timeEntries.entryTime));
}

// ─── PHOTOS ───────────────────────────────────────────────────────────────────

export async function createPhoto(data: InsertPhoto): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(photos).values(data);
  return result[0].insertId;
}

export async function getPhotos(filters: { userId?: number; brandId?: number; storeId?: number; startDate?: Date; endDate?: Date; status?: "pending" | "approved" | "rejected"; limit?: number; offset?: number; }): Promise<Photo[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters.userId) conditions.push(eq(photos.userId, filters.userId));
  if (filters.brandId) conditions.push(eq(photos.brandId, filters.brandId));
  if (filters.storeId) conditions.push(eq(photos.storeId, filters.storeId));
  if (filters.startDate) conditions.push(gte(photos.photoTimestamp, filters.startDate));
  if (filters.endDate) conditions.push(lte(photos.photoTimestamp, filters.endDate));
  if (filters.status) conditions.push(eq(photos.status, filters.status));
  return db.select().from(photos).where(conditions.length > 0 ? and(...conditions) : undefined).orderBy(desc(photos.photoTimestamp)).limit(filters.limit ?? 50).offset(filters.offset ?? 0);
}

export async function updatePhoto(id: number, data: Partial<InsertPhoto>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(photos).set(data).where(eq(photos.id, id));
}

// ─── MATERIALS ────────────────────────────────────────────────────────────────

export async function createMaterial(data: InsertMaterial): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(materials).values(data);
  return result[0].insertId;
}

export async function getMaterials(brandId?: number): Promise<Material[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(materials.status, "active")];
  if (brandId) conditions.push(eq(materials.brandId, brandId));
  return db.select().from(materials).where(and(...conditions));
}

export async function getMaterialById(id: number): Promise<Material | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(materials).where(eq(materials.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateMaterial(id: number, data: Partial<InsertMaterial>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(materials).set(data).where(eq(materials.id, id));
}

// ─── MATERIAL REQUESTS ────────────────────────────────────────────────────────

export async function createMaterialRequest(data: InsertMaterialRequest): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(materialRequests).values(data);
  return result[0].insertId;
}

export async function getMaterialRequests(filters: { userId?: number; status?: "pending" | "approved" | "rejected" | "delivered" | "cancelled"; limit?: number; offset?: number; }): Promise<MaterialRequest[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters.userId) conditions.push(eq(materialRequests.userId, filters.userId));
  if (filters.status) conditions.push(eq(materialRequests.status, filters.status));
  return db.select().from(materialRequests).where(conditions.length > 0 ? and(...conditions) : undefined).orderBy(desc(materialRequests.requestedAt)).limit(filters.limit ?? 50).offset(filters.offset ?? 0);
}

export async function getMaterialRequestById(id: number): Promise<MaterialRequest | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(materialRequests).where(eq(materialRequests.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateMaterialRequest(id: number, data: Partial<InsertMaterialRequest>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(materialRequests).set(data).where(eq(materialRequests.id, id));
}

// ─── STOCK FILES ──────────────────────────────────────────────────────────────

export async function createStockFile(data: InsertStockFile): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(stockFiles).values(data);
  return result[0].insertId;
}

export async function getStockFiles(brandId?: number): Promise<StockFile[]> {
  const db = await getDb();
  if (!db) return [];
  if (brandId) return db.select().from(stockFiles).where(eq(stockFiles.brandId, brandId)).orderBy(desc(stockFiles.createdAt));
  return db.select().from(stockFiles).orderBy(desc(stockFiles.createdAt));
}

// ─── GEO ALERTS ───────────────────────────────────────────────────────────────

export async function createGeoAlert(data: InsertGeoAlert): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(geoAlerts).values(data);
  return result[0].insertId;
}

export async function getGeoAlerts(filters: { userId?: number; acknowledged?: boolean; limit?: number; }): Promise<GeoAlert[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters.userId !== undefined) conditions.push(eq(geoAlerts.userId, filters.userId));
  if (filters.acknowledged !== undefined) conditions.push(eq(geoAlerts.acknowledged, filters.acknowledged));
  return db.select().from(geoAlerts).where(conditions.length > 0 ? and(...conditions) : undefined).orderBy(desc(geoAlerts.alertTimestamp)).limit(filters.limit ?? 50);
}

export async function acknowledgeGeoAlert(id: number, acknowledgedBy: number, notes?: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(geoAlerts).set({ acknowledged: true, acknowledgedBy, acknowledgedAt: new Date(), notes }).where(eq(geoAlerts.id, id));
}

// ─── REPORTS ──────────────────────────────────────────────────────────────────

export async function getDailyReport(date: Date) {
  const db = await getDb();
  if (!db) return null;
  const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999);
  const [entriesCount, photosCount, requestsCount, alertsCount] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(timeEntries).where(and(gte(timeEntries.entryTime, dayStart), lte(timeEntries.entryTime, dayEnd))),
    db.select({ count: sql<number>`count(*)` }).from(photos).where(and(gte(photos.photoTimestamp, dayStart), lte(photos.photoTimestamp, dayEnd))),
    db.select({ count: sql<number>`count(*)` }).from(materialRequests).where(and(gte(materialRequests.requestedAt, dayStart), lte(materialRequests.requestedAt, dayEnd))),
    db.select({ count: sql<number>`count(*)` }).from(geoAlerts).where(and(gte(geoAlerts.alertTimestamp, dayStart), lte(geoAlerts.alertTimestamp, dayEnd))),
  ]);
  return {
    date,
    totalEntries: Number(entriesCount[0]?.count ?? 0),
    totalPhotos: Number(photosCount[0]?.count ?? 0),
    totalRequests: Number(requestsCount[0]?.count ?? 0),
    totalAlerts: Number(alertsCount[0]?.count ?? 0),
  };
}

// ─── MONTHLY REPORT ───────────────────────────────────────────────────────────

export async function getMonthlyReport(year: number, month: number, userId?: number) {
  const db = await getDb();
  if (!db) return null;

  const monthStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

  // Build daily breakdown for the month
  const daysInMonth = new Date(year, month, 0).getDate();
  const dailyData: { day: number; hours: number; photos: number; requests: number }[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dayStart = new Date(year, month - 1, d, 0, 0, 0, 0);
    const dayEnd = new Date(year, month - 1, d, 23, 59, 59, 999);

    const conditions = [gte(timeEntries.entryTime, dayStart), lte(timeEntries.entryTime, dayEnd)];
    if (userId) conditions.push(eq(timeEntries.userId, userId));
    const dayEntries = await db.select().from(timeEntries).where(and(...conditions)).orderBy(timeEntries.entryTime);

    let totalMinutes = 0;
    let lastEntry: TimeEntry | null = null;
    for (const entry of dayEntries) {
      if (entry.entryType === "entry") { lastEntry = entry; }
      else if (entry.entryType === "exit" && lastEntry) {
        totalMinutes += (entry.entryTime.getTime() - lastEntry.entryTime.getTime()) / 60000;
        lastEntry = null;
      }
    }

    const photoConditions = [gte(photos.photoTimestamp, dayStart), lte(photos.photoTimestamp, dayEnd)];
    if (userId) photoConditions.push(eq(photos.userId, userId));
    const [photoCount] = await db.select({ count: sql<number>`count(*)` }).from(photos).where(and(...photoConditions));

    const reqConditions = [gte(materialRequests.requestedAt, dayStart), lte(materialRequests.requestedAt, dayEnd)];
    if (userId) reqConditions.push(eq(materialRequests.userId, userId));
    const [reqCount] = await db.select({ count: sql<number>`count(*)` }).from(materialRequests).where(and(...reqConditions));

    dailyData.push({ day: d, hours: totalMinutes / 60, photos: Number(photoCount?.count ?? 0), requests: Number(reqCount?.count ?? 0) });
  }

  // Photos by brand
  const brandConditions = [gte(photos.photoTimestamp, monthStart), lte(photos.photoTimestamp, monthEnd)];
  if (userId) brandConditions.push(eq(photos.userId, userId));
  const photosByBrandRaw = await db
    .select({ brandId: photos.brandId, count: sql<number>`count(*)` })
    .from(photos)
    .where(and(...brandConditions))
    .groupBy(photos.brandId);

  const allBrands = await getBrands();
  const photosByBrand = photosByBrandRaw.map((r) => ({
    brandId: r.brandId,
    brandName: allBrands.find((b) => b.id === r.brandId)?.name ?? `Marca ${r.brandId}`,
    brandColor: allBrands.find((b) => b.id === r.brandId)?.colorHex ?? "#6B7280",
    count: Number(r.count),
  }));

  // Totals
  const totalHours = dailyData.reduce((sum, d) => sum + d.hours, 0);
  const totalPhotos = dailyData.reduce((sum, d) => sum + d.photos, 0);
  const totalRequests = dailyData.reduce((sum, d) => sum + d.requests, 0);
  const workingDays = dailyData.filter((d) => d.hours > 0).length;

  return { year, month, dailyData, photosByBrand, totalHours, totalPhotos, totalRequests, workingDays };
}

// ─── PUSH TOKENS ──────────────────────────────────────────────────────────────

export async function upsertPushToken(data: InsertPushToken): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Deactivate old tokens for this user/device, then insert new one
  if (data.deviceId) {
    await db
      .update(pushTokens)
      .set({ isActive: false })
      .where(and(eq(pushTokens.userId, data.userId), eq(pushTokens.deviceId, data.deviceId)));
  }
  await db.insert(pushTokens).values({ ...data, isActive: true });
}

export async function getPushTokensByUserId(userId: number): Promise<PushToken[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pushTokens).where(and(eq(pushTokens.userId, userId), eq(pushTokens.isActive, true)));
}

export async function getPushTokensByUserIds(userIds: number[]): Promise<PushToken[]> {
  const db = await getDb();
  if (!db || userIds.length === 0) return [];
  return db.select().from(pushTokens).where(and(inArray(pushTokens.userId, userIds), eq(pushTokens.isActive, true)));
}

export async function getManagerUserIds(): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  const managers = await db
    .select({ userId: promoterProfiles.userId })
    .from(promoterProfiles)
    .where(eq(promoterProfiles.appRole, "manager"));
  return managers.map((m) => m.userId);
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

export async function createNotification(data: InsertNotification): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.insert(notifications).values(data);
  return (result[0] as any).insertId ?? 0;
}

export async function getNotificationsByUser(userId: number, limit = 50): Promise<Notification[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function markNotificationRead(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true, readAt: new Date() }).where(eq(notifications.id, id));
}

export async function markAllNotificationsRead(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
}

export async function getUnreadNotificationCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return Number(result[0]?.count ?? 0);
}

// ─── BRANDS CRUD ──────────────────────────────────────────────────────────────

export async function getAllBrands(): Promise<Brand[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(brands).orderBy(brands.sortOrder);
}

export async function createBrand(data: Omit<InsertBrand, "id">): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(brands).values(data);
  return (result[0] as any).insertId ?? 0;
}

export async function updateBrand(id: number, data: Partial<InsertBrand>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(brands).set(data).where(eq(brands.id, id));
}

export async function toggleBrandStatus(id: number, status: "active" | "inactive"): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(brands).set({ status }).where(eq(brands.id, id));
}

// ─── SIGNED REPORTS ───────────────────────────────────────────────────────────

export async function createSignedReport(data: InsertSignedReport): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(signedReports).values(data);
  return (result[0] as any).insertId ?? 0;
}

export async function getSignedReportById(reportId: string): Promise<SignedReport | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(signedReports).where(eq(signedReports.reportId, reportId)).limit(1);
  return result[0];
}

export async function getSignedReportsByManager(managerId: number): Promise<SignedReport[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(signedReports)
    .where(eq(signedReports.managerId, managerId))
    .orderBy(desc(signedReports.signedAt));
}

// ─── STORE PERFORMANCE DASHBOARD ─────────────────────────────────────────────

export interface StorePerformanceData {
  storeId: number;
  storeName: string;
  city: string | null;
  state: string | null;
  // Raw metrics
  totalVisits: number;
  totalPhotos: number;
  approvedPhotos: number;
  totalMaterialRequests: number;
  approvedMaterialRequests: number;
  totalCoverageMinutes: number;
  totalAlerts: number;
  // Computed
  avgPhotosPerVisit: number;
  photoApprovalRate: number;
  materialApprovalRate: number;
  avgCoverageHoursPerVisit: number;
  // Score composto (0-100)
  score: number;
  rank: number;
}

export async function getStorePerformance(year: number, month: number, promoterId?: number): Promise<StorePerformanceData[]> {
  const db = await getDb();
  if (!db) return [];

  // Date range for the month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  // Fetch all active stores
  const allStores = await db
    .select({ id: stores.id, name: stores.name, city: stores.city, state: stores.state })
    .from(stores)
    .where(eq(stores.status, "active"));

  if (allStores.length === 0) return [];

  // Fetch time entries for the period (optionally filtered by promoter)
  const entriesQuery = db
    .select()
    .from(timeEntries)
    .where(
      and(
        gte(timeEntries.entryTime, startDate),
        lte(timeEntries.entryTime, endDate),
        promoterId ? eq(timeEntries.userId, promoterId) : undefined
      )
    );
  const entries = await entriesQuery;

  // Fetch photos for the period (optionally filtered by promoter)
  const photoData = await db
    .select()
    .from(photos)
    .where(
      and(
        gte(photos.photoTimestamp, startDate),
        lte(photos.photoTimestamp, endDate),
        promoterId ? eq(photos.userId, promoterId) : undefined
      )
    );

  // Fetch material requests for the period (optionally filtered by promoter)
  const matRequests = await db
    .select()
    .from(materialRequests)
    .where(
      and(
        gte(materialRequests.requestedAt, startDate),
        lte(materialRequests.requestedAt, endDate),
        promoterId ? eq(materialRequests.userId, promoterId) : undefined
      )
    );

  // Fetch geo alerts for the period (optionally filtered by promoter)
  const alerts = await db
    .select()
    .from(geoAlerts)
    .where(
      and(
        gte(geoAlerts.alertTimestamp, startDate),
        lte(geoAlerts.alertTimestamp, endDate),
        promoterId ? eq(geoAlerts.userId, promoterId) : undefined
      )
    );

  // If filtering by promoter, only include stores they visited
  const relevantStoreIds = promoterId
    ? new Set(entries.map((e) => e.storeId))
    : null;

  // Compute per-store metrics
  const storeMap = new Map<number, StorePerformanceData>();

  for (const store of allStores) {
    // Skip stores not visited by the filtered promoter
    if (relevantStoreIds && !relevantStoreIds.has(store.id)) continue;

    // Visits = number of "entry" time entries for this store
    const storeEntries = entries.filter((e) => e.storeId === store.id);
    const totalVisits = storeEntries.filter((e) => e.entryType === "entry").length;

    // Coverage: pair entry/exit to compute minutes
    const entryTimes = storeEntries
      .filter((e) => e.entryType === "entry")
      .map((e) => e.entryTime.getTime());
    const exitTimes = storeEntries
      .filter((e) => e.entryType === "exit")
      .map((e) => e.entryTime.getTime());
    let totalCoverageMinutes = 0;
    const pairs = Math.min(entryTimes.length, exitTimes.length);
    for (let i = 0; i < pairs; i++) {
      const diff = (exitTimes[i] - entryTimes[i]) / 60000;
      if (diff > 0 && diff < 720) totalCoverageMinutes += diff; // cap at 12h
    }

    // Photos
    const storePhotos = photoData.filter((p) => p.storeId === store.id);
    const totalPhotos = storePhotos.length;
    const approvedPhotos = storePhotos.filter((p) => p.status === "approved").length;

    // Material requests
    const storeMat = matRequests.filter((r) => r.storeId === store.id);
    const totalMaterialRequests = storeMat.length;
    const approvedMaterialRequests = storeMat.filter(
      (r) => r.status === "approved" || r.status === "delivered"
    ).length;

    // Alerts
    const storeAlerts = alerts.filter((a) => a.storeId === store.id).length;

    // Derived
    const avgPhotosPerVisit = totalVisits > 0 ? totalPhotos / totalVisits : 0;
    const photoApprovalRate = totalPhotos > 0 ? approvedPhotos / totalPhotos : 0;
    const materialApprovalRate =
      totalMaterialRequests > 0 ? approvedMaterialRequests / totalMaterialRequests : 0;
    const avgCoverageHoursPerVisit =
      totalVisits > 0 ? totalCoverageMinutes / 60 / totalVisits : 0;

    storeMap.set(store.id, {
      storeId: store.id,
      storeName: store.name,
      city: store.city,
      state: store.state,
      totalVisits,
      totalPhotos,
      approvedPhotos,
      totalMaterialRequests,
      approvedMaterialRequests,
      totalCoverageMinutes,
      totalAlerts: storeAlerts,
      avgPhotosPerVisit,
      photoApprovalRate,
      materialApprovalRate,
      avgCoverageHoursPerVisit,
      score: 0,
      rank: 0,
    });
  }

  const results = Array.from(storeMap.values());

  // Normalize each metric to 0-1 range across all stores, then compute weighted score
  const maxVisits = Math.max(...results.map((r) => r.totalVisits), 1);
  const maxPhotos = Math.max(...results.map((r) => r.totalPhotos), 1);
  const maxCoverage = Math.max(...results.map((r) => r.totalCoverageMinutes), 1);

  for (const r of results) {
    // Weights: visits 25%, photos 20%, photo approval 20%, coverage 20%, materials 10%, alerts penalty 5%
    const visitScore = (r.totalVisits / maxVisits) * 25;
    const photoVolumeScore = (r.totalPhotos / maxPhotos) * 20;
    const photoQualityScore = r.photoApprovalRate * 20;
    const coverageScore = (r.totalCoverageMinutes / maxCoverage) * 20;
    const materialScore = r.materialApprovalRate * 10;
    const alertPenalty = Math.min(r.totalAlerts * 1.5, 5); // max -5 points

    r.score = Math.max(
      0,
      Math.round(visitScore + photoVolumeScore + photoQualityScore + coverageScore + materialScore - alertPenalty)
    );
  }

  // Sort by score descending and assign rank
  results.sort((a, b) => b.score - a.score);
  results.forEach((r, i) => {
    r.rank = i + 1;
  });

  return results;
}

// ─── Promoter Profile Stats ────────────────────────────────────────────────────

export interface PromoterMonthlyStats {
  totalApprovedPhotos: number;
  totalMaterialRequests: number;
  totalHoursWorked: number;
  totalVisits: number;
  avgScoreStores: number;
  brandBreakdown: { brandId: number; brandName: string; approvedPhotos: number }[];
}

export async function getPromoterMonthlyStats(
  userId: number,
  year: number,
  month: number
): Promise<PromoterMonthlyStats> {
  const db = await getDb();
  if (!db) return { totalApprovedPhotos: 0, totalMaterialRequests: 0, totalHoursWorked: 0, totalVisits: 0, avgScoreStores: 0, brandBreakdown: [] };

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  // Fetch approved photos for the month
  const approvedPhotos = await db
    .select()
    .from(photos)
    .where(
      and(
        eq(photos.userId, userId),
        eq(photos.status, "approved"),
        gte(photos.photoTimestamp, startDate),
        lte(photos.photoTimestamp, endDate)
      )
    );

  // Fetch material requests for the month
  const matReqs = await db
    .select()
    .from(materialRequests)
    .where(
      and(
        eq(materialRequests.userId, userId),
        gte(materialRequests.requestedAt, startDate),
        lte(materialRequests.requestedAt, endDate)
      )
    );

  // Fetch time entries for the month
  const entries = await db
    .select()
    .from(timeEntries)
    .where(
      and(
        eq(timeEntries.userId, userId),
        gte(timeEntries.entryTime, startDate),
        lte(timeEntries.entryTime, endDate)
      )
    );

  // Compute hours worked from entry/exit pairs
  const entryTimes = entries.filter((e) => e.entryType === "entry").map((e) => e.entryTime.getTime());
  const exitTimes = entries.filter((e) => e.entryType === "exit").map((e) => e.entryTime.getTime());
  let totalMinutes = 0;
  const pairs = Math.min(entryTimes.length, exitTimes.length);
  for (let i = 0; i < pairs; i++) {
    const diff = (exitTimes[i] - entryTimes[i]) / 60000;
    if (diff > 0 && diff < 720) totalMinutes += diff;
  }

  const totalVisits = entries.filter((e) => e.entryType === "entry").length;

  // Brand breakdown of approved photos
  const allBrands = await db.select().from(brands).where(eq(brands.status, "active"));
  const brandBreakdown = allBrands
    .map((b) => ({
      brandId: b.id,
      brandName: b.name,
      approvedPhotos: approvedPhotos.filter((p) => p.brandId === b.id).length,
    }))
    .filter((b) => b.approvedPhotos > 0);

  return {
    totalApprovedPhotos: approvedPhotos.length,
    totalMaterialRequests: matReqs.length,
    totalHoursWorked: Math.round((totalMinutes / 60) * 10) / 10,
    totalVisits,
    avgScoreStores: 0, // computed on client from store performance
    brandBreakdown,
  };
}

export interface WeeklyTrendPoint {
  weekLabel: string;
  approvedPhotos: number;
  materialRequests: number;
  hoursWorked: number;
}

export async function getPromoterWeeklyTrend(userId: number): Promise<WeeklyTrendPoint[]> {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();
  const result: WeeklyTrendPoint[] = [];

  for (let w = 3; w >= 0; w--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() - w * 7);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const [weekPhotos, weekMat, weekEntries] = await Promise.all([
      db.select().from(photos).where(and(eq(photos.userId, userId), eq(photos.status, "approved"), gte(photos.photoTimestamp, weekStart), lte(photos.photoTimestamp, weekEnd))),
      db.select().from(materialRequests).where(and(eq(materialRequests.userId, userId), gte(materialRequests.requestedAt, weekStart), lte(materialRequests.requestedAt, weekEnd))),
      db.select().from(timeEntries).where(and(eq(timeEntries.userId, userId), gte(timeEntries.entryTime, weekStart), lte(timeEntries.entryTime, weekEnd))),
    ]);

    const entryTs = weekEntries.filter((e) => e.entryType === "entry").map((e) => e.entryTime.getTime());
    const exitTs = weekEntries.filter((e) => e.entryType === "exit").map((e) => e.entryTime.getTime());
    let mins = 0;
    const p = Math.min(entryTs.length, exitTs.length);
    for (let i = 0; i < p; i++) {
      const d = (exitTs[i] - entryTs[i]) / 60000;
      if (d > 0 && d < 720) mins += d;
    }

    const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const weekLabel = w === 0 ? "Esta sem." : `${weekStart.getDate()}/${weekStart.getMonth() + 1}`;

    result.push({
      weekLabel,
      approvedPhotos: weekPhotos.length,
      materialRequests: weekMat.length,
      hoursWorked: Math.round((mins / 60) * 10) / 10,
    });
  }

  return result;
}

// ─── PROMOTER RANKING ────────────────────────────────────────────────────────

export interface PromoterRankingEntry {
  userId: number;
  userName: string;
  userEmail: string;
  totalApprovedPhotos: number;
  totalMaterialRequests: number;
  totalHoursWorked: number;
  totalVisits: number;
  avgQualityRating: number;
  geoAlertCount: number;
  score: number;
  rank: number;
}

export async function getPromoterRanking(
  year: number,
  month: number
): Promise<PromoterRankingEntry[]> {
  const db = await getDb();
  if (!db) return [];

  const { and, gte, lte, eq, count, avg, sum } = await import("drizzle-orm");

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  // Get all promoters
  const allPromoters = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .innerJoin(promoterProfiles, eq(promoterProfiles.userId, users.id));

  const results: PromoterRankingEntry[] = [];

  for (const promoter of allPromoters) {
    // Approved photos
    const photoRows = await db
      .select({ cnt: count() })
      .from(photos)
      .where(
        and(
          eq(photos.userId, promoter.id),
          eq(photos.status, "approved"),
          gte(photos.photoTimestamp, startDate),
          lte(photos.photoTimestamp, endDate)
        )
      );
    const totalApprovedPhotos = Number(photoRows[0]?.cnt ?? 0);

    // Avg quality rating of approved photos
    const qualityRows = await db
      .select({ avgQ: avg(photos.qualityRating) })
      .from(photos)
      .where(
        and(
          eq(photos.userId, promoter.id),
          eq(photos.status, "approved"),
          gte(photos.photoTimestamp, startDate),
          lte(photos.photoTimestamp, endDate)
        )
      );
    const avgQualityRating = Number(qualityRows[0]?.avgQ ?? 0);

    // Material requests
    const matRows = await db
      .select({ cnt: count() })
      .from(materialRequests)
      .where(
        and(
          eq(materialRequests.userId, promoter.id),
          gte(materialRequests.requestedAt, startDate),
          lte(materialRequests.requestedAt, endDate)
        )
      );
    const totalMaterialRequests = Number(matRows[0]?.cnt ?? 0);

    // Time entries — calculate hours worked
    const timeRows = await db
      .select({ entryType: timeEntries.entryType, entryTime: timeEntries.entryTime })
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.userId, promoter.id),
          gte(timeEntries.entryTime, startDate),
          lte(timeEntries.entryTime, endDate)
        )
      )
      .orderBy(timeEntries.entryTime);

    let totalHoursWorked = 0;
    let totalVisits = 0;
    let lastEntry: Date | null = null;
    for (const row of timeRows) {
      if (row.entryType === "entry") {
        lastEntry = new Date(row.entryTime);
        totalVisits++;
      } else if (row.entryType === "exit" && lastEntry) {
        const diffMs = new Date(row.entryTime).getTime() - lastEntry.getTime();
        totalHoursWorked += diffMs / (1000 * 60 * 60);
        lastEntry = null;
      }
    }
    totalHoursWorked = Math.round(totalHoursWorked * 10) / 10;

    // Geo alerts (negative factor)
    const alertRows = await db
      .select({ cnt: count() })
      .from(geoAlerts)
      .where(
        and(
          eq(geoAlerts.userId, promoter.id),
          gte(geoAlerts.createdAt, startDate),
          lte(geoAlerts.createdAt, endDate)
        )
      );
    const geoAlertCount = Number(alertRows[0]?.cnt ?? 0);

    // Score composto: fotos 30%, horas 25%, visitas 25%, materiais 10%, qualidade 10%, alertas -5%
    const maxPhotos = 50;
    const maxHours = 160;
    const maxVisits = 80;
    const maxMaterials = 20;
    const maxQuality = 5;

    const photoScore = Math.min(totalApprovedPhotos / maxPhotos, 1) * 30;
    const hoursScore = Math.min(totalHoursWorked / maxHours, 1) * 25;
    const visitsScore = Math.min(totalVisits / maxVisits, 1) * 25;
    const materialsScore = Math.min(totalMaterialRequests / maxMaterials, 1) * 10;
    const qualityScore = maxQuality > 0 ? (avgQualityRating / maxQuality) * 10 : 0;
    const alertPenalty = Math.min(geoAlertCount * 2, 10);

    const score = Math.max(
      0,
      Math.round(photoScore + hoursScore + visitsScore + materialsScore + qualityScore - alertPenalty)
    );

    results.push({
      userId: promoter.id,
      userName: (promoter.name ?? promoter.email) as string,
      userEmail: promoter.email as string,
      totalApprovedPhotos,
      totalMaterialRequests,
      totalHoursWorked,
      totalVisits,
      avgQualityRating: Math.round(avgQualityRating * 10) / 10,
      geoAlertCount,
      score,
      rank: 0,
    });
  }

  // Sort by score descending and assign ranks
  results.sort((a, b) => b.score - a.score);
  results.forEach((r, i) => (r.rank = i + 1));

  return results;
}

// ─── STORE VISIT HISTORY ─────────────────────────────────────────────────────

export interface StoreVisitEntry {
  visitDate: string;
  userId: number;
  userName: string;
  entryTime: Date;
  exitTime: Date | null;
  hoursWorked: number;
  photosCount: number;
  approvedPhotosCount: number;
  materialsCount: number;
  hasGeoAlert: boolean;
}

export async function getStoreVisitHistory(
  storeId: number,
  year: number,
  month: number
): Promise<StoreVisitEntry[]> {
  const db = await getDb();
  if (!db) return [];

  const { and, gte, lte, eq, count } = await import("drizzle-orm");

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  // Get all entries for this store in the period
  const entries = await db
    .select({
      id: timeEntries.id,
      userId: timeEntries.userId,
      entryType: timeEntries.entryType,
      entryTime: timeEntries.entryTime,
      userName: users.name,
      userEmail: users.email,
    })
    .from(timeEntries)
    .innerJoin(users, eq(users.id, timeEntries.userId))
    .where(
      and(
        eq(timeEntries.storeId, storeId),
        gte(timeEntries.entryTime, startDate),
        lte(timeEntries.entryTime, endDate)
      )
    )
    .orderBy(timeEntries.entryTime);

  // Group entries into visits (entry + exit pairs)
  const visitMap = new Map<string, StoreVisitEntry>();

  for (const row of entries) {
    const dateKey = `${row.userId}-${new Date(row.entryTime).toISOString().split("T")[0]}`;

    if (row.entryType === "entry") {
      visitMap.set(dateKey, {
        visitDate: new Date(row.entryTime).toISOString().split("T")[0],
        userId: row.userId,
        userName: (row.userName ?? row.userEmail) as string,
        entryTime: new Date(row.entryTime),
        exitTime: null,
        hoursWorked: 0,
        photosCount: 0,
        approvedPhotosCount: 0,
        materialsCount: 0,
        hasGeoAlert: false,
      });
    } else if (row.entryType === "exit") {
      const visit = visitMap.get(dateKey);
      if (visit) {
        visit.exitTime = new Date(row.entryTime);
        const diffMs = visit.exitTime.getTime() - visit.entryTime.getTime();
        visit.hoursWorked = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
      }
    }
  }

  const visits = Array.from(visitMap.values());

  // Enrich each visit with photos, materials and alerts
  for (const visit of visits) {
    const dayStart = new Date(visit.visitDate + "T00:00:00");
    const dayEnd = new Date(visit.visitDate + "T23:59:59");

    // Photos
    const photoRows = await db
      .select({ cnt: count(), status: photos.status })
      .from(photos)
      .where(
        and(
          eq(photos.userId, visit.userId),
          eq(photos.storeId, storeId),
          gte(photos.photoTimestamp, dayStart),
          lte(photos.photoTimestamp, dayEnd)
        )
      )
      .groupBy(photos.status);

    for (const row of photoRows) {
      visit.photosCount += Number(row.cnt);
      if (row.status === "approved") visit.approvedPhotosCount += Number(row.cnt);
    }

    // Materials
    const matRows = await db
      .select({ cnt: count() })
      .from(materialRequests)
      .where(
        and(
          eq(materialRequests.userId, visit.userId),
          eq(materialRequests.storeId, storeId),
          gte(materialRequests.requestedAt, dayStart),
          lte(materialRequests.requestedAt, dayEnd)
        )
      );
    visit.materialsCount = Number(matRows[0]?.cnt ?? 0);

    // Geo alerts
    const alertRows = await db
      .select({ cnt: count() })
      .from(geoAlerts)
      .where(
        and(
          eq(geoAlerts.userId, visit.userId),
          eq(geoAlerts.storeId, storeId),
          gte(geoAlerts.createdAt, dayStart),
          lte(geoAlerts.createdAt, dayEnd)
        )
      );
    visit.hasGeoAlert = Number(alertRows[0]?.cnt ?? 0) > 0;
  }

  // Sort by date descending
  visits.sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime());

  return visits;
}

// ─── PROMOTER DETAIL (para o Gestor) ─────────────────────────────────────────

export interface PromoterDetailStats {
  userId: number;
  userName: string;
  userEmail: string;
  score: number;
  rank: number;
  totalApprovedPhotos: number;
  totalRejectedPhotos: number;
  totalMaterialRequests: number;
  totalHoursWorked: number;
  totalVisits: number;
  avgQualityRating: number;
  geoAlertCount: number;
  brandBreakdown: { brandId: number; brandName: string; approvedPhotos: number; rejectedPhotos: number }[];
  storeBreakdown: { storeId: number; storeName: string; visits: number; hoursWorked: number; photos: number }[];
  monthlyTrend: { month: string; score: number; approvedPhotos: number; hoursWorked: number; visits: number }[];
}

export async function getPromoterDetail(
  promoterId: number,
  year: number,
  month: number
): Promise<PromoterDetailStats | null> {
  const db = await getDb();
  if (!db) return null;

  const { and, gte, lte, eq, count, avg } = await import("drizzle-orm");

  // Get promoter info
  const promoterRows = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, promoterId));
  if (!promoterRows.length) return null;
  const promoter = promoterRows[0];

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  // Approved photos
  const approvedRows = await db
    .select({ cnt: count() })
    .from(photos)
    .where(and(eq(photos.userId, promoterId), eq(photos.status, "approved"), gte(photos.photoTimestamp, startDate), lte(photos.photoTimestamp, endDate)));
  const totalApprovedPhotos = Number(approvedRows[0]?.cnt ?? 0);

  // Rejected photos
  const rejectedRows = await db
    .select({ cnt: count() })
    .from(photos)
    .where(and(eq(photos.userId, promoterId), eq(photos.status, "rejected"), gte(photos.photoTimestamp, startDate), lte(photos.photoTimestamp, endDate)));
  const totalRejectedPhotos = Number(rejectedRows[0]?.cnt ?? 0);

  // Avg quality
  const qualityRows = await db
    .select({ avgQ: avg(photos.qualityRating) })
    .from(photos)
    .where(and(eq(photos.userId, promoterId), eq(photos.status, "approved"), gte(photos.photoTimestamp, startDate), lte(photos.photoTimestamp, endDate)));
  const avgQualityRating = Math.round(Number(qualityRows[0]?.avgQ ?? 0) * 10) / 10;

  // Material requests
  const matRows = await db
    .select({ cnt: count() })
    .from(materialRequests)
    .where(and(eq(materialRequests.userId, promoterId), gte(materialRequests.requestedAt, startDate), lte(materialRequests.requestedAt, endDate)));
  const totalMaterialRequests = Number(matRows[0]?.cnt ?? 0);

  // Time entries
  const timeRows = await db
    .select({ entryType: timeEntries.entryType, entryTime: timeEntries.entryTime, storeId: timeEntries.storeId })
    .from(timeEntries)
    .where(and(eq(timeEntries.userId, promoterId), gte(timeEntries.entryTime, startDate), lte(timeEntries.entryTime, endDate)))
    .orderBy(timeEntries.entryTime);

  let totalHoursWorked = 0;
  let totalVisits = 0;
  let lastEntry: Date | null = null;
  let lastStoreId: number | null = null;
  const storeHours: Record<number, number> = {};
  const storeVisits: Record<number, number> = {};

  for (const row of timeRows) {
    if (row.entryType === "entry") {
      lastEntry = new Date(row.entryTime);
      lastStoreId = row.storeId;
      totalVisits++;
      if (row.storeId) storeVisits[row.storeId] = (storeVisits[row.storeId] ?? 0) + 1;
    } else if (row.entryType === "exit" && lastEntry) {
      const diffH = (new Date(row.entryTime).getTime() - lastEntry.getTime()) / (1000 * 60 * 60);
      if (diffH > 0 && diffH < 24) {
        totalHoursWorked += diffH;
        if (lastStoreId) storeHours[lastStoreId] = (storeHours[lastStoreId] ?? 0) + diffH;
      }
      lastEntry = null;
    }
  }
  totalHoursWorked = Math.round(totalHoursWorked * 10) / 10;

  // Geo alerts
  const alertRows = await db
    .select({ cnt: count() })
    .from(geoAlerts)
    .where(and(eq(geoAlerts.userId, promoterId), gte(geoAlerts.createdAt, startDate), lte(geoAlerts.createdAt, endDate)));
  const geoAlertCount = Number(alertRows[0]?.cnt ?? 0);

  // Score
  const photoScore = Math.min(totalApprovedPhotos / 50, 1) * 30;
  const hoursScore = Math.min(totalHoursWorked / 160, 1) * 25;
  const visitsScore = Math.min(totalVisits / 80, 1) * 25;
  const materialsScore = Math.min(totalMaterialRequests / 20, 1) * 10;
  const qualityScore = avgQualityRating > 0 ? (avgQualityRating / 5) * 10 : 0;
  const alertPenalty = Math.min(geoAlertCount * 2, 10);
  const score = Math.max(0, Math.round(photoScore + hoursScore + visitsScore + materialsScore + qualityScore - alertPenalty));

  // Get rank from full ranking
  const fullRanking = await getPromoterRanking(year, month);
  const rankEntry = fullRanking.find((r) => r.userId === promoterId);
  const rank = rankEntry?.rank ?? 0;

  // Brand breakdown
  const allBrands = await db.select().from(brands).where(eq(brands.status, "active"));
  const allPhotos = await db
    .select({ brandId: photos.brandId, status: photos.status })
    .from(photos)
    .where(and(eq(photos.userId, promoterId), gte(photos.photoTimestamp, startDate), lte(photos.photoTimestamp, endDate)));

  const brandBreakdown = allBrands
    .map((b) => ({
      brandId: b.id,
      brandName: b.name,
      approvedPhotos: allPhotos.filter((p) => p.brandId === b.id && p.status === "approved").length,
      rejectedPhotos: allPhotos.filter((p) => p.brandId === b.id && p.status === "rejected").length,
    }))
    .filter((b) => b.approvedPhotos > 0 || b.rejectedPhotos > 0);

  // Store breakdown
  const allStores = await db.select().from(stores);
  const storePhotos = await db
    .select({ storeId: photos.storeId, status: photos.status })
    .from(photos)
    .where(and(eq(photos.userId, promoterId), gte(photos.photoTimestamp, startDate), lte(photos.photoTimestamp, endDate)));

  const storeBreakdown = allStores
    .filter((s) => storeVisits[s.id] || storeHours[s.id])
    .map((s) => ({
      storeId: s.id,
      storeName: s.name,
      visits: storeVisits[s.id] ?? 0,
      hoursWorked: Math.round((storeHours[s.id] ?? 0) * 10) / 10,
      photos: storePhotos.filter((p) => p.storeId === s.id && p.status === "approved").length,
    }));

  // Monthly trend (last 6 months)
  const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const monthlyTrend: PromoterDetailStats["monthlyTrend"] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(year, month - 1 - i, 1);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    const mStart = new Date(y, m - 1, 1);
    const mEnd = new Date(y, m, 0, 23, 59, 59);

    const mPhotos = await db.select({ cnt: count() }).from(photos)
      .where(and(eq(photos.userId, promoterId), eq(photos.status, "approved"), gte(photos.photoTimestamp, mStart), lte(photos.photoTimestamp, mEnd)));
    const mMat = await db.select({ cnt: count() }).from(materialRequests)
      .where(and(eq(materialRequests.userId, promoterId), gte(materialRequests.requestedAt, mStart), lte(materialRequests.requestedAt, mEnd)));
    const mTime = await db.select({ entryType: timeEntries.entryType, entryTime: timeEntries.entryTime })
      .from(timeEntries).where(and(eq(timeEntries.userId, promoterId), gte(timeEntries.entryTime, mStart), lte(timeEntries.entryTime, mEnd))).orderBy(timeEntries.entryTime);

    let mHours = 0; let mVisits = 0; let mLast: Date | null = null;
    for (const r of mTime) {
      if (r.entryType === "entry") { mLast = new Date(r.entryTime); mVisits++; }
      else if (r.entryType === "exit" && mLast) { mHours += (new Date(r.entryTime).getTime() - mLast.getTime()) / (1000 * 60 * 60); mLast = null; }
    }
    mHours = Math.round(mHours * 10) / 10;

    const mApproved = Number(mPhotos[0]?.cnt ?? 0);
    const mMaterials = Number(mMat[0]?.cnt ?? 0);
    const mAlerts = 0;
    const mScore = Math.max(0, Math.round(
      Math.min(mApproved / 50, 1) * 30 +
      Math.min(mHours / 160, 1) * 25 +
      Math.min(mVisits / 80, 1) * 25 +
      Math.min(mMaterials / 20, 1) * 10 - mAlerts
    ));

    monthlyTrend.push({ month: `${MONTH_NAMES[m - 1]}/${y}`, score: mScore, approvedPhotos: mApproved, hoursWorked: mHours, visits: mVisits });
  }

  return {
    userId: promoter.id,
    userName: (promoter.name ?? promoter.email) as string,
    userEmail: promoter.email as string,
    score,
    rank,
    totalApprovedPhotos,
    totalRejectedPhotos,
    totalMaterialRequests,
    totalHoursWorked,
    totalVisits,
    avgQualityRating,
    geoAlertCount,
    brandBreakdown,
    storeBreakdown,
    monthlyTrend,
  };
}
