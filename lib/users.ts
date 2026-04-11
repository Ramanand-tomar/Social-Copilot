import { auth, clerkClient } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

type UserRow = typeof users.$inferSelect;

/**
 * Look up the app's internal user row for a Clerk user id. If the row doesn't
 * exist yet — which happens when the Clerk webhook never fired (webhook not
 * configured on localhost, user created before webhook existed, webhook event
 * dropped, etc.) — we lazily fetch the profile from Clerk and insert it.
 *
 * This makes the app self-healing: the first authenticated page load or API
 * call backfills the user record, so callers no longer need to 404 when the
 * Clerk webhook has failed to sync.
 */
export async function ensureUserFromClerk(clerkId: string): Promise<UserRow | null> {
  const existing = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });
  if (existing) return existing;

  let clerkUser;
  try {
    const client = await clerkClient();
    clerkUser = await client.users.getUser(clerkId);
  } catch (err) {
    console.error("ensureUserFromClerk: failed to fetch Clerk user", clerkId, err);
    return null;
  }

  const primaryEmail =
    clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ||
    clerkUser.emailAddresses[0]?.emailAddress;

  if (!primaryEmail) {
    console.error("ensureUserFromClerk: Clerk user has no email address", clerkId);
    return null;
  }

  // Race-safe: if the webhook lands between findFirst and insert, the unique
  // constraint on clerk_id stops the duplicate. We then re-read the row.
  try {
    const [inserted] = await db
      .insert(users)
      .values({
        clerkId,
        email: primaryEmail,
        name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim(),
        imageUrl: clerkUser.imageUrl,
      })
      .returning();
    return inserted ?? null;
  } catch (err) {
    // Unique violation — another request inserted the row first. Re-read it.
    const afterRace = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });
    if (afterRace) return afterRace;
    console.error("ensureUserFromClerk: insert failed and row still missing", clerkId, err);
    return null;
  }
}

/**
 * Convenience for API routes that need the signed-in user as a DB row. Returns
 * `{ clerkId, user }` when authenticated and synced, `null` otherwise.
 */
export async function getCurrentDbUser(): Promise<{ clerkId: string; user: UserRow } | null> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;
  const user = await ensureUserFromClerk(clerkId);
  if (!user) return null;
  return { clerkId, user };
}
