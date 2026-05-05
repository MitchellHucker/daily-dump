import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)] px-6 py-10 text-[var(--ink)]">
      <div className="mx-auto flex min-h-[620px] w-full max-w-[420px] flex-col items-center justify-center">
        <Link
          href="/"
          className="mb-8 font-heading text-[34px] font-extrabold leading-none tracking-[-1px]"
        >
          Daily<span className="text-[var(--amber)]">.</span>Dump
        </Link>
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          fallbackRedirectUrl="/brief"
          forceRedirectUrl="/brief"
        />
      </div>
    </main>
  );
}
