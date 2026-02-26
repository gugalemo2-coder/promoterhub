/**
 * Custom authentication module — login/password based.
 * Independent from Manus OAuth. Uses bcrypt for password hashing and
 * the same JWT infrastructure already in place (sdk.signSession).
 */
import type { Express, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import * as dbModule from "../db";
import { appUsers, type AppUser } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { ENV } from "./env";
import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const";
import { getSessionCookieOptions } from "./cookies";
import { storagePut } from "../storage";
import { parse as parseCookieHeader } from "cookie";

/** Read the session token from Authorization header or cookie (without cookie-parser middleware) */
function getToken(req: Request): string | undefined {
  const fromHeader = req.headers.authorization?.replace("Bearer ", "");
  if (fromHeader) return fromHeader;
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;
  const cookies = parseCookieHeader(cookieHeader);
  return cookies[COOKIE_NAME];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert a display name to a login handle: lowercase, no accents, no spaces */
function nameToLogin(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ""); // keep only alphanumeric
}

function buildUserResponse(u: AppUser) {
  return {
    id: u.id,
    name: u.name,
    login: u.login,
    appRole: u.appRole,
    active: u.active,
    avatarUrl: u.avatarUrl ?? null,
    createdAt: u.createdAt,
  };
}

// ─── Seed Master account ──────────────────────────────────────────────────────

export async function seedMasterAccount() {
  const db = await getDb();
  if (!db) return;
  try {
    const existing = await db
      .select()
      .from(appUsers)
      .where(eq(appUsers.login, "gustavolemes"))
      .limit(1);
    if (existing.length > 0) return; // already seeded
    const passwordHash = await bcrypt.hash("Gustavo2410@", 10);
    await db.insert(appUsers).values({
      name: "Gustavo Lemes",
      login: "gustavolemes",
      passwordHash,
      appRole: "master",
      active: true,
    });
    console.log("[CustomAuth] Master account seeded: gustavolemes");
  } catch (err) {
    console.error("[CustomAuth] Failed to seed master account:", err);
  }
}

// ─── Route registration ───────────────────────────────────────────────────────

export function registerCustomAuthRoutes(app: Express) {
  // ── POST /api/auth/app-register ──────────────────────────────────────────
  app.post("/api/auth/app-register", async (req: Request, res: Response) => {
    try {
      const { name, password } = req.body as { name?: string; password?: string };
      if (!name || name.trim().length < 2) {
        res.status(400).json({ error: "Nome deve ter pelo menos 2 caracteres." });
        return;
      }
      if (!password || password.length < 4) {
        res.status(400).json({ error: "Senha deve ter pelo menos 4 caracteres." });
        return;
      }
      const db = await getDb();
      if (!db) { res.status(503).json({ error: "Banco de dados indisponível." }); return; }

      const login = nameToLogin(name.trim());
      if (login.length < 2) {
        res.status(400).json({ error: "Nome inválido para gerar login." });
        return;
      }

      // Check uniqueness
      const existing = await db.select().from(appUsers).where(eq(appUsers.login, login)).limit(1);
      if (existing.length > 0) {
        res.status(409).json({ error: `Login "${login}" já está em uso. Tente um nome diferente.` });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);
      await db.insert(appUsers).values({
        name: name.trim(),
        login,
        passwordHash,
        appRole: "promoter", // default role
        active: true,
      });

      const created = await db.select().from(appUsers).where(eq(appUsers.login, login)).limit(1);
      if (!created[0]) { res.status(500).json({ error: "Erro ao criar conta." }); return; }

      const user = created[0];
      const sessionToken = await sdk.signSession(
        { openId: `app_user_${user.id}`, appId: ENV.appId, name: user.name },
        { expiresInMs: ONE_YEAR_MS }
      );
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.status(201).json({
        app_session_id: sessionToken,
        user: buildUserResponse(user),
        appRole: user.appRole,
        generatedLogin: login,
      });
    } catch (err) {
      console.error("[CustomAuth] Register failed:", err);
      res.status(500).json({ error: "Erro interno ao registrar." });
    }
  });

  // ── POST /api/auth/app-login ─────────────────────────────────────────────
  app.post("/api/auth/app-login", async (req: Request, res: Response) => {
    try {
      const { login, password } = req.body as { login?: string; password?: string };
      if (!login || !password) {
        res.status(400).json({ error: "Login e senha são obrigatórios." });
        return;
      }
      const db = await getDb();
      if (!db) { res.status(503).json({ error: "Banco de dados indisponível." }); return; }

      const rows = await db
        .select()
        .from(appUsers)
        .where(eq(appUsers.login, login.trim().toLowerCase()))
        .limit(1);

      if (rows.length === 0) {
        res.status(401).json({ error: "Login ou senha incorretos." });
        return;
      }
      const user = rows[0];
      if (!user.active) {
        res.status(403).json({ error: "Conta desativada. Contate o administrador." });
        return;
      }
      const passwordMatch = await bcrypt.compare(password, user.passwordHash);
      if (!passwordMatch) {
        res.status(401).json({ error: "Login ou senha incorretos." });
        return;
      }

      const sessionToken = await sdk.signSession(
        { openId: `app_user_${user.id}`, appId: ENV.appId, name: user.name },
        { expiresInMs: ONE_YEAR_MS }
      );
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({
        app_session_id: sessionToken,
        user: buildUserResponse(user),
        appRole: user.appRole,
      });
    } catch (err) {
      console.error("[CustomAuth] Login failed:", err);
      res.status(500).json({ error: "Erro interno ao fazer login." });
    }
  });

  // ── GET /api/auth/app-me ─────────────────────────────────────────────────
  app.get("/api/auth/app-me", async (req: Request, res: Response) => {
    try {
      const token =
        getToken(req);
      if (!token) { res.status(401).json({ error: "Não autenticado." }); return; }

      const session = await sdk.verifySession(token);
      if (!session) { res.status(401).json({ error: "Sessão inválida." }); return; }

      // openId for custom users is "app_user_{id}"
      const match = session.openId.match(/^app_user_(\d+)$/);
      if (!match) { res.status(401).json({ error: "Token não é de um usuário customizado." }); return; }

      const userId = parseInt(match[1]);
      const db = await getDb();
      if (!db) { res.status(503).json({ error: "Banco de dados indisponível." }); return; }

      const rows = await db.select().from(appUsers).where(eq(appUsers.id, userId)).limit(1);
      if (rows.length === 0) { res.status(404).json({ error: "Usuário não encontrado." }); return; }

      res.json({ user: buildUserResponse(rows[0]), appRole: rows[0].appRole });
    } catch (err) {
      console.error("[CustomAuth] Me failed:", err);
      res.status(500).json({ error: "Erro interno." });
    }
  });

  // ── GET /api/master/users ────────────────────────────────────────────────
  app.get("/api/master/users", async (req: Request, res: Response) => {
    try {
      const token =
        getToken(req);
      if (!token) { res.status(401).json({ error: "Não autenticado." }); return; }

      const session = await sdk.verifySession(token);
      if (!session) { res.status(401).json({ error: "Sessão inválida." }); return; }

      const match = session.openId.match(/^app_user_(\d+)$/);
      if (!match) { res.status(403).json({ error: "Acesso negado." }); return; }

      const userId = parseInt(match[1]);
      const db = await getDb();
      if (!db) { res.status(503).json({ error: "Banco de dados indisponível." }); return; }

      const requester = await db.select().from(appUsers).where(eq(appUsers.id, userId)).limit(1);
      if (!requester[0] || requester[0].appRole !== "master") {
        res.status(403).json({ error: "Apenas o Master pode acessar esta rota." });
        return;
      }

      const allUsers = await db.select().from(appUsers);
      res.json({ users: allUsers.map(buildUserResponse) });
    } catch (err) {
      console.error("[CustomAuth] List users failed:", err);
      res.status(500).json({ error: "Erro interno." });
    }
  });

  // ── PATCH /api/master/users/:id/role ────────────────────────────────────
  app.patch("/api/master/users/:id/role", async (req: Request, res: Response) => {
    try {
      const token =
        getToken(req);
      if (!token) { res.status(401).json({ error: "Não autenticado." }); return; }

      const session = await sdk.verifySession(token);
      if (!session) { res.status(401).json({ error: "Sessão inválida." }); return; }

      const match = session.openId.match(/^app_user_(\d+)$/);
      if (!match) { res.status(403).json({ error: "Acesso negado." }); return; }

      const requesterId = parseInt(match[1]);
      const targetId = parseInt(req.params.id);
      const { appRole } = req.body as { appRole?: string };

      if (!appRole || !["promoter", "manager"].includes(appRole)) {
        res.status(400).json({ error: "Role deve ser 'promoter' ou 'manager'." });
        return;
      }

      const db = await getDb();
      if (!db) { res.status(503).json({ error: "Banco de dados indisponível." }); return; }

      const requester = await db.select().from(appUsers).where(eq(appUsers.id, requesterId)).limit(1);
      if (!requester[0] || requester[0].appRole !== "master") {
        res.status(403).json({ error: "Apenas o Master pode alterar roles." });
        return;
      }

      // Cannot change master's own role
      if (targetId === requesterId) {
        res.status(400).json({ error: "Não é possível alterar o role da conta Master." });
        return;
      }

      await db
        .update(appUsers)
        .set({ appRole: appRole as "promoter" | "manager" })
        .where(eq(appUsers.id, targetId));

      const updated = await db.select().from(appUsers).where(eq(appUsers.id, targetId)).limit(1);
      if (!updated[0]) { res.status(404).json({ error: "Usuário não encontrado." }); return; }

      res.json({ user: buildUserResponse(updated[0]) });
    } catch (err) {
      console.error("[CustomAuth] Update role failed:", err);
      res.status(500).json({ error: "Erro interno." });
    }
  });

  // ── PATCH /api/master/users/:id/active ──────────────────────────────────
  app.patch("/api/master/users/:id/active", async (req: Request, res: Response) => {
    try {
      const token =
        getToken(req);
      if (!token) { res.status(401).json({ error: "Não autenticado." }); return; }

      const session = await sdk.verifySession(token);
      if (!session) { res.status(401).json({ error: "Sessão inválida." }); return; }

      const match = session.openId.match(/^app_user_(\d+)$/);
      if (!match) { res.status(403).json({ error: "Acesso negado." }); return; }

      const requesterId = parseInt(match[1]);
      const targetId = parseInt(req.params.id);
      const { active } = req.body as { active?: boolean };

      if (typeof active !== "boolean") {
        res.status(400).json({ error: "Campo 'active' deve ser boolean." });
        return;
      }

      const db = await getDb();
      if (!db) { res.status(503).json({ error: "Banco de dados indisponível." }); return; }

      const requester = await db.select().from(appUsers).where(eq(appUsers.id, requesterId)).limit(1);
      if (!requester[0] || requester[0].appRole !== "master") {
        res.status(403).json({ error: "Apenas o Master pode ativar/desativar contas." });
        return;
      }

      if (targetId === requesterId) {
        res.status(400).json({ error: "Não é possível desativar a conta Master." });
        return;
      }

      await db.update(appUsers).set({ active }).where(eq(appUsers.id, targetId));
      const updated = await db.select().from(appUsers).where(eq(appUsers.id, targetId)).limit(1);
      res.json({ user: buildUserResponse(updated[0]) });
    } catch (err) {
      console.error("[CustomAuth] Toggle active failed:", err);
      res.status(500).json({ error: "Erro interno." });
    }
  });  // ── DELETE /api/master/users/:id ───────────────────────────────────────────────────────────
  app.delete("/api/master/users/:id", async (req: Request, res: Response) => {
    try {
      const token = getToken(req);
      if (!token) { res.status(401).json({ error: "Não autenticado." }); return; }
      const session = await sdk.verifySession(token);
      if (!session) { res.status(401).json({ error: "Sessão inválida." }); return; }
      const match = session.openId.match(/^app_user_(\d+)$/);
      if (!match) { res.status(403).json({ error: "Acesso negado." }); return; }
      const requesterId = parseInt(match[1]);
      const targetId = parseInt(req.params.id);
      if (isNaN(targetId)) { res.status(400).json({ error: "ID inválido." }); return; }
      const db = await getDb();
      if (!db) { res.status(503).json({ error: "Banco de dados indisponível." }); return; }
      const requester = await db.select().from(appUsers).where(eq(appUsers.id, requesterId)).limit(1);
      if (!requester[0] || requester[0].appRole !== "master") {
        res.status(403).json({ error: "Apenas o Master pode excluir contas." });
        return;
      }
      if (targetId === requesterId) {
        res.status(400).json({ error: "Não é possível excluir a própria conta Master." });
        return;
      }
      const target = await db.select().from(appUsers).where(eq(appUsers.id, targetId)).limit(1);
      if (!target[0]) { res.status(404).json({ error: "Usuário não encontrado." }); return; }
      if (target[0].appRole === "master") {
        res.status(400).json({ error: "Não é possível excluir outra conta Master." });
        return;
      }
      const userName = target[0].name ?? target[0].login;
      await dbModule.deleteUserAccount(targetId);
      res.json({ success: true, message: `Conta de "${userName}" excluída com sucesso.` });
    } catch (err) {
      console.error("[CustomAuth] Delete user failed:", err);
      res.status(500).json({ error: "Erro interno ao excluir conta." });
    }
  });

  // ── POST /api/auth/app-upload-avatar ──────────────────────────────────────────────
  app.post("/api/auth/app-upload-avatar", async (req: Request, res: Response) => {
    try {
      const token =
        getToken(req);
      if (!token) { res.status(401).json({ error: "Não autenticado." }); return; }

      const session = await sdk.verifySession(token);
      if (!session) { res.status(401).json({ error: "Sessão inválida." }); return; }

      const match = session.openId.match(/^app_user_(\d+)$/);
      if (!match) { res.status(403).json({ error: "Acesso negado." }); return; }

      const userId = parseInt(match[1]);
      const { fileBase64, fileType = "image/jpeg", fileName = "avatar.jpg" } = req.body as {
        fileBase64?: string;
        fileType?: string;
        fileName?: string;
      };

      if (!fileBase64) {
        res.status(400).json({ error: "Imagem não fornecida." });
        return;
      }

      const db = await getDb();
      if (!db) { res.status(503).json({ error: "Banco de dados indisponível." }); return; }

      const buffer = Buffer.from(fileBase64, "base64");
      const fileKey = `avatars/user_${userId}_${Date.now()}.${fileName.split(".").pop() ?? "jpg"}`;
      const { url } = await storagePut(fileKey, buffer, fileType);

      await db.update(appUsers).set({ avatarUrl: url }).where(eq(appUsers.id, userId));

      const updated = await db.select().from(appUsers).where(eq(appUsers.id, userId)).limit(1);
      res.json({ avatarUrl: url, user: buildUserResponse(updated[0]) });
    } catch (err) {
      console.error("[CustomAuth] Upload avatar failed:", err);
      res.status(500).json({ error: "Erro interno ao fazer upload do avatar." });
    }
  });

  // ── PATCH /api/master/users/:id/password ────────────────────────────────────
  app.patch("/api/master/users/:id/password", async (req: Request, res: Response) => {
    try {
      const token =
        getToken(req);
      if (!token) { res.status(401).json({ error: "Não autenticado." }); return; }

      const session = await sdk.verifySession(token);
      if (!session) { res.status(401).json({ error: "Sessão inválida." }); return; }

      const match = session.openId.match(/^app_user_(\d+)$/);
      if (!match) { res.status(403).json({ error: "Acesso negado." }); return; }

      const requesterId = parseInt(match[1]);
      const targetId = parseInt(req.params.id);
      const { newPassword } = req.body as { newPassword?: string };

      if (!newPassword || newPassword.trim().length < 4) {
        res.status(400).json({ error: "A nova senha deve ter pelo menos 4 caracteres." });
        return;
      }

      const db = await getDb();
      if (!db) { res.status(503).json({ error: "Banco de dados indisponível." }); return; }

      const requester = await db.select().from(appUsers).where(eq(appUsers.id, requesterId)).limit(1);
      if (!requester[0] || requester[0].appRole !== "master") {
        res.status(403).json({ error: "Apenas o Master pode redefinir senhas." });
        return;
      }

      const target = await db.select().from(appUsers).where(eq(appUsers.id, targetId)).limit(1);
      if (!target[0]) { res.status(404).json({ error: "Usuário não encontrado." }); return; }

      const passwordHash = await bcrypt.hash(newPassword.trim(), 6);
      await db.update(appUsers).set({ passwordHash }).where(eq(appUsers.id, targetId));

      res.json({ success: true, message: `Senha de "${target[0].name}" redefinida com sucesso.` });
    } catch (err) {
      console.error("[CustomAuth] Reset password failed:", err);
      res.status(500).json({ error: "Erro interno." });
    }
  });
}
