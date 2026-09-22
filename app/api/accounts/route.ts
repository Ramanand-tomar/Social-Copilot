import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { socialAccounts } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { ensureUserFromClerk } from "@/lib/users";

export async function GET(_req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await ensureUserFromClerk(clerkId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const accounts = await db.query.socialAccounts.findMany({
      where: eq(socialAccounts.userId, user.id),
      orderBy: [desc(socialAccounts.createdAt)],
    });

    // Remove sensitive data before returning
    const sanitizedAccounts = accounts.map(({ accessToken: _accessToken, refreshToken: _refreshToken, ...rest }) => ({
      ...rest,
    }));

    return NextResponse.json({ accounts: sanitizedAccounts });
  } catch (error) {
    console.error("Fetch Accounts Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
