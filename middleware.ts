import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher(["/todo(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const authData = await auth();
  const { userId } = authData;

  if (!userId && isProtectedRoute(req)) {
    return authData.redirectToSignIn({ returnBackUrl: "/login" });
  }

  if (userId && isProtectedRoute(req)) {
    return NextResponse.next();
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"]
};