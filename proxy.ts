import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)"
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, redirectToSignIn } = await auth();

  // If user is logged in and trying to access auth pages, redirect to dashboard
  if (userId && isPublicRoute(req)) {
    const path = req.nextUrl.pathname;
    if (path.startsWith("/sign-in") || path.startsWith("/sign-up")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  if (!userId && !isPublicRoute(req)) {
    return redirectToSignIn();
  }

  const response = NextResponse.next();

  // Ngrok/dev-only workarounds. In production there's no double-compression
  // proxy in the loop, and stripping accept-encoding hurts real compression.
  if (process.env.NODE_ENV !== "production") {
    response.headers.set("ngrok-skip-browser-warning", "true");
  }

  return response;
});

export const config = {
  // Use the standard Clerk matcher
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
};
