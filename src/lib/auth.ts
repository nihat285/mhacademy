import "server-only";
import { notFound, redirect } from "next/navigation";
import { can, type Permission, type Role } from "./permissions";
import { getCurrentUser, type CurrentUser } from "./session";

/** Page guard: sign-in required. */
export async function requireUser(returnTo?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/giris${returnTo ? `?next=${encodeURIComponent(returnTo)}` : ""}`);
  return user;
}

/** Page guard: one of the given roles required. Others get a 404 (no hint that the area exists). */
export async function requireRole(roles: Role[], returnTo?: string): Promise<CurrentUser> {
  const user = await requireUser(returnTo);
  if (!roles.includes(user.role)) notFound();
  return user;
}

export async function requirePermission(permission: Permission): Promise<CurrentUser> {
  const user = await requireUser();
  if (!can(user, permission)) notFound();
  return user;
}

/** For Server Actions / Route Handlers: throws instead of redirecting. */
export class AuthError extends Error {
  constructor(
    message: string,
    public status: 401 | 403 = 403,
  ) {
    super(message);
  }
}

export async function assertUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Daxil olmaq tələb olunur.", 401);
  return user;
}

export async function assertRole(roles: Role[]): Promise<CurrentUser> {
  const user = await assertUser();
  if (!roles.includes(user.role)) throw new AuthError("Bu əməliyyat üçün icazəniz yoxdur.", 403);
  return user;
}

export async function assertPermission(permission: Permission): Promise<CurrentUser> {
  const user = await assertUser();
  if (!can(user, permission)) throw new AuthError("Bu əməliyyat üçün icazəniz yoxdur.", 403);
  return user;
}
