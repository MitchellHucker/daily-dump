import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

function isProtectedRoute(pathname: string) {
  return pathname === "/brief" || pathname.startsWith("/brief/") || pathname === "/onboarding" || pathname.startsWith("/onboarding/");
}

const clerkProxy = clerkMiddleware(
  async (auth, req) => {
    const { isAuthenticated } = await auth();

    if (req.nextUrl.pathname === "/" && isAuthenticated) {
      return NextResponse.redirect(new URL("/auth/continue", req.url));
    }

    if (!isProtectedRoute(req.nextUrl.pathname)) {
      return;
    }

    if (!isAuthenticated) return NextResponse.redirect(new URL("/sign-in", req.url));
  },
  /** Without NEXT_PUBLIC_CLERK_SIGN_IN_URL in env, Clerk redirects to hosted Account Portal (*.accounts.dev). */
  (req) => ({
    signInUrl: new URL("/sign-in", req.url).href,
    signUpUrl: new URL("/sign-up", req.url).href,
  }),
);

export const proxy = clerkProxy;
export default clerkProxy;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
