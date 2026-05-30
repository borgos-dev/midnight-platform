import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentCreatorProfile, isSameOrigin } from "@/app/lib/auth-helpers";

// GET — fetch the logged-in creator's own notifications
export async function GET(_req: NextRequest) {
  try {
    const creator = await getCurrentCreatorProfile();
    if (!creator) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { creatorId: creator.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.notification.count({
        where: { creatorId: creator.id, read: false },
      }),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error("Notifications fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

// PATCH — mark notifications as read.
//   Body `{ id: number }` → mark that one notification read.
//   Body `{}` or no body → mark all unread notifications read.
// In both cases the where-clause is scoped to the logged-in creator, so a
// caller can't mark another creator's notifications read by guessing IDs.
export async function PATCH(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const creator = await getCurrentCreatorProfile();
    if (!creator) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { id?: unknown } = {};
    try {
      body = await req.json();
    } catch {
      // empty body → mark-all
    }

    if (typeof body.id === "number") {
      await prisma.notification.updateMany({
        where: { id: body.id, creatorId: creator.id, read: false },
        data: { read: true },
      });
    } else {
      await prisma.notification.updateMany({
        where: { creatorId: creator.id, read: false },
        data: { read: true },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Notifications update error:", error);
    return NextResponse.json(
      { error: "Failed to update notifications" },
      { status: 500 }
    );
  }
}
