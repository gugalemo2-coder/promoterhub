import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  brands,
  geoAlerts,
  materialRequests,
  materials,
  photos,
  promoterProfiles,
  stockFiles,
  stores,
  timeEntries,
  users,
  type Brand,
  type GeoAlert,
  type InsertGeoAlert,
  type InsertMaterial,
  type InsertMaterialRequest,
  type InsertPhoto,
  type InsertPromoterProfile,
  type InsertStockFile,
  type InsertStore,
  type InsertTimeEntry,
  type InsertUser,
  type Material,
  type MaterialRequest,
  type Photo,
  type PromoterProfile,
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
