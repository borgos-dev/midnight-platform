"use server";

import { revalidatePath } from "next/cache";
import { rememberAgeVerified } from "@/app/lib/age-gate";

/**
 * Records that the visitor confirmed they're 18+. Writes the cookie and
 * revalidates the current path so the modal disappears on the next render.
 *
 * Note: we don't redirect from here — the client closes its own modal once
 * the action resolves. Keeping the redirect off lets the visitor land on
 * whichever route they originally requested instead of being bounced to "/".
 */
export async function confirmAge(pathname: string): Promise<void> {
  await rememberAgeVerified();
  // Sanitize: only revalidate same-origin paths so a malformed `pathname`
  // can't trigger an unrelated revalidation.
  const safePath =
    typeof pathname === "string" && pathname.startsWith("/") ? pathname : "/";
  revalidatePath(safePath);
}
