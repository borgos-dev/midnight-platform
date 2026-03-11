import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentCreator } from "../../lib/auth";

export async function POST(req: Request) {
    const creator = await getCurrentCreator();
    if (!creator) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan, provider } = await req.json();

    const PRICES = {
        VIP: 5000,
        VIP_PLUS: 10000,
    };

    if (!PRICES[plan as keyof typeof PRICES]) {
         return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const amountCfa = PRICES[plan as keyof typeof PRICES];

    const subscription = await prisma.subscription.create({
        data: {
            creatorProfileId: creator.id,
            plan,
            provider,
            amountCfa,
            durationDays: 30,
            startsAt: new Date(),
            endsAt: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        },
    });

    return NextResponse.json(subscription);
}
