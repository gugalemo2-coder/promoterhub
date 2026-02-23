import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import * as push from "./notifications";
import { storagePut } from "./storage";

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    getProfile: protectedProcedure.query(async ({ ctx }) => {
      const profile = await db.getPromoterProfile(ctx.user.id);
      return { user: ctx.user, profile };
    }),
    setRole: protectedProcedure
      .input(z.object({ appRole: z.enum(["promoter", "manager"]) }))
      .mutation(async ({ ctx, input }) => {
        await db.upsertPromoterProfile({ userId: ctx.user.id, appRole: input.appRole });
        return { success: true };
      }),
  }),
  brands: router({
    list: publicProcedure.query(async () => {
      await db.seedBrands();
      return db.getBrands();
    }),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) => db.getBrandById(input.id)),
  }),
  stores: router({
    list: protectedProcedure.query(() => db.getStores()),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) => db.getStoreById(input.id)),
    create: protectedProcedure
      .input(z.object({ name: z.string().min(1).max(255), latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), address: z.string().optional(), city: z.string().optional(), state: z.string().max(2).optional(), zipCode: z.string().optional(), phone: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createStore({ ...input, latitude: input.latitude.toString(), longitude: input.longitude.toString(), managerId: ctx.user.id });
        return { id };
      }),
    findNearest: protectedProcedure
      .input(z.object({ latitude: z.number(), longitude: z.number() }))
      .query(async ({ input }) => {
        const allStores = await db.getStores();
        if (allStores.length === 0) return null;
        let nearest = allStores[0]; let minDist = Infinity;
        for (const store of allStores) {
          const dist = haversineDistance(input.latitude, input.longitude, parseFloat(store.latitude), parseFloat(store.longitude));
          if (dist < minDist) { minDist = dist; nearest = store; }
        }
        return { store: nearest, distanceKm: minDist };
      }),
  }),
  timeEntries: router({
    create: protectedProcedure
      .input(z.object({ storeId: z.number(), entryType: z.enum(["entry", "exit"]), latitude: z.number(), longitude: z.number(), accuracy: z.number().optional(), deviceId: z.string().optional(), notes: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const store = await db.getStoreById(input.storeId);
        if (!store) throw new Error("Store not found");
        const distanceKm = haversineDistance(input.latitude, input.longitude, parseFloat(store.latitude), parseFloat(store.longitude));
        const isWithinRadius = distanceKm <= 5;
        const id = await db.createTimeEntry({ userId: ctx.user.id, storeId: input.storeId, entryType: input.entryType, entryTime: new Date(), latitude: input.latitude.toString(), longitude: input.longitude.toString(), accuracy: input.accuracy?.toString(), distanceFromStore: distanceKm.toString(), isWithinRadius, deviceId: input.deviceId, notes: input.notes });
        if (!isWithinRadius) await db.createGeoAlert({ userId: ctx.user.id, storeId: input.storeId, timeEntryId: id, alertType: "left_radius", latitude: input.latitude.toString(), longitude: input.longitude.toString(), distanceFromStore: distanceKm.toString() });
        return { id, distanceKm, isWithinRadius };
      }),
    list: protectedProcedure.input(z.object({ startDate: z.string().optional(), endDate: z.string().optional() })).query(({ ctx, input }) => db.getTimeEntriesByUser(ctx.user.id, input.startDate ? new Date(input.startDate) : undefined, input.endDate ? new Date(input.endDate) : undefined)),
    dailySummary: protectedProcedure.input(z.object({ date: z.string().optional() })).query(({ ctx, input }) => db.getDailySummary(ctx.user.id, input.date ? new Date(input.date) : new Date())),
    lastOpenEntry: protectedProcedure.query(({ ctx }) => db.getLastOpenEntry(ctx.user.id)),
    allForDate: protectedProcedure.input(z.object({ date: z.string().optional() })).query(({ input }) => db.getAllTimeEntriesForDate(input.date ? new Date(input.date) : new Date())),
    forUser: protectedProcedure.input(z.object({ userId: z.number(), startDate: z.string().optional(), endDate: z.string().optional() })).query(({ input }) => db.getTimeEntriesByUser(input.userId, input.startDate ? new Date(input.startDate) : undefined, input.endDate ? new Date(input.endDate) : undefined)),
  }),
  photos: router({
    upload: protectedProcedure
      .input(z.object({ brandId: z.number(), storeId: z.number(), latitude: z.number().optional(), longitude: z.number().optional(), description: z.string().optional(), fileBase64: z.string(), fileType: z.string().default("image/jpeg"), fileName: z.string().default("photo.jpg") }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.fileBase64, "base64");
        const fileKey = `photos/${ctx.user.id}/${Date.now()}-${input.fileName}`;
        const { url } = await storagePut(fileKey, buffer, input.fileType);
        const id = await db.createPhoto({ userId: ctx.user.id, brandId: input.brandId, storeId: input.storeId, photoUrl: url, latitude: input.latitude?.toString(), longitude: input.longitude?.toString(), photoTimestamp: new Date(), fileSize: buffer.length, fileType: input.fileType, description: input.description });
        return { id, photoUrl: url };
      }),
    list: protectedProcedure.input(z.object({ brandId: z.number().optional(), storeId: z.number().optional(), startDate: z.string().optional(), endDate: z.string().optional(), status: z.enum(["pending", "approved", "rejected"]).optional(), limit: z.number().default(50), offset: z.number().default(0) })).query(({ ctx, input }) => db.getPhotos({ ...input, userId: ctx.user.id, startDate: input.startDate ? new Date(input.startDate) : undefined, endDate: input.endDate ? new Date(input.endDate) : undefined })),
    listAll: protectedProcedure.input(z.object({ brandId: z.number().optional(), storeId: z.number().optional(), userId: z.number().optional(), startDate: z.string().optional(), endDate: z.string().optional(), status: z.enum(["pending", "approved", "rejected"]).optional(), limit: z.number().default(50), offset: z.number().default(0) })).query(({ input }) => db.getPhotos({ ...input, startDate: input.startDate ? new Date(input.startDate) : undefined, endDate: input.endDate ? new Date(input.endDate) : undefined })),
    updateStatus: protectedProcedure.input(z.object({ id: z.number(), status: z.enum(["pending", "approved", "rejected"]), qualityRating: z.number().min(1).max(5).optional(), managerNotes: z.string().optional() })).mutation(({ input }) => db.updatePhoto(input.id, { status: input.status, qualityRating: input.qualityRating, managerNotes: input.managerNotes })),
  }),
  materials: router({
    list: protectedProcedure.input(z.object({ brandId: z.number().optional() })).query(({ input }) => db.getMaterials(input.brandId)),
    create: protectedProcedure.input(z.object({ brandId: z.number(), name: z.string().min(1).max(255), description: z.string().optional(), photoUrl: z.string().optional(), quantityAvailable: z.number().min(0).default(0), unit: z.enum(["unit", "box", "pack", "kg", "liter"]).default("unit") })).mutation(async ({ ctx, input }) => { const id = await db.createMaterial({ ...input, createdBy: ctx.user.id }); return { id }; }),
    update: protectedProcedure.input(z.object({ id: z.number(), quantityAvailable: z.number().min(0).optional(), status: z.enum(["active", "inactive", "discontinued"]).optional(), description: z.string().optional() })).mutation(({ input }) => db.updateMaterial(input.id, input)),
    uploadPhoto: protectedProcedure.input(z.object({ fileBase64: z.string(), fileType: z.string().default("image/jpeg"), fileName: z.string().default("material.jpg") })).mutation(async ({ input }) => { const buffer = Buffer.from(input.fileBase64, "base64"); const fileKey = `materials/${Date.now()}-${input.fileName}`; const { url } = await storagePut(fileKey, buffer, input.fileType); return { url }; }),
  }),
  materialRequests: router({
    create: protectedProcedure
      .input(z.object({ materialId: z.number(), storeId: z.number(), quantityRequested: z.number().min(1), priority: z.enum(["low", "medium", "high"]).default("medium"), notes: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createMaterialRequest({ ...input, userId: ctx.user.id });
        const material = await db.getMaterialById(input.materialId);
        if (material) {
          await db.updateMaterial(input.materialId, { quantityReserved: material.quantityReserved + input.quantityRequested });
          const promoterName = ctx.user.name ?? `Promotor ${ctx.user.id}`;
          push.notifyNewMaterialRequest(promoterName, material.name, input.quantityRequested).catch(() => {});
        }
        return { id };
      }),
    list: protectedProcedure.input(z.object({ status: z.enum(["pending", "approved", "rejected", "delivered", "cancelled"]).optional(), limit: z.number().default(50), offset: z.number().default(0) })).query(({ ctx, input }) => db.getMaterialRequests({ userId: ctx.user.id, ...input })),
    listAll: protectedProcedure.input(z.object({ status: z.enum(["pending", "approved", "rejected", "delivered", "cancelled"]).optional(), limit: z.number().default(50), offset: z.number().default(0) })).query(({ input }) => db.getMaterialRequests(input)),
    approve: protectedProcedure.input(z.object({ id: z.number(), notes: z.string().optional() })).mutation(async ({ ctx, input }) => {
      const request = await db.getMaterialRequestById(input.id);
      await db.updateMaterialRequest(input.id, { status: "approved", approvedBy: ctx.user.id, approvedAt: new Date(), notes: input.notes });
      if (request) {
        const material = await db.getMaterialById(request.materialId);
        if (material) push.notifyRequestApproved(request.userId, material.name, request.quantityRequested).catch(() => {});
      }
      return { success: true };
    }),
    reject: protectedProcedure.input(z.object({ id: z.number(), rejectionReason: z.string() })).mutation(async ({ input }) => {
      const request = await db.getMaterialRequestById(input.id);
      if (request) {
        const material = await db.getMaterialById(request.materialId);
        if (material) {
          await db.updateMaterial(request.materialId, { quantityReserved: Math.max(0, material.quantityReserved - request.quantityRequested) });
          push.notifyRequestRejected(request.userId, material.name, input.rejectionReason).catch(() => {});
        }
      }
      await db.updateMaterialRequest(input.id, { status: "rejected", rejectionReason: input.rejectionReason });
      return { success: true };
    }),
    deliver: protectedProcedure.input(z.object({ id: z.number(), notes: z.string().optional() })).mutation(async ({ ctx, input }) => {
      const request = await db.getMaterialRequestById(input.id);
      if (request) { const material = await db.getMaterialById(request.materialId); if (material) await db.updateMaterial(request.materialId, { quantityAvailable: Math.max(0, material.quantityAvailable - request.quantityRequested), quantityReserved: Math.max(0, material.quantityReserved - request.quantityRequested), quantityDelivered: material.quantityDelivered + request.quantityRequested }); }
      await db.updateMaterialRequest(input.id, { status: "delivered", deliveredBy: ctx.user.id, deliveredAt: new Date(), notes: input.notes });
      return { success: true };
    }),
  }),
  stockFiles: router({
    upload: protectedProcedure
      .input(z.object({ brandId: z.number(), description: z.string().optional(), fileBase64: z.string(), fileType: z.string().default("application/pdf"), fileName: z.string(), visibility: z.enum(["all_promoters", "specific_stores", "specific_users"]).default("all_promoters") }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.fileBase64, "base64");
        const fileKey = `stock-files/${input.brandId}/${Date.now()}-${input.fileName}`;
        const { url } = await storagePut(fileKey, buffer, input.fileType);
        const id = await db.createStockFile({ brandId: input.brandId, fileUrl: url, fileName: input.fileName, fileType: input.fileType, fileSize: buffer.length, description: input.description, uploadedBy: ctx.user.id, visibility: input.visibility });
        return { id, fileUrl: url };
      }),
    list: protectedProcedure.input(z.object({ brandId: z.number().optional() })).query(({ input }) => db.getStockFiles(input.brandId)),
  }),
  geoAlerts: router({
    list: protectedProcedure.input(z.object({ acknowledged: z.boolean().optional(), limit: z.number().default(50) })).query(({ input }) => db.getGeoAlerts(input)),
    acknowledge: protectedProcedure.input(z.object({ id: z.number(), notes: z.string().optional() })).mutation(({ ctx, input }) => db.acknowledgeGeoAlert(input.id, ctx.user.id, input.notes)),
    createAlert: protectedProcedure.input(z.object({ storeId: z.number(), alertType: z.enum(["left_radius", "suspicious_movement", "gps_spoofing_suspected", "low_hours", "no_entry"]), latitude: z.number().optional(), longitude: z.number().optional(), distanceFromStore: z.number().optional(), notes: z.string().optional() })).mutation(async ({ ctx, input }) => {
      const id = await db.createGeoAlert({ userId: ctx.user.id, storeId: input.storeId, alertType: input.alertType, latitude: input.latitude?.toString(), longitude: input.longitude?.toString(), distanceFromStore: input.distanceFromStore?.toString(), notes: input.notes });
      if (input.alertType === "left_radius") {
        const store = await db.getStoreById(input.storeId);
        const promoterName = ctx.user.name ?? `Promotor ${ctx.user.id}`;
        push.notifyPromoterLeftRadius(promoterName, store?.name ?? `Loja ${input.storeId}`).catch(() => {});
      }
      return { id };
    }),
  }),
  pushTokens: router({
    register: protectedProcedure
      .input(z.object({ token: z.string().min(1), platform: z.enum(["ios", "android", "web"]), deviceId: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        await db.upsertPushToken({ userId: ctx.user.id, token: input.token, platform: input.platform, deviceId: input.deviceId });
        return { success: true };
      }),
  }),
  reports: router({
    daily: protectedProcedure.input(z.object({ date: z.string().optional() })).query(({ input }) => db.getDailyReport(input.date ? new Date(input.date) : new Date())),
    promoterSummary: protectedProcedure.input(z.object({ userId: z.number().optional(), date: z.string().optional() })).query(async ({ ctx, input }) => db.getDailySummary(input.userId ?? ctx.user.id, input.date ? new Date(input.date) : new Date())),
    allPromoters: protectedProcedure.query(() => db.getAllPromoterUsers()),
    monthly: protectedProcedure
      .input(z.object({ year: z.number().int().min(2020).max(2100), month: z.number().int().min(1).max(12), userId: z.number().optional() }))
      .query(({ input }) => db.getMonthlyReport(input.year, input.month, input.userId)),
  }),
});

export type AppRouter = typeof appRouter;
