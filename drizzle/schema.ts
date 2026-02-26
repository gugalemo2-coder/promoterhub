import {
  boolean,
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── PROMOTER PROFILES ────────────────────────────────────────────────────────
export const promoterProfiles = mysqlTable("promoter_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  phone: varchar("phone", { length: 20 }),
  cpf: varchar("cpf", { length: 11 }),
  appRole: mysqlEnum("appRole", ["promoter", "manager"]).default("promoter").notNull(),
  storeId: int("storeId"),
  status: mysqlEnum("status", ["active", "inactive", "suspended"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PromoterProfile = typeof promoterProfiles.$inferSelect;
export type InsertPromoterProfile = typeof promoterProfiles.$inferInsert;

// ─── STORES ───────────────────────────────────────────────────────────────────
export const stores = mysqlTable("stores", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  address: varchar("address", { length: 500 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  zipCode: varchar("zipCode", { length: 10 }),
  phone: varchar("phone", { length: 20 }),
  managerId: int("managerId"),
  promoterId: int("promoterId"),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Store = typeof stores.$inferSelect;
export type InsertStore = typeof stores.$inferInsert;

// ─── BRANDS ───────────────────────────────────────────────────────────────────
export const brands = mysqlTable("brands", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  logoUrl: varchar("logoUrl", { length: 500 }),
  colorHex: varchar("colorHex", { length: 7 }),
  iconName: varchar("iconName", { length: 100 }),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Brand = typeof brands.$inferSelect;
export type InsertBrand = typeof brands.$inferInsert;

// ─── TIME ENTRIES ─────────────────────────────────────────────────────────────
export const timeEntries = mysqlTable("time_entries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  storeId: int("storeId").notNull(),
  entryType: mysqlEnum("entryType", ["entry", "exit"]).notNull(),
  entryTime: timestamp("entryTime").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  accuracy: decimal("accuracy", { precision: 5, scale: 2 }),
  distanceFromStore: decimal("distanceFromStore", { precision: 7, scale: 2 }),
  isWithinRadius: boolean("isWithinRadius").default(true).notNull(),
  deviceId: varchar("deviceId", { length: 255 }),
  ipAddress: varchar("ipAddress", { length: 45 }),
  photoUrl: varchar("photoUrl", { length: 500 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TimeEntry = typeof timeEntries.$inferSelect;
export type InsertTimeEntry = typeof timeEntries.$inferInsert;

// ─── PHOTOS ───────────────────────────────────────────────────────────────────
export const photos = mysqlTable("photos", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  brandId: int("brandId").notNull(),
  storeId: int("storeId").notNull(),
  photoUrl: varchar("photoUrl", { length: 500 }).notNull(),
  thumbnailUrl: varchar("thumbnailUrl", { length: 500 }),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  photoTimestamp: timestamp("photoTimestamp").notNull(),
  fileSize: int("fileSize"),
  fileType: varchar("fileType", { length: 50 }),
  description: text("description"),
  qualityRating: int("qualityRating"),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  managerNotes: text("managerNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Photo = typeof photos.$inferSelect;
export type InsertPhoto = typeof photos.$inferInsert;

// ─── MATERIALS ────────────────────────────────────────────────────────────────
export const materials = mysqlTable("materials", {
  id: int("id").autoincrement().primaryKey(),
  brandId: int("brandId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  photoUrl: varchar("photoUrl", { length: 500 }),
  quantityAvailable: int("quantityAvailable").default(0).notNull(),
  quantityReserved: int("quantityReserved").default(0).notNull(),
  quantityDelivered: int("quantityDelivered").default(0).notNull(),
  unit: mysqlEnum("unit", ["unit", "box", "pack", "kg", "liter"]).default("unit").notNull(),
  status: mysqlEnum("status", ["active", "inactive", "discontinued"]).default("active").notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Material = typeof materials.$inferSelect;
export type InsertMaterial = typeof materials.$inferInsert;

// ─── MATERIAL REQUESTS ────────────────────────────────────────────────────────
export const materialRequests = mysqlTable("material_requests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  materialId: int("materialId").notNull(),
  storeId: int("storeId").notNull(),
  quantityRequested: int("quantityRequested").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "delivered", "cancelled"])
    .default("pending")
    .notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high"]).default("medium").notNull(),
  notes: text("notes"),
  requestedAt: timestamp("requestedAt").defaultNow().notNull(),
  approvedAt: timestamp("approvedAt"),
  approvedBy: int("approvedBy"),
  deliveredAt: timestamp("deliveredAt"),
  deliveredBy: int("deliveredBy"),
  rejectionReason: text("rejectionReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MaterialRequest = typeof materialRequests.$inferSelect;
export type InsertMaterialRequest = typeof materialRequests.$inferInsert;

// ─── STOCK FILES ──────────────────────────────────────────────────────────────
export const stockFiles = mysqlTable("stock_files", {
  id: int("id").autoincrement().primaryKey(),
  brandId: int("brandId").notNull(),
  fileUrl: varchar("fileUrl", { length: 500 }).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileType: varchar("fileType", { length: 50 }),
  fileSize: int("fileSize"),
  description: text("description"),
  uploadedBy: int("uploadedBy").notNull(),
  visibility: mysqlEnum("visibility", ["all_promoters", "specific_stores", "specific_users"])
    .default("all_promoters")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StockFile = typeof stockFiles.$inferSelect;
export type InsertStockFile = typeof stockFiles.$inferInsert;

// ─── GEO ALERTS ───────────────────────────────────────────────────────────────
export const geoAlerts = mysqlTable("geo_alerts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  storeId: int("storeId").notNull(),
  timeEntryId: int("timeEntryId"),
  alertType: mysqlEnum("alertType", [
    "left_radius",
    "suspicious_movement",
    "gps_spoofing_suspected",
    "low_hours",
    "no_entry",
  ]).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  distanceFromStore: decimal("distanceFromStore", { precision: 7, scale: 2 }),
  alertTimestamp: timestamp("alertTimestamp").defaultNow().notNull(),
  acknowledged: boolean("acknowledged").default(false).notNull(),
  acknowledgedBy: int("acknowledgedBy"),
  acknowledgedAt: timestamp("acknowledgedAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GeoAlert = typeof geoAlerts.$inferSelect;
export type InsertGeoAlert = typeof geoAlerts.$inferInsert;

// ─── PUSH TOKENS ──────────────────────────────────────────────────────────────
export const pushTokens = mysqlTable("push_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  token: varchar("token", { length: 500 }).notNull(),
  platform: mysqlEnum("platform", ["ios", "android", "web"]).notNull(),
  deviceId: varchar("deviceId", { length: 255 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PushToken = typeof pushTokens.$inferSelect;
export type InsertPushToken = typeof pushTokens.$inferInsert;

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  type: mysqlEnum("type", [
    "geo_alert",
    "material_request",
    "material_approved",
    "material_rejected",
    "new_file",
    "photo_approved",
    "photo_rejected",
    "system",
  ]).notNull(),
  relatedId: int("relatedId"),
  relatedType: varchar("relatedType", { length: 50 }),
  isRead: boolean("isRead").default(false).notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ─── SIGNED REPORTS ───────────────────────────────────────────────────────────
export const signedReports = mysqlTable("signed_reports", {
  id: int("id").autoincrement().primaryKey(),
  reportId: varchar("reportId", { length: 64 }).notNull().unique(),
  managerId: int("managerId").notNull(),
  promoterId: int("promoterId"),
  month: int("month").notNull(),
  year: int("year").notNull(),
  signatureData: text("signatureData").notNull(),
  signedAt: timestamp("signedAt").defaultNow().notNull(),
  reportHash: varchar("reportHash", { length: 128 }).notNull(),
  pdfUrl: varchar("pdfUrl", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SignedReport = typeof signedReports.$inferSelect;
export type InsertSignedReport = typeof signedReports.$inferInsert;

// ─── APP SETTINGS ─────────────────────────────────────────────────────────────
export const appSettings = mysqlTable("app_settings", {
  id: int("id").autoincrement().primaryKey(),
  managerId: int("managerId").notNull().unique(),
  // Geofencing
  geoRadiusKm: decimal("geoRadiusKm", { precision: 5, scale: 2 }).default("0.50").notNull(),
  // Score weights (must sum to 100)
  weightPhotos: int("weightPhotos").default(30).notNull(),
  weightHours: int("weightHours").default(25).notNull(),
  weightVisits: int("weightVisits").default(25).notNull(),
  weightMaterials: int("weightMaterials").default(10).notNull(),
  weightQuality: int("weightQuality").default(10).notNull(),
  // Weight for daily average hours (0 = disabled)
  weightDailyAvg: int("weightDailyAvg").default(0).notNull(),
  // Notification toggles
  notifyGeoAlert: boolean("notifyGeoAlert").default(true).notNull(),
  notifyLowHours: boolean("notifyLowHours").default(true).notNull(),
  notifyMaterialRequest: boolean("notifyMaterialRequest").default(true).notNull(),
  notifyPhotoRejected: boolean("notifyPhotoRejected").default(true).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AppSettings = typeof appSettings.$inferSelect;
export type InsertAppSettings = typeof appSettings.$inferInsert;

// ─── APP USERS (custom auth — login/password) ─────────────────────────────────────────────
export const appUsers = mysqlTable("app_users", {
  id: int("id").autoincrement().primaryKey(),
  /** Display name entered during registration */
  name: varchar("name", { length: 128 }).notNull(),
  /** Login = name lowercased, spaces removed, accents stripped */
  login: varchar("login", { length: 128 }).notNull().unique(),
  /** bcrypt hash of the password */
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  /** App role: promoter (default), manager, master */
  appRole: mysqlEnum("appRole", ["promoter", "manager", "master"]).default("promoter").notNull(),
  /** URL da foto de perfil (armazenada no S3) */
  avatarUrl: varchar("avatarUrl", { length: 500 }),
  /** Whether the account is active */
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AppUser = typeof appUsers.$inferSelect;
export type InsertAppUser = typeof appUsers.$inferInsert;
