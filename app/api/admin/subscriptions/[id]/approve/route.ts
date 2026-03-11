import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { approveSubscriptionById } from "@/app/admin/subscriptions/approveSubscription";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = (await auth()) as {
      user?: {
        id?: string;
        role?: string;
        email?: string;
        name?: string;
      };
    };

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: subId } = await params;
  const id = Number(subId);

  if (!id) {
    return NextResponse.json({ error: "Invalid subscription id" }, { status: 400 });
  }

  try {
    const subscription = await approveSubscriptionById(id);
    return NextResponse.json(subscription);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to approve";
    const status = message === "Subscription not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}