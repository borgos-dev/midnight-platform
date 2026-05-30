import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentCreatorProfile } from "@/app/lib/auth-helpers";

export async function GET(_req: NextRequest) {
  try {
    // Derive creatorId from the session — never trust query params for ownership
    const creator = await getCurrentCreatorProfile();
    if (!creator) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const events = await prisma.analyticsEvent.findMany({
      where: { creatorId: creator.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        eventType: true,
        country: true,
        city: true,
        device: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error("Live activity error:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}
