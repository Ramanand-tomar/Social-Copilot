import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ensureUserFromClerk } from "@/lib/users";
import { z } from "zod";
import { badRequest } from "@/lib/validation";

export const dynamic = "force-dynamic";

const updateUserSchema = z.object({
  timezone: z
    .string()
    .max(100)
    .refine(
      (tz) => {
        try {
          new Intl.DateTimeFormat("en-US", { timeZone: tz });
          return true;
        } catch {
          return false;
        }
      },
      { message: "Invalid IANA timezone" },
    )
    .optional(),
  name: z.string().max(200).optional(),
});

export async function PATCH(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const user = await ensureUserFromClerk(clerkId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const raw = await req.json();
    const parsed = updateUserSchema.safeParse(raw);
    if (!parsed.success) return badRequest(parsed.error);

    const { timezone, name } = parsed.data;

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (timezone !== undefined) updates.timezone = timezone;
    if (name !== undefined) updates.name = name;

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, user.id))
      .returning();

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    console.error("Failed to update user:", error);
    return NextResponse.json({ error: "user_update_failed", message }, { status: 500 });
  }
}

export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const user = await ensureUserFromClerk(clerkId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json(user);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: "user_fetch_failed", message }, { status: 500 });
  }
}
