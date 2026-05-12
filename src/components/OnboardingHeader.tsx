"use client";

import { Suspense } from "react";
import { UserButton } from "@clerk/nextjs";

/** Matches brief chrome (`BriefClient` AppHeader): logo left, account menu — sign-out — top right. */
export function OnboardingHeader() {
  return (
    <header className="sticky top-0 z-[100] flex items-center justify-between border-b border-[var(--rule)] bg-[var(--bg)] px-5 py-[11px]">
      <div className="font-heading text-[18px] font-extrabold tracking-[-0.4px]">
        Daily<span className="text-[var(--amber)]">.</span>Dump
      </div>
      <Suspense fallback={<span className="inline-block size-8 shrink-0 rounded-full bg-[var(--rule)]" aria-hidden />}>
        <UserButton />
      </Suspense>
    </header>
  );
}
