import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, notifications } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  // You can find this in the Clerk Dashboard -> Webhooks -> choose the webhook
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error(
      "Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local"
    );
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occurred -- no svix headers", {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
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

  // Get the ID and type
  const { id } = evt.data;
  const eventType = evt.type as string;

  if (eventType === "user.created") {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data as any;
    const primaryEmail = email_addresses?.[0]?.email_address;
    if (!id || !primaryEmail) {
      console.error("user.created missing id or primary email", { id, email_addresses });
      return new Response("Missing required user fields", { status: 400 });
    }

    await db.insert(users).values({
      clerkId: id,
      email: primaryEmail,
      name: `${first_name || ""} ${last_name || ""}`.trim(),
      imageUrl: image_url,
    });
  }

  if (eventType === "user.updated") {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data as any;
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
  }

  if (eventType === "user.deleted") {
    const { id } = evt.data as any;
    if (id) {
      await db.delete(users).where(eq(users.clerkId, id));
    }
    return new Response("", { status: 200 });
  }

  // Handle Clerk Billing Subscription Events
  if (eventType === "subscription.created" || eventType === "subscription.updated") {
    const { id, user_id, plan_id, status } = evt.data as any;

    const proPlanId = process.env.NEXT_PUBLIC_CLERK_PRO_PLAN_ID;
    const businessPlanId = process.env.NEXT_PUBLIC_CLERK_BUSINESS_PLAN_ID;

    const planMap = new Map<string, "pro" | "business">();
    if (proPlanId) planMap.set(proPlanId, "pro");
    if (businessPlanId) planMap.set(businessPlanId, "business");

    const mappedPlan = plan_id ? planMap.get(plan_id) : undefined;

    if (!mappedPlan) {
      console.error(
        JSON.stringify({
          level: "error",
          event: "clerk.webhook.unknown_plan_id",
          eventType,
          subscriptionId: id,
          clerkUserId: user_id,
          planId: plan_id ?? null,
          status: status ?? null,
        }),
      );

      const [targetUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.clerkId, user_id));

      if (targetUser) {
        await db.insert(notifications).values({
          userId: targetUser.id,
          kind: "billing.updated",
          title: "Billing Configuration Error",
          body: `Received an unrecognized plan ID (${plan_id}) from billing webhook. Your current plan was preserved.`,
          data: { error: true, planId: plan_id },
        });
      }

      return new Response("Unknown plan_id received, plan preserved", { status: 200 });
    }

    await db
      .update(users)
      .set({
        subscriptionPlan: status === "active" ? mappedPlan : "free",
        clerkSubscriptionId: id,
        updatedAt: new Date(),
      })
      .where(eq(users.clerkId, user_id));
  }

  if (eventType === "subscription.deleted") {
    const { user_id } = evt.data as any;
    
    await db
      .update(users)
      .set({
        subscriptionPlan: "free",
        clerkSubscriptionId: null,
        updatedAt: new Date(),
      })
      .where(eq(users.clerkId, user_id));
  }

  return new Response("", { status: 200 });
}
