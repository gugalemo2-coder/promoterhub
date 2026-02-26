/**
 * REST endpoint for file upload via multipart/form-data.
 * Used by the native PWA (iOS/Android) via FileSystem.uploadAsync.
 * Web uses tRPC with base64 encoding instead.
 */
import type { Express, Request, Response } from "express";
import * as multerModule from "multer";
const multer = (multerModule as any).default ?? multerModule;
import { sdk } from "./_core/sdk";
import { COOKIE_NAME } from "../shared/const";
import { parse as parseCookieHeader } from "cookie";
import * as db from "./db";
import * as push from "./notifications";
import { storagePut } from "./storage";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
});

/** Extract the session token from Authorization header or cookie */
function getToken(req: Request): string | undefined {
  const fromHeader = req.headers.authorization?.replace("Bearer ", "");
  if (fromHeader) return fromHeader;
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;
  const cookies = parseCookieHeader(cookieHeader);
  return cookies[COOKIE_NAME];
}

/** Extract app_user id from openId */
function getAppUserId(openId: string): number | null {
  const match = openId.match(/^app_user_(\d+)$/);
  return match ? parseInt(match[1]) : null;
}

export function registerFileUploadRoutes(app: Express) {
  /**
   * POST /api/files/upload
   * Multipart form fields:
   *   - file: the file binary
   *   - brandId: number (required)
   *   - description: string (optional)
   *   - visibility: "all_promoters" | "specific_stores" | "specific_users" (default: all_promoters)
   */
  app.post(
    "/api/files/upload",
    upload.single("file"),
    async (req: Request, res: Response) => {
      try {
        const token = getToken(req);
        if (!token) {
          res.status(401).json({ error: "Não autenticado." });
          return;
        }

        const session = await sdk.verifySession(token);
        if (!session) {
          res.status(401).json({ error: "Sessão inválida." });
          return;
        }

        const appUserId = getAppUserId(session.openId);
        if (appUserId === null) {
          res.status(403).json({ error: "Acesso negado." });
          return;
        }

        const file = req.file;
        if (!file) {
          res.status(400).json({ error: "Nenhum arquivo enviado." });
          return;
        }

        const brandId = parseInt(req.body.brandId as string);
        if (isNaN(brandId)) {
          res.status(400).json({ error: "brandId inválido." });
          return;
        }

        const description = (req.body.description as string) || undefined;
        const visibility = (req.body.visibility as string) || "all_promoters";

        const fileKey = `stock-files/${brandId}/${Date.now()}-${file.originalname}`;
        const { url } = await storagePut(fileKey, file.buffer, file.mimetype);

        const id = await db.createStockFile({
          brandId,
          fileUrl: url,
          fileName: file.originalname,
          fileType: file.mimetype,
          fileSize: file.size,
          description,
          uploadedBy: appUserId,
          visibility: visibility as "all_promoters" | "specific_stores" | "specific_users",
        });

        // Notify all promoters about the new file
        try {
          const brand = await db.getBrandById(brandId);
          const promoterIds = await db.getAllPromoterUserIds();
          if (promoterIds.length > 0) {
            push.notifyNewFileAvailable(promoterIds, brand?.name ?? "Marca", file.originalname).catch(() => {});
          }
        } catch (_) {}

        res.json({ id, fileUrl: url, fileName: file.originalname, fileSize: file.size });
      } catch (err) {
        console.error("[FileUpload] Upload failed:", err);
        res.status(500).json({ error: "Erro interno ao fazer upload do arquivo." });
      }
    }
  );
}
