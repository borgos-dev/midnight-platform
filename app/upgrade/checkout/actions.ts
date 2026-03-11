"use server"; 
import { auth } from "@/auth"; 
import { prisma } from "@/lib/prisma"; 
import { redirect } from "next/navigation"; 
export async function createPendingSubscription( plan: "VIP" | "VIP_PLUS", provider: "MTN_MOMO" | "ORANGE_MONEY" ) 
{ 
console.log("CREATE PENDING SUBSCRIPTION RUNNING");
const session = await auth(); 

if (!session?.user?.email) { redirect("/login"); }

const user = await prisma.user.findUnique({ where: { email: session.user.email }, include: { creatorprofile: true }, }); 

if (!user?.creatorprofile) { redirect("/upgrade/proof"); } 

const now = new Date(); const end = new Date(now); end.setDate(end.getDate() + 30); 

await prisma.subscription.create({ 
    data: { 
 creatorProfileId: user.creatorprofile.id,
 plan, 
 provider, 
 status: "PENDING", 
 amountCfa: plan === "VIP" ? 10000 : 20000, 
 startsAt: now, 
 endsAt: end,
 durationDays: 30, }, });          
         

 redirect("/upgrade/proof"); 
}
