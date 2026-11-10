import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/db";
import { sessions, userPermissions, users } from "@/db/schema";
import { randomToken, sha256 } from "./crypto";
import type { Actor, Role } from "./permissions";
import { clientIp, userAgent } from "./request";

export const SESSION_COOKIE = "mh_session";
const SESSION_DAYS = 14;

export interface CurrentUser extends Actor {
  email: string;
  name: string;
  avatarUrl: string | null;
  emailVerified: boolean;
}

export async function createSession(userId: string): Promise<void> {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.insert(sessions).values({
    tokenHash: sha256(token),
    userId,
    expiresAt,
    ip: await clientIp(),
    userAgent: await userAgent(),
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, sha256(token)));
  jar.delete(SESSION_COOKIE);
}

/** Revokes every session of a user (password change / reset, suspension). */
export async function revokeAllSessions(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

/** Resolves the signed-in user from the cookie. Cached per request. Never trusts anything the client sends but the token. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      status: users.status,
      avatarUrl: users.avatarUrl,
      emailVerifiedAt: users.emailVerifiedAt,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, sha256(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  if (!row || row.status !== "active") return null;
  const perms = await db
    .select({ permission: userPermissions.permission })
    .from(userPermissions)
    .where(eq(userPermissions.userId, row.id));
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role as Role,
    avatarUrl: row.avatarUrl,
    emailVerified: !!row.emailVerifiedAt,
    permissions: new Set(perms.map((p) => p.permission)),
  };
});
