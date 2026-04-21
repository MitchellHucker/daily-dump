"use client";

import { useCallback, useState } from "react";
import { BriefView } from "../components/BriefView";
import { FeedbackPanel } from "../components/FeedbackPanel";
import { NudgeCard } from "../components/NudgeCard";
import { ProfileBar } from "../components/ProfileBar";
import { useInteractionTracker } from "../lib/interactions";
import { PROFILES } from "../lib/profiles";
import { STUB_BRIEF, type Brief } from "../lib/stubs";

type Status = "idle" | "loading" | "done" | "error";

export default function Home() {
  const [active, setActive] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [brief, setBrief] = useState<Brief | null>(null);
  const [err, setErr] = useState("");
  const [genTime, setGenTime] = useState<string | null>(null);
  const [dismissedNudges, setDismissedNudges] = useState<Set<string>>(new Set());
  const [trackedEntities, setTrackedEntities] = useState<Set<string>>(new Set());
  const [nudgeAccepted, setNudgeAccepted] = useState<Record<string, string>>({});
  const [nudgeKey, setNudgeKey] = useState<string | null>(null);

  const { track, getNudge, dismissNudge } = useInteractionTracker();

  const today = new Date()
    .toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
    .toUpperCase();

  const profile = active ? PROFILES[active as keyof typeof PROFILES] : null;
  const accent = profile?.accent || "#111";
  const acceptedCount = Object.keys(nudgeAccepted).length;

  const checkForNudge = useCallback(() => {
    const key = getNudge();
    if (key && !dismissedNudges.has(key)) setNudgeKey(key);
  }, [getNudge, dismissedNudges]);

  const handleExpand = useCallback(
    (entities: string[]) => {
      track("expand", entities);
      setTimeout(checkForNudge, 100);
    },
    [track, checkForNudge],
  );

  const handleFollow = useCallback(
    (entities: string[]) => {
      track("follow", entities);
      setTrackedEntities((prev) => new Set([...prev, ...entities]));
      setTimeout(checkForNudge, 100);
    },
    [track, checkForNudge],
  );

  const handleTrackEntity = useCallback(
    (entity: string) => {
      track("follow", [entity]);
      setTrackedEntities((prev) => new Set([...prev, entity]));
      setTimeout(checkForNudge, 100);
    },
    [track, checkForNudge],
  );

  const handleNudgeYes = (key: string) => {
    setNudgeAccepted((p) => ({ ...p, [key]: "more" }));
    dismissNudge(key);
    setDismissedNudges((p) => new Set([...p, key]));
    setNudgeKey(null);
  };

  const handleNudgeCustom = (key: string, text: string) => {
    setNudgeAccepted((p) => ({ ...p, [key]: text }));
    dismissNudge(key);
    setDismissedNudges((p) => new Set([...p, key]));
    setNudgeKey(null);
  };

  const handleNudgeNo = (key: string) => {
    dismissNudge(key);
    setDismissedNudges((p) => new Set([...p, key]));
    setNudgeKey(null);
  };

  const select = (id: string) => {
    if (active === id) return;
    setActive(id);
    setStatus("idle");
    setBrief(null);
    setNudgeKey(null);
    setErr("");
  };

  const generate = async () => {
    if (!active) return;
    const p = PROFILES[active as keyof typeof PROFILES];
    setStatus("loading");
    setBrief(null);
    setErr("");
    setNudgeKey(null);

    const delay = p.isStub ? 400 : 650;
    setTimeout(() => {
      setBrief(STUB_BRIEF);
      setGenTime(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
      setStatus("done");
    }, delay);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-[100] h-[52px] bg-[#111] grid grid-cols-[1fr_auto] items-center px-5">
        <div className="font-heading text-[18px] font-extrabold tracking-[-0.5px] text-[#f5f2ed]">
          Daily<span className="text-[#f5a623]">.</span>Dump
        </div>
        <div className="font-mono text-[10px] text-[#444] tracking-[0.08em]">{today}</div>
      </header>

      <ProfileBar profiles={Object.values(PROFILES)} activeProfileId={active} onSelect={select} />

      <main className="max-w-[680px] mx-auto px-4 pt-6 pb-20">
        {!active && (
          <div className="text-center pt-[72px] font-mono text-xs text-[#aaa] tracking-[0.12em]">SELECT A PROFILE TO BEGIN</div>
        )}

        {active && status === "idle" && profile && (
          <div className="pt-14 text-center">
            <div className="font-heading text-[28px] font-bold text-[#111] mb-[6px]">Morning, {profile.name.split(" ")[0]}.</div>
            <div className="font-mono text-[11px] text-[#999] tracking-[0.12em] mb-8">YOUR BRIEF IS WAITING</div>
            <button
              type="button"
              className="font-mono text-[11px] tracking-[0.15em] uppercase px-7 py-[13px] bg-[#111] text-[#f5f2ed] border-b-[3px] transition-opacity hover:opacity-80"
              style={{ borderBottomColor: accent }}
              onClick={generate}
            >
              Generate Today&apos;s Dump →
            </button>
          </div>
        )}

        {status === "loading" && (
          <div className="py-20 text-center">
            <div
              className="w-8 h-8 rounded-full border-2 border-[#ddd] mx-auto mb-5 animate-[dailyDumpSpin_0.8s_linear_infinite]"
              style={{ borderTopColor: accent }}
            />
            <div className="font-mono text-[11px] text-[#999] tracking-[0.15em]">SEARCHING · COMPILING · WRITING</div>
          </div>
        )}

        {status === "error" && (
          <div>
            <div className="bg-[#fff8f8] border-l-[3px] border-l-[#cc3333] px-4 py-[14px] font-mono text-[11px] text-[#993333] mt-6">
              Error: {err}
            </div>
            <div className="mt-3 text-right">
              <button
                type="button"
                className="font-mono text-[10px] tracking-[0.12em] px-3 py-[6px] bg-transparent border border-[#ddd] text-[#888] hover:border-[#999] hover:text-[#444]"
                onClick={generate}
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {status === "done" && brief && profile && (
          <div>
            <div className="pb-4 mb-1 border-b-2 border-[#111] flex justify-between items-end">
              <div className="font-heading text-[22px] font-extrabold text-[#111]">
                {profile.isStub ? "Preview Brief" : `${profile.name.split(" ")[0]}'s Brief`}
                {profile.isStub ? (
                  <span className="ml-[10px] align-middle font-mono text-[9px] tracking-[0.15em] px-2 py-[2px] border bg-[rgba(90,122,90,0.12)] text-[#5a7a5a] border-[#5a7a5a]">
                    STUB
                  </span>
                ) : null}
                {!profile.isStub && acceptedCount > 0 ? (
                  <span
                    className="inline-block w-[5px] h-[5px] rounded-full bg-[#4a9a4a] ml-[6px] align-middle"
                    title="Personalisation active"
                  />
                ) : null}
              </div>
              <div className="font-mono text-[10px] text-[#999] tracking-[0.08em] text-right">
                {genTime}
                <br />
                {today}
              </div>
            </div>

            <div className="flex justify-end mb-3">
              <button
                type="button"
                className="font-mono text-[10px] tracking-[0.12em] px-3 py-[6px] bg-transparent border border-[#ddd] text-[#888] hover:border-[#999] hover:text-[#444]"
                onClick={generate}
              >
                ↻ Refresh
              </button>
            </div>

            {nudgeKey ? (
              <NudgeCard
                entityKey={nudgeKey}
                accent={accent}
                onYes={() => handleNudgeYes(nudgeKey)}
                onCustom={(text) => handleNudgeCustom(nudgeKey, text)}
                onNo={() => handleNudgeNo(nudgeKey)}
              />
            ) : null}

            <BriefView
              brief={brief}
              accent={accent}
              onExpand={handleExpand}
              onFollow={handleFollow}
              onTrackEntity={handleTrackEntity}
              trackedEntities={trackedEntities}
            />

            {!profile.isStub ? <FeedbackPanel profile={profile} /> : null}

            <div className="mt-6 p-[14px] border border-[#e0dcd4] font-mono text-[10px] text-[#bbb] leading-[1.7]">
              AI-generated from live web sources. Not financial, legal, or professional advice. Always verify before acting.
              Personalisation tracks topic engagement — not source lean.
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
