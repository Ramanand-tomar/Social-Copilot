import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getIKAuthenticationParameters } from "@/lib/imagekit";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const authParams = getIKAuthenticationParameters();
    return NextResponse.json(authParams);
  } catch (error: any) {
    console.error("ImageKit Auth failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
