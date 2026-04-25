import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-[360px] min-h-[620px] flex flex-col items-center justify-center">
        <div className="font-heading text-[42px] font-extrabold tracking-[-1.2px] leading-none mb-[6px]">
          Daily<span className="text-[var(--amber)]">.</span>Dump
        </div>
        <p className="font-sans text-[14px] leading-[1.55] font-light text-[var(--ink-light)] text-center max-w-[210px] mb-10">
          Your news, personalised.
          <br />
          Every morning.
        </p>

        <Link
          href="/onboarding/topics"
          className="min-h-11 w-full flex items-center justify-center gap-2 rounded-[var(--radius)] border border-[var(--rule)] bg-white px-4 py-[11px] font-mono text-[12px] font-medium text-[var(--ink)] transition-colors hover:border-[var(--ink-light)]"
        >
          <span className="h-[14px] w-[14px] rounded-full bg-[linear-gradient(135deg,#4285f4_25%,#ea4335_25%_50%,#fbbc05_50%_75%,#34a853_75%)]" />
          Continue with Google
        </Link>

        <div className="my-[14px] flex w-full items-center gap-3">
          <div className="h-px flex-1 bg-[var(--rule)]" />
          <span className="font-mono text-[10px] text-[var(--ink-ghost)]">or</span>
          <div className="h-px flex-1 bg-[var(--rule)]" />
        </div>

        <input
          aria-label="Email address"
          className="mb-2 min-h-11 w-full rounded-[var(--radius)] border border-[var(--rule)] bg-white px-3 py-[10px] font-sans text-[12px] font-light text-[var(--ink)] outline-none placeholder:text-[var(--ink-light)] focus:border-[var(--ink-light)]"
          placeholder="Email address"
          type="email"
        />
        <input
          aria-label="Password"
          className="mb-[14px] min-h-11 w-full rounded-[var(--radius)] border border-[var(--rule)] bg-white px-3 py-[10px] font-sans text-[12px] font-light text-[var(--ink)] outline-none placeholder:text-[var(--ink-light)] focus:border-[var(--ink-light)]"
          placeholder="Password"
          type="password"
        />

        <Link
          href="/onboarding/topics"
          className="min-h-11 w-full rounded-[var(--radius)] bg-[var(--ink)] px-4 py-3 text-center font-mono text-[12px] font-semibold tracking-[0.04em] text-[var(--bg)] transition-opacity hover:opacity-90"
        >
          Create account →
        </Link>

        <div className="mt-[14px] text-center font-sans text-[12px] font-light text-[var(--ink-light)]">
          Already have an account?{" "}
          <Link href="/brief" className="font-medium text-[var(--amber)]">
            Sign in
          </Link>
        </div>

        <p className="mt-5 max-w-[240px] text-center font-sans text-[10px] font-light leading-[1.6] text-[var(--ink-ghost)]">
          By continuing you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </main>
  );
}
