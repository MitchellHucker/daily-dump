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
          href="/sign-up"
          prefetch={false}
          className="min-h-11 w-full rounded-[var(--radius)] bg-[var(--ink)] px-4 py-3 text-center font-mono text-[12px] font-semibold tracking-[0.04em] text-[var(--bg)] transition-opacity hover:opacity-90"
        >
          Get started →
        </Link>

        <div className="mt-[14px] text-center font-sans text-[12px] font-light text-[var(--ink-light)]">
          Already have an account?{" "}
          <Link href="/sign-in" prefetch={false} className="font-medium text-[var(--amber)]">
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
