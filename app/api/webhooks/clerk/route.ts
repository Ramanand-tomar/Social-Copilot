import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, notifications } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("Missing CLERK_WEBHOOK_SECRET in environment");
    return new Response(JSON.stringify({ error: "CLERK_WEBHOOK_SECRET missing" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occurred -- no svix headers", {
      status: 400,
    });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occurred", {
      status: 400,
    });
  }

  const eventType = evt.type as string;

  if (eventType === "user.created") {
    const data = evt.data as unknown as {
      id?: string;
      email_addresses?: Array<{ email_address: string }>;
      first_name?: string;
      last_name?: string;
      image_url?: string;
    };
    const { id, email_addresses, first_name, last_name, image_url } = data;
    const primaryEmail = email_addresses?.[0]?.email_address;

    if (!id || !primaryEmail) {
      console.error("user.created missing id or primary email", { id, email_addresses });
      return new Response("Missing required user fields", { status: 400 });
    }

    const userName = `${first_name || ""} ${last_name || ""}`.trim();

    await db
      .insert(users)
      .values({
        clerkId: id,
        email: primaryEmail,
        name: userName,
        imageUrl: image_url,
      })
      .onConflictDoUpdate({
        target: users.clerkId,
        set: {
          email: primaryEmail,
          name: userName,
          imageUrl: image_url,
          updatedAt: new Date(),
        },
      });

    return new Response("", { status: 200 });
  }

  if (eventType === "user.updated") {
    const data = evt.data as unknown as {
      id?: string;
      email_addresses?: Array<{ email_address: string }>;
      first_name?: string;
      last_name?: string;
      image_url?: string;
    };
    const { id, email_addresses, first_name, last_name, image_url } = data;
    const primaryEmail = email_addresses?.[0]?.email_address;

    if (!id) {
      return new Response("Missing user id", { status: 400 });
    }

    await db
      .update(users)
      .set({
        ...(primaryEmail ? { email: primaryEmail } : {}),
        name: `${first_name || ""} ${last_name || ""}`.trim(),
        imageUrl: image_url,
        updatedAt: new Date(),
      })
      .where(eq(users.clerkId, id));

    return new Response("", { status: 200 });
  }

  if (eventType === "user.deleted") {
    const data = evt.data as unknown as { id?: string };
    if (data.id) {
      await db.delete(users).where(eq(users.clerkId, data.id));
    }
    return new Response("", { status: 200 });
  }

  if (eventType === "subscription.created" || eventType === "subscription.updated") {
    const data = evt.data as unknown as {
      id?: string;
      user_id?: string;
      payer?: { user_id?: string };
      plan_id?: string;
      items?: Array<{ plan_id?: string; plan?: { id?: string } }>;
      status?: string;
    };
    const subscriptionId = data.id;
    const userId = data.user_id || data.payer?.user_id;
    const rawPlanId = data.plan_id || data.items?.[0]?.plan?.id || data.items?.[0]?.plan_id;
    const status = data.status;

    if (!userId) {
      return new Response("Missing user_id in subscription payload", { status: 400 });
    }

    const proPlanId = process.env.NEXT_PUBLIC_CLERK_PRO_PLAN_ID;
    const businessPlanId = process.env.NEXT_PUBLIC_CLERK_BUSINESS_PLAN_ID;
    const freePlanId = process.env.NEXT_PUBLIC_CLERK_FREE_PLAN_ID;

    const planMap = new Map<string, "free" | "pro" | "business">();
    planMap.set("free", "free");
    planMap.set("plan_free", "free");
    if (freePlanId) planMap.set(freePlanId, "free");
    if (proPlanId) planMap.set(proPlanId, "pro");
    if (businessPlanId) planMap.set(businessPlanId, "business");

    const mappedPlan = rawPlanId ? planMap.get(rawPlanId) : undefined;

    if (!mappedPlan) {
      console.error(
        JSON.stringify({
          level: "error",
          event: "clerk.webhook.unknown_plan_id",
          eventType,
          subscriptionId,
          clerkUserId: userId,
          planId: rawPlanId ?? null,
          status: status ?? null,
        }),
      );

      const [targetUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.clerkId, userId));

      if (targetUser) {
        await db.insert(notifications).values({
          userId: targetUser.id,
          kind: "billing.updated",
          title: "Billing Configuration Notice",
          body: `Received an unmapped plan ID (${rawPlanId}). Your current plan configuration was preserved.`,
          data: { error: true, planId: rawPlanId },
        });
      }

      return new Response("Unknown plan_id received, plan preserved", { status: 200 });
    }

    await db
      .update(users)
      .set({
        subscriptionPlan: status === "active" || mappedPlan === "free" ? mappedPlan : "free",
        clerkSubscriptionId: subscriptionId,
        updatedAt: new Date(),
      })
      .where(eq(users.clerkId, userId));

    return new Response("", { status: 200 });
  }

  if (eventType === "subscription.deleted") {
    const data = evt.data as unknown as { user_id?: string; payer?: { user_id?: string } };
    const userId = data.user_id || data.payer?.user_id;

    if (userId) {
      await db
        .update(users)
        .set({
          subscriptionPlan: "free",
          clerkSubscriptionId: null,
          updatedAt: new Date(),
        })
        .where(eq(users.clerkId, userId));
    }
    return new Response("", { status: 200 });
  }

  return new Response("", { status: 200 });
}
