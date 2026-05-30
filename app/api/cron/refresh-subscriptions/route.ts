import { NextRequest, NextResponse } from "next/server";
import { refreshExpiredSubscriptions } from "@/app/lib/subscription";

/**
 * Bulk-expire stale VIP / VIP+ subscriptions. Schedule this every 5 minutes:
 *
 *   - Vercel:  vercel.json → { "crons": [ { "path": "/api/cron/refresh-subscriptions", "schedule": "*\/5 * * * *" } ] }
 *   - Render / Railway / etc:  external cron hitting this URL with header `Authorization: Bearer <CRON_SECRET>`
 *
 * Auth: a shared secret in the Authorization header. On Vercel cron, Vercel
 * automatically sends `Authorization: Bearer <CRON_SECRET>` if you set the env
 * var of that name on the deployment.
 */
export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    // Refuse to run if no secret is configured — never accidentally public.
    return NextResponse.json({ error: "Cron not configured" }, { status: 503 });
  }

  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await refreshExpiredSubscriptions();
  return NextResponse.json({ ok: true, ranAt: new Date().toISOString() });
}
