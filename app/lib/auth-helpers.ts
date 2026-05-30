import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

/** Returns the logged-in user's session, or null. */
export async function getSession() {
  return getServerSession(authOptions);
}

/** Returns the session.user.id as a number, or null. */
export async function getCurrentUserId(): Promise<number | null> {
  const session = await getSession();
  const id = (session?.user as { id?: string } | undefined)?.id;
  return id ? Number(id) : null;
}

/** Returns the logged-in user's creatorprofile, or null. */
export async function getCurrentCreatorProfile() {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  return prisma.creatorprofile.findUnique({ where: { userId } });
}

/**
 * Returns a freshly-loaded user including emailVerified and (if you've migrated
 * the schema) deletedAt. Use this when you must enforce a verified-email gate
 * or a soft-delete check on a sensitive write.
 */
export async function getCurrentUser() {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

/**
 * Strict same-origin check. Use to mitigate CSRF on JSON endpoints.
 * Allowed origins:
 *  - request's own Host header (i.e. browser sends Origin matching the deployment)
 *  - NEXT_PUBLIC_APP_URL if set
 *
 * Returns true if the request is from an allowed origin, OR if no Origin header
 * is present (server-to-server / curl) — those are blocked elsewhere via auth.
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // no Origin → not a cross-site browser request

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }

  const host = req.headers.get("host");
  if (host && host === originHost) return true;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL;
  if (appUrl) {
    try {
      if (new URL(appUrl).host === originHost) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}
