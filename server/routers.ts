import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import * as push from "./notifications";
import { storagePut } from "./storage";

// haversineDistance removed — geolocation no longer used

/** Extract the app_users.id from the JWT openId (format: "app_user_<id>") or fall back to ctx.user.id */
function getAppUserId(user: { id: number; openId: string }): number {
  const match = user.openId.match(/^app_user_(\d+)$/);
  return match ? parseInt(match[1]) : user.id;
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
    listForPromoter: protectedProcedure.query(({ ctx }) => db.getStoresByPromoter(getAppUserId(ctx.user))),
    listForPromoterById: protectedProcedure.input(z.object({ promoterId: z.number() })).query(({ input }) => db.getStoresByPromoter(input.promoterId)),
    listPromoterUsers: protectedProcedure.query(() => db.getAllPromoterUsersWithProfile()),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) => db.getStoreById(input.id)),
    create: protectedProcedure
      .input(z.object({ name: z.string().min(1).max(255), address: z.string().optional(), city: z.string().optional(), state: z.string().max(2).optional(), zipCode: z.string().optional(), phone: z.string().optional(), promoterId: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createStore({ ...input, latitude: "0", longitude: "0", managerId: ctx.user.id });
        return { id };
      }),
    update: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string().min(1).max(255).optional(), promoterId: z.number().nullable().optional(), address: z.string().optional(), city: z.string().optional(), state: z.string().max(2).optional(), phone: z.string().optional(), status: z.enum(["active", "inactive"]).optional() }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateStore(id, data as any);
        return { success: true };
      }),
    // findNearest removed — geolocation no longer used
  }),
  timeEntries: router({
    create: protectedProcedure
      .input(z.object({ storeId: z.number(), entryType: z.enum(["entry", "exit"]), latitude: z.number().optional(), longitude: z.number().optional(), deviceId: z.string().optional(), notes: z.string().optional(), photoBase64: z.string().optional(), photoFileType: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const store = await db.getStoreById(input.storeId);
        if (!store) throw new Error("Store not found");
        let photoUrl: string | undefined;
        if (input.photoBase64) {
          const buffer = Buffer.from(input.photoBase64, "base64");
          const fileKey = `timeentries/${getAppUserId(ctx.user)}/${Date.now()}.jpg`;
          const { url } = await storagePut(fileKey, buffer, input.photoFileType ?? "image/jpeg");
          photoUrl = url;
        }
        const id = await db.createTimeEntry({ userId: getAppUserId(ctx.user), storeId: input.storeId, entryType: input.entryType, entryTime: new Date(), latitude: "0", longitude: "0", distanceFromStore: "0", isWithinRadius: true, deviceId: input.deviceId, notes: input.notes, photoUrl });
        // Notifica gestores sobre o registro de ponto
        Promise.all([
          db.getAppUserById(getAppUserId(ctx.user)),
          db.getStoreById(input.storeId),
        ]).then(([promoter, store]) => {
          const promoterName = promoter?.name ?? ctx.user.name ?? "Promotor";
          const storeName = store?.name ?? `Loja ${input.storeId}`;
          const time = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
          push.notifyClockEntry(promoterName, input.entryType, storeName, time).catch(() => {});
        }).catch(() => {});
        return { id, photoUrl };
      }),
    list: protectedProcedure.input(z.object({ startDate: z.string().optional(), endDate: z.string().optional() })).query(({ ctx, input }) => db.getTimeEntriesByUser(getAppUserId(ctx.user), input.startDate ? new Date(input.startDate) : undefined, input.endDate ? new Date(input.endDate) : undefined)),
    dailySummary: protectedProcedure.input(z.object({ date: z.string().optional(), startDate: z.string().optional(), endDate: z.string().optional() })).query(async ({ ctx, input }) => {
      const userId = getAppUserId(ctx.user);
      // FIX: se o cliente mandar startDate+endDate já no fuso local, usa direto (sem setHours no servidor)
      if (input.startDate && input.endDate) {
        return db.getDailySummaryRange(userId, new Date(input.startDate), new Date(input.endDate));
      }
      return db.getDailySummary(userId, input.date ? new Date(input.date) : new Date());
    }),
    lastOpenEntry: protectedProcedure
      .input(z.object({ dayStart: z.string().optional() }))
      .query(({ ctx, input }) => db.getLastOpenEntry(getAppUserId(ctx.user), input.dayStart)),
    allForDate: protectedProcedure.input(z.object({ date: z.string().optional() })).query(({ input }) => db.getAllTimeEntriesForDate(input.date ? new Date(input.date) : new Date())),
    allForRange: protectedProcedure.input(z.object({ startDate: z.string(), endDate: z.string() })).query(({ input }) => db.getAllTimeEntriesForRange(new Date(input.startDate), new Date(input.endDate))),
    forUser: protectedProcedure.input(z.object({ userId: z.number(), startDate: z.string().optional(), endDate: z.string().optional() })).query(({ input }) => db.getTimeEntriesByUser(input.userId, input.startDate ? new Date(input.startDate) : undefined, input.endDate ? new Date(input.endDate) : undefined)),
    audit: protectedProcedure.input(z.object({ promoterId: z.number().optional(), storeId: z.number().optional(), entryType: z.enum(["entry", "exit"]).optional(), startDate: z.string(), endDate: z.string() })).query(({ input }) => db.getTimeEntriesAudit({ promoterId: input.promoterId, storeId: input.storeId, entryType: input.entryType, startDate: new Date(input.startDate), endDate: new Date(input.endDate) })),
    storeTimeStats: protectedProcedure.input(z.object({ promoterId: z.number(), startDate: z.string(), endDate: z.string() })).query(({ input }) => db.getPromoterStoreTimeStats(input.promoterId, new Date(input.startDate), new Date(input.endDate))),
  }),
  photos: router({
    upload: protectedProcedure
      .input(z.object({ brandId: z.number(), storeId: z.number(), description: z.string().optional(), fileBase64: z.string(), fileType: z.string().default("image/jpeg"), fileName: z.string().default("photo.jpg") }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.fileBase64, "base64");
        const fileKey = `photos/${getAppUserId(ctx.user)}/${Date.now()}-${input.fileName}`;
        const { url } = await storagePut(fileKey, buffer, input.fileType);
        const id = await db.createPhoto({ userId: getAppUserId(ctx.user), brandId: input.brandId, storeId: input.storeId, photoUrl: url, photoTimestamp: new Date(), fileSize: buffer.length, fileType: input.fileType, description: input.description });
        Promise.all([
          db.getUserById(getAppUserId(ctx.user)),
          db.getBrandById(input.brandId),
          db.getManagerAndMasterUserIds(),
        ]).then(([promoter, brand, managerIds]) => {
          const promoterName = promoter?.name ?? promoter?.email ?? "Promotor";
          const brandName = brand?.name ?? "Marca";
          push.notifyNewPhotoForReview(promoterName, brandName, managerIds).catch(() => {});
        }).catch(() => {});
        return { id, photoUrl: url };
      }),
    list: protectedProcedure.input(z.object({ brandId: z.number().optional(), storeId: z.number().optional(), startDate: z.string().optional(), endDate: z.string().optional(), status: z.enum(["pending", "approved", "rejected"]).optional(), limit: z.number().default(50), offset: z.number().default(0) })).query(({ ctx, input }) => db.getPhotos({ ...input, userId: getAppUserId(ctx.user), startDate: input.startDate ? new Date(input.startDate) : undefined, endDate: input.endDate ? new Date(input.endDate) : undefined })),
    listAll: protectedProcedure.input(z.object({ brandId: z.number().optional(), storeId: z.number().optional(), userId: z.number().optional(), startDate: z.string().optional(), endDate: z.string().optional(), status: z.enum(["pending", "approved", "rejected"]).optional(), limit: z.number().default(50), offset: z.number().default(0) })).query(({ input }) => db.getPhotos({ ...input, startDate: input.startDate ? new Date(input.startDate) : undefined, endDate: input.endDate ? new Date(input.endDate) : undefined })),
    updateStatus: protectedProcedure.input(z.object({ id: z.number(), status: z.enum(["pending", "approved", "rejected"]), qualityRating: z.number().min(1).max(5).optional(), managerNotes: z.string().optional() })).mutation(async ({ input }) => {
      await db.updatePhoto(input.id, { status: input.status, qualityRating: input.qualityRating, managerNotes: input.managerNotes });
      // Notifica o promotor sobre aprovação ou rejeição
      if (input.status === "approved" || input.status === "rejected") {
        try {
          const photoList = await db.getPhotos({ limit: 500 });
          const photo = photoList.find((p) => p.id === input.id);
          if (photo) {
            const brand = await db.getBrandById(photo.brandId);
            const brandName = brand?.name ?? "Marca";
            if (input.status === "approved") {
              push.notifyPhotoApproved(photo.userId, brandName, input.managerNotes).catch(() => {});
            } else {
              push.notifyPhotoRejected(photo.userId, brandName, input.managerNotes).catch(() => {});
            }
          }
        } catch {}
      }
    }),
    updateStatusBatch: protectedProcedure.input(z.object({ ids: z.array(z.number()), status: z.enum(["pending", "approved", "rejected"]), managerNotes: z.string().optional() })).mutation(async ({ input }) => {
      await Promise.all(input.ids.map((id) => db.updatePhoto(id, { status: input.status, managerNotes: input.managerNotes })));
      // Notifica cada promotor das fotos aprovadas/rejeitadas em lote
      if (input.status === "approved" || input.status === "rejected") {
        try {
          const photoList = await db.getPhotos({ limit: 500 });
          for (const id of input.ids) {
            const photo = photoList.find((p) => p.id === id);
            if (photo) {
              const brand = await db.getBrandById(photo.brandId);
              const brandName = brand?.name ?? "Marca";
              if (input.status === "approved") {
                push.notifyPhotoApproved(photo.userId, brandName, input.managerNotes).catch(() => {});
              } else {
                push.notifyPhotoRejected(photo.userId, brandName, input.managerNotes).catch(() => {});
              }
            }
          }
        } catch {}
      }
      return { success: true, count: input.ids.length };
    }),
    listAllWithDetails: protectedProcedure.input(z.object({ brandId: z.number().optional(), storeId: z.number().optional(), userId: z.number().optional(), startDate: z.string().optional(), endDate: z.string().optional(), status: z.enum(["pending", "approved", "rejected"]).optional(), limit: z.number().default(100), offset: z.number().default(0) })).query(({ input }) => db.getPhotosWithDetails({ ...input, startDate: input.startDate ? new Date(input.startDate) : undefined, endDate: input.endDate ? new Date(input.endDate) : undefined })),
    countPending: protectedProcedure.query(() => db.countPendingPhotos()),

    // ── Comentários de fotos ───────────────────────────────────────────────────
    // Busca comentários de uma foto (visível para gestor e para o promotor dono da foto)
    listComments: protectedProcedure
      .input(z.object({ photoId: z.number().int().positive() }))
      .query(({ input }) => db.getPhotoComments(input.photoId)),

    // Adiciona um comentário em uma foto (apenas gestor/master)
    addComment: protectedProcedure
      .input(z.object({
        photoId: z.number().int().positive(),
        comment: z.string().min(1).max(1000),
      }))
      .mutation(async ({ ctx, input }) => {
        const appUserId = getAppUserId(ctx.user);
        const appUser = await db.getAppUserById(appUserId);
        if (!appUser || appUser.appRole === "promoter") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas gestores e masters podem comentar." });
        }
        const id = await db.createPhotoComment({
          photoId: input.photoId,
          userId: appUserId,
          userName: appUser.name ?? ctx.user.name ?? "Gestor",
          comment: input.comment,
        });
        // Notifica o promotor dono da foto
        try {
          const photoList = await db.getPhotos({ limit: 200 });
          const photo = photoList.find((p) => p.id === input.photoId);
          if (photo) {
            push.notifyNewPhotoForReview(
              appUser.name ?? "Gestor",
              "Novo comentário na sua foto",
              [photo.userId]
            ).catch(() => {});
          }
        } catch {}
        return { id };
      }),

    // Remove um comentário (apenas gestor/master)
    deleteComment: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const appUserId = getAppUserId(ctx.user);
        const appUser = await db.getAppUserById(appUserId);
        if (!appUser || appUser.appRole === "promoter") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas gestores e masters podem excluir comentários." });
        }
        await db.deletePhotoComment(input.id);
        return { success: true };
      }),
  }),
  materials: router({
    list: protectedProcedure.input(z.object({ brandId: z.number().optional() })).query(({ input }) => db.getMaterials(input.brandId)),
    create: protectedProcedure.input(z.object({ brandId: z.number(), name: z.string().min(1).max(255), description: z.string().optional(), photoUrl: z.string().optional(), quantityAvailable: z.number().min(0).default(0), unit: z.enum(["unit", "box", "pack", "kg", "liter"]).default("unit") })).mutation(async ({ ctx, input }) => { const id = await db.createMaterial({ ...input, createdBy: ctx.user.id }); return { id }; }),
    update: protectedProcedure.input(z.object({ id: z.number(), name: z.string().min(1).max(255).optional(), quantityAvailable: z.number().min(0).optional(), status: z.enum(["active", "inactive", "discontinued"]).optional(), description: z.string().optional(), photoUrl: z.string().nullable().optional() })).mutation(({ input }) => db.updateMaterial(input.id, input)),
    uploadPhoto: protectedProcedure.input(z.object({ fileBase64: z.string(), fileType: z.string().default("image/jpeg"), fileName: z.string().default("material.jpg") })).mutation(async ({ input }) => { const buffer = Buffer.from(input.fileBase64, "base64"); const fileKey = `materials/${Date.now()}-${input.fileName}`; const { url } = await storagePut(fileKey, buffer, input.fileType); return { url }; }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.updateMaterial(input.id, { status: "discontinued" });
        return { success: true };
      }),
  }),
  materialRequests: router({
    create: protectedProcedure
      .input(z.object({ materialId: z.number(), storeId: z.number(), quantityRequested: z.number().min(1), priority: z.enum(["low", "medium", "high"]).default("medium"), notes: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createMaterialRequest({ ...input, userId: getAppUserId(ctx.user) });
        const material = await db.getMaterialById(input.materialId);
        if (material) {
          await db.updateMaterial(input.materialId, { quantityReserved: material.quantityReserved + input.quantityRequested });
          const promoterName = ctx.user.name ?? `Promotor ${ctx.user.id}`;
          push.notifyNewMaterialRequest(promoterName, material.name, input.quantityRequested).catch(() => {});
        }
        return { id };
      }),
    list: protectedProcedure.input(z.object({ status: z.enum(["pending", "approved", "rejected", "delivered", "cancelled"]).optional(), limit: z.number().default(50), offset: z.number().default(0) })).query(({ ctx, input }) => db.getMaterialRequests({ userId: getAppUserId(ctx.user), ...input })),
    listAll: protectedProcedure.input(z.object({ status: z.enum(["pending", "approved", "rejected", "delivered", "cancelled"]).optional(), brandId: z.number().optional(), limit: z.number().default(50), offset: z.number().default(0) })).query(({ input }) => db.getMaterialRequests(input)),
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
    countPending: protectedProcedure.query(() => db.countPendingMaterialRequests()),
  }),
  stockFiles: router({
    upload: protectedProcedure
      .input(z.object({ brandId: z.number(), description: z.string().optional(), fileBase64: z.string(), fileType: z.string().default("application/pdf"), fileName: z.string(), visibility: z.enum(["all_promoters", "specific_stores", "specific_users"]).default("all_promoters") }))
      .mutation(async ({ ctx, input }) => {
        const appUserId = getAppUserId(ctx.user);
        const appUser = await db.getAppUserById(appUserId);
        if (!appUser || appUser.appRole === "promoter") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas gestores e masters podem enviar arquivos." });
        }
        const buffer = Buffer.from(input.fileBase64, "base64");
        const fileKey = `stock-files/${input.brandId}/${Date.now()}-${input.fileName}`;
        const { url } = await storagePut(fileKey, buffer, input.fileType);
        const id = await db.createStockFile({ brandId: input.brandId, fileUrl: url, fileName: input.fileName, fileType: input.fileType, fileSize: buffer.length, description: input.description, uploadedBy: appUserId, visibility: input.visibility });
        try {
          const brand = await db.getBrandById(input.brandId);
          const promoterIds = await db.getAllPromoterUserIds();
          if (promoterIds.length > 0) {
            push.notifyNewFileAvailable(promoterIds, brand?.name ?? "Marca", input.fileName).catch(() => {});
          }
        } catch (_) {}
        return { id, fileUrl: url };
      }),
    list: protectedProcedure.input(z.object({ brandId: z.number().optional() })).query(({ input }) => db.getStockFiles(input.brandId)),
    markRead: protectedProcedure
      .input(z.object({ fileId: z.number().int().positive() }))
      .mutation(({ ctx, input }) => db.markFileRead(getAppUserId(ctx.user), input.fileId)),
    getReadStatus: protectedProcedure
      .input(z.object({ fileId: z.number().int().positive() }))
      .query(({ ctx, input }) => db.hasUserReadFile(getAppUserId(ctx.user), input.fileId)),
    listReadStatus: protectedProcedure
      .input(z.object({ fileId: z.number().int().positive() }))
      .query(({ input }) => db.getFileReadStatus(input.fileId)),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const appUserId = getAppUserId(ctx.user);
        const appUser = await db.getAppUserById(appUserId);
        if (!appUser || appUser.appRole === "promoter") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas gestores e masters podem excluir arquivos." });
        }
        await db.deleteStockFile(input.id);
        return { success: true };
      }),
  }),
  geoAlerts: router({
    list: protectedProcedure.input(z.object({ acknowledged: z.boolean().optional(), limit: z.number().default(50) })).query(({ input }) => db.getGeoAlerts(input)),
    acknowledge: protectedProcedure.input(z.object({ id: z.number(), notes: z.string().optional() })).mutation(({ ctx, input }) => db.acknowledgeGeoAlert(input.id, getAppUserId(ctx.user), input.notes)),
    createAlert: protectedProcedure.input(z.object({ storeId: z.number(), alertType: z.enum(["left_radius", "suspicious_movement", "gps_spoofing_suspected", "low_hours", "no_entry"]), latitude: z.number().optional(), longitude: z.number().optional(), distanceFromStore: z.number().optional(), notes: z.string().optional() })).mutation(async ({ ctx, input }) => {
      const id = await db.createGeoAlert({ userId: getAppUserId(ctx.user), storeId: input.storeId, alertType: input.alertType, latitude: input.latitude?.toString(), longitude: input.longitude?.toString(), distanceFromStore: input.distanceFromStore?.toString(), notes: input.notes });
      if (input.alertType === "left_radius") {
        const store = await db.getStoreById(input.storeId);
        const promoterName = ctx.user.name ?? `Promotor ${getAppUserId(ctx.user)}`;
        push.notifyPromoterLeftRadius(promoterName, store?.name ?? `Loja ${input.storeId}`).catch(() => {});
      }
      return { id };
    }),
  }),
  pushTokens: router({
    register: protectedProcedure
      .input(z.object({ token: z.string().min(1), platform: z.enum(["ios", "android", "web"]), deviceId: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        await db.upsertPushToken({ userId: getAppUserId(ctx.user), token: input.token, platform: input.platform, deviceId: input.deviceId });
        return { success: true };
      }),
  }),
  reports: router({
    daily: protectedProcedure.input(z.object({ date: z.string().optional(), startDate: z.string().optional(), endDate: z.string().optional() })).query(({ input }) => {
      if (input.startDate && input.endDate) {
        return db.getDailyReportRange(new Date(input.startDate), new Date(input.endDate));
      }
      return db.getDailyReport(input.date ? new Date(input.date) : new Date());
    }),
    promoterSummary: protectedProcedure.input(z.object({ userId: z.number().optional(), date: z.string().optional() })).query(async ({ ctx, input }) => db.getDailySummary(input.userId ?? ctx.user.id, input.date ? new Date(input.date) : new Date())),
    allPromoters: protectedProcedure.query(() => db.getAllPromoterUsersWithProfile()),
    monthly: protectedProcedure
      .input(z.object({ year: z.number().int().min(2020).max(2100), month: z.number().int().min(1).max(12), userId: z.number().optional() }))
      .query(({ input }) => db.getMonthlyReport(input.year, input.month, input.userId)),
    presenceDashboard: protectedProcedure
      .input(z.object({ dayStart: z.string(), dayEnd: z.string() }))
      .query(({ input }) => db.getPresenceDashboard(new Date(input.dayStart), new Date(input.dayEnd))),
  }),
  notifications: router({
    list: protectedProcedure.input(z.object({ limit: z.number().default(50) })).query(({ ctx, input }) => db.getNotificationsByUser(getAppUserId(ctx.user), input.limit)),
    unreadCount: protectedProcedure.query(({ ctx }) => db.getUnreadNotificationCount(getAppUserId(ctx.user))),
    markRead: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db.markNotificationRead(input.id)),
    markAllRead: protectedProcedure.mutation(({ ctx }) => db.markAllNotificationsRead(getAppUserId(ctx.user))),
  }),
  brandsAdmin: router({
    listAll: protectedProcedure.query(() => db.getAllBrands()),
    create: protectedProcedure
      .input(z.object({ name: z.string().min(1).max(100), description: z.string().optional(), colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(), logoUrl: z.string().url().optional(), iconName: z.string().optional(), sortOrder: z.number().int().default(0) }))
      .mutation(async ({ input }) => { const id = await db.createBrand(input); return { id }; }),
    update: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string().min(1).max(100).optional(), description: z.string().optional(), colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(), logoUrl: z.string().url().optional(), iconName: z.string().optional(), sortOrder: z.number().int().optional() }))
      .mutation(({ input }) => db.updateBrand(input.id, input)),
    toggleStatus: protectedProcedure
      .input(z.object({ id: z.number(), status: z.enum(["active", "inactive"]) }))
      .mutation(({ input }) => db.toggleBrandStatus(input.id, input.status)),
    uploadLogo: protectedProcedure
      .input(z.object({ fileBase64: z.string(), fileType: z.string().default("image/png"), fileName: z.string().default("logo.png") }))
      .mutation(async ({ input }) => { const buffer = Buffer.from(input.fileBase64, "base64"); const fileKey = `brands/${Date.now()}-${input.fileName}`; const { url } = await storagePut(fileKey, buffer, input.fileType); return { url }; }),
  }),
  signedReports: router({
    create: protectedProcedure
      .input(z.object({ promoterId: z.number().optional(), month: z.number().int().min(1).max(12), year: z.number().int().min(2020).max(2100), signatureData: z.string().min(10), reportHash: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const appUserId = getAppUserId(ctx.user);
        const reportId = `RPT-${appUserId}-${input.year}${String(input.month).padStart(2, "0")}-${Date.now()}`;
        const id = await db.createSignedReport({ ...input, managerId: appUserId, reportId, signedAt: new Date() });
        return { id, reportId };
      }),
    verify: publicProcedure.input(z.object({ reportId: z.string() })).query(({ input }) => db.getSignedReportById(input.reportId)),
    listByManager: protectedProcedure.query(({ ctx }) => db.getSignedReportsByManager(getAppUserId(ctx.user))),
  }),
  storePerformance: router({
    ranking: protectedProcedure
      .input(z.object({
        year: z.number().int().min(2020).max(2100),
        month: z.number().int().min(1).max(12),
        promoterId: z.number().int().positive().optional(),
      }))
      .query(({ input }) => db.getStorePerformance(input.year, input.month, input.promoterId)),
    promoters: protectedProcedure
      .query(() => db.getAllPromoterUsersWithProfile()),
  }),
  promoterProfile: router({
    myStats: protectedProcedure
      .input(z.object({
        year: z.number().int().min(2020).max(2100),
        month: z.number().int().min(1).max(12),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }))
      .query(({ ctx, input }) => {
        const userId = getAppUserId(ctx.user);
        // FIX: usa startDate/endDate locais se fornecidos, para respeitar fuso horário do Brasil
        if (input.startDate && input.endDate) {
          return db.getPromoterMonthlyStatsRange(userId, new Date(input.startDate), new Date(input.endDate));
        }
        return db.getPromoterMonthlyStats(userId, input.year, input.month);
      }),
    weeklyTrend: protectedProcedure
      .input(z.object({ tzOffsetMinutes: z.number().optional() }))
      .query(({ ctx, input }) => db.getPromoterWeeklyTrend(getAppUserId(ctx.user), input.tzOffsetMinutes ?? -180)),
  }),
  promoterRanking: router({
    monthly: protectedProcedure
      .input(z.object({
        year: z.number().int().min(2020).max(2100),
        month: z.number().int().min(1).max(12),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }))
      .query(({ input }) => db.getPromoterRanking(
        input.year,
        input.month,
        input.startDate ? new Date(input.startDate) : undefined,
        input.endDate ? new Date(input.endDate) : undefined,
      )),
    rankPosition: protectedProcedure
      .input(z.object({
        promoterId: z.number().int().positive(),
        year: z.number().int().min(2020).max(2100),
        month: z.number().int().min(1).max(12),
      }))
      .query(async ({ input }) => {
        const { promoterId, year, month } = input;
        const currentRanking = await db.getPromoterRanking(year, month);
        const currentEntry = currentRanking.find((r) => r.userId === promoterId);
        const currentRank = currentEntry?.rank ?? null;
        const totalPromoters = currentRanking.length;
        const prevMonth = month === 1 ? 12 : month - 1;
        const prevYear = month === 1 ? year - 1 : year;
        const prevRanking = await db.getPromoterRanking(prevYear, prevMonth);
        const prevEntry = prevRanking.find((r) => r.userId === promoterId);
        const prevRank = prevEntry?.rank ?? null;
        const change = (currentRank !== null && prevRank !== null) ? prevRank - currentRank : null;
        return { currentRank, prevRank, change, totalPromoters };
      }),
  }),
  storeVisits: router({
    history: protectedProcedure
      .input(z.object({
        storeId: z.number().int().positive(),
        year: z.number().int().min(2020).max(2100),
        month: z.number().int().min(1).max(12),
      }))
      .query(({ input }) => db.getStoreVisitHistory(input.storeId, input.year, input.month)),
  }),
  promoterDetail: router({
    get: protectedProcedure
      .input(z.object({
        promoterId: z.number().int().positive(),
        year: z.number().int().min(2020).max(2100),
        month: z.number().int().min(1).max(12),
      }))
      .query(({ input }) => db.getPromoterDetail(input.promoterId, input.year, input.month)),
  }),
  settings: router({
    get: protectedProcedure
      .query(({ ctx }) => db.getAppSettings(getAppUserId(ctx.user))),
    save: protectedProcedure
      .input(z.object({
        geoRadiusKm: z.string().optional(),
        weightPhotos: z.number().int().min(0).max(100).optional(),
        weightHours: z.number().int().min(0).max(100).optional(),
        weightVisits: z.number().int().min(0).max(100).optional(),
        weightMaterials: z.number().int().min(0).max(100).optional(),
        weightQuality: z.number().int().min(0).max(100).optional(),
        weightDailyAvg: z.number().int().min(0).max(100).optional(),
        dailyHoursAlertThreshold: z.number().int().min(0).max(24).optional(),
        notifyGeoAlert: z.boolean().optional(),
        notifyLowHours: z.boolean().optional(),
        notifyMaterialRequest: z.boolean().optional(),
        notifyPhotoRejected: z.boolean().optional(),
      }))
      .mutation(({ ctx, input }) => db.upsertAppSettings(getAppUserId(ctx.user), input)),
    checkLowHours: protectedProcedure
      .mutation(async ({ ctx }) => {
        const appUserId = getAppUserId(ctx.user);
        return push.checkAndNotifyLowDailyHours(appUserId);
      }),
  }),
  productExpirations: router({
    create: protectedProcedure
      .input(z.object({
        brandId: z.number().int().positive(),
        storeId: z.number().int().positive(),
        description: z.string().optional(),
        photos: z.array(z.object({
          fileBase64: z.string(),
          fileType: z.string().default("image/jpeg"),
          fileName: z.string().default("expiration.jpg"),
        })).min(1).max(10),
      }))
      .mutation(async ({ ctx, input }) => {
        const userId = getAppUserId(ctx.user);
        const id = await db.createProductExpiration({
          userId,
          brandId: input.brandId,
          storeId: input.storeId,
          description: input.description,
        });
        for (let i = 0; i < input.photos.length; i++) {
          const p = input.photos[i];
          const buffer = Buffer.from(p.fileBase64, "base64");
          const fileKey = `product-expirations/${userId}/${Date.now()}-${i}-${p.fileName}`;
          const { url } = await storagePut(fileKey, buffer, p.fileType);
          await db.addProductExpirationPhoto({ expirationId: id, photoUrl: url, sortOrder: i });
        }
        return { id };
      }),
    list: protectedProcedure
      .input(z.object({
        status: z.enum(["pending", "approved", "rejected"]).optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }))
      .query(({ ctx, input }) => db.getProductExpirations({ ...input, userId: getAppUserId(ctx.user) })),
    listAll: protectedProcedure
      .input(z.object({
        brandId: z.number().optional(),
        storeId: z.number().optional(),
        userId: z.number().optional(),
        status: z.enum(["pending", "approved", "rejected"]).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        limit: z.number().default(100),
        offset: z.number().default(0),
      }))
      .query(({ input }) => db.getProductExpirations({
        ...input,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
      })),
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
        status: z.enum(["approved", "rejected"]),
        managerNotes: z.string().optional(),
      }))
      .mutation(({ input }) => db.updateProductExpirationStatus(input.id, input.status, input.managerNotes)),
    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(({ input }) => db.deleteProductExpiration(input.id)),
    countPending: protectedProcedure
      .query(() => db.countPendingProductExpirations()),
  }),
});
export type AppRouter = typeof appRouter;
