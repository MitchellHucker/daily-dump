"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { BriefView } from "@/components/BriefView";
import { FeedbackPanel } from "@/components/FeedbackPanel";
import { NudgeCard } from "@/components/NudgeCard";
import { ProfileBar } from "@/components/ProfileBar";
import { useInteractionTracker } from "@/lib/interactions";
import { PROFILES } from "@/lib/profiles";
import { STUB_BRIEF, type Brief } from "@/lib/stubs";

type Status = "idle" | "loading" | "done" | "error";

type SseFrame = { event: string; data: string };

function formatToday() {
  return new Date()
    .toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
    .toUpperCase();
}

function useClientToday() {
  return useSyncExternalStore(
    () => () => {},
    formatToday,
    () => "",
  );
}

function parseSseFrames(chunk: string): { frames: SseFrame[]; rest: string } {
  const parts = chunk.split("\n\n");
  const rest = parts.pop() ?? "";
  const frames: SseFrame[] = [];

  for (const part of parts) {
    const lines = part
      .split("\n")
      .map((l) => l.trimEnd())
      .filter(Boolean);

    let event = "message";
    const dataLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith("event:")) event = line.replace("event:", "").trim();
      else if (line.startsWith("data:")) dataLines.push(line.replace("data:", "").trimStart());
    }

    frames.push({ event, data: dataLines.join("\n") });
  }

  return { frames, rest };
}

function AppHeader({ today, initials }: { today: string; initials: string }) {
  return (
    <header className="sticky top-0 z-[100] flex items-center justify-between border-b border-[var(--rule)] bg-[var(--bg)] px-5 py-[11px]">
      <div className="font-heading text-[18px] font-extrabold tracking-[-0.4px]">
        Daily<span className="text-[var(--amber)]">.</span>Dump
      </div>
      <div className="flex items-center gap-2">
        <div className="font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--ink-ghost)]">{today}</div>
        <div className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-[var(--ink)] font-mono text-[9px] font-semibold text-[var(--bg)]">
          {initials}
        </div>
      </div>
    </header>
  );
}

export default function BriefPage() {
  const [active, setActive] = useState<string | null>("mitchell");
  const [status, setStatus] = useState<Status>("idle");
  const [brief, setBrief] = useState<Brief | null>(null);
  const [err, setErr] = useState("");
  const [genTime, setGenTime] = useState<string | null>(null);
  const today = useClientToday();
  const [liveStatus, setLiveStatus] = useState("");
  const [dismissedNudges, setDismissedNudges] = useState<Set<string>>(new Set());
  const [trackedEntities, setTrackedEntities] = useState<Set<string>>(new Set());
  const [nudgeAccepted, setNudgeAccepted] = useState<Record<string, string>>({});
  const [nudgeKey, setNudgeKey] = useState<string | null>(null);

  const { track, getNudge, dismissNudge } = useInteractionTracker();

  const profile = active ? PROFILES[active as keyof typeof PROFILES] : null;
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
    setLiveStatus("");
  };

  const generate = async () => {
    if (!active) return;
    const p = PROFILES[active as keyof typeof PROFILES];
    setStatus("loading");
    setBrief(null);
    setErr("");
    setNudgeKey(null);
    setLiveStatus("Starting…");

    if (p.isStub) {
      setTimeout(() => {
        setBrief(STUB_BRIEF);
        setGenTime(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
        setStatus("done");
        setLiveStatus("");
      }, 400);
      return;
    }

    try {
      const aborter = new AbortController();
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: p.id }),
        signal: aborter.signal,
      });

      if (!res.ok) {
        const data: unknown = await res.json().catch(() => ({}));
        const msg = typeof (data as { error?: unknown })?.error === "string" ? String((data as { error?: unknown }).error) : `HTTP ${res.status}`;
        throw new Error(msg);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Missing response body stream.");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parsed = parseSseFrames(buffer);
        buffer = parsed.rest;

        for (const frame of parsed.frames) {
          if (frame.event === "status") {
            setLiveStatus(frame.data);
          } else if (frame.event === "complete") {
            const brief = JSON.parse(frame.data) as Brief;
            setBrief(brief);
            setGenTime(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
            setLiveStatus("");
            setStatus("done");
            aborter.abort();
            return;
          } else if (frame.event === "error") {
            throw new Error(frame.data || "Generation failed.");
          }
        }
      }

      throw new Error("Stream ended before completion.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg);
      setStatus("error");
      setLiveStatus("");
    }
  };

  const firstName = profile?.name.split(" ")[0] ?? "there";
  const initials = profile?.initials ?? "MH";

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <AppHeader today={today} initials={initials} />

      <ProfileBar profiles={Object.values(PROFILES)} activeProfileId={active} onSelect={select} />

      <main className="mx-auto max-w-[680px] px-5 pb-20 pt-5">
        {active && status === "idle" && profile && (
          <div>
            <div className="mb-1 font-heading text-[28px] font-bold tracking-[-0.5px]">Morning, {firstName}.</div>
            <p className="mb-5 font-sans text-[13px] font-light text-[var(--ink-light)]">Your brief is ready to generate.</p>
            <button
              type="button"
              className="mb-[18px] min-h-11 w-full rounded-[var(--radius)] bg-[var(--ink)] px-5 py-[13px] text-center font-mono text-[12px] font-semibold tracking-[0.04em] text-[var(--bg)] transition-opacity hover:opacity-90"
              onClick={generate}
            >
              Get today&apos;s <span className="text-[var(--amber)]">Dump</span> →
            </button>
            <div className="rounded-[var(--radius)] bg-[#f0ede6] px-[14px] py-3">
              <div className="mb-2 font-mono text-[8px] font-medium uppercase tracking-[0.16em] text-[var(--ink-ghost)]">Your topics</div>
              <div className="border-b border-[#e8e4dc] py-[7px]">
                <div className="font-sans text-[11px] font-medium leading-[1.35] text-[var(--ink-mid)]">⚡ Technology · AI, LegalTech</div>
                <div className="font-sans text-[10px] font-light leading-[1.4] text-[var(--ink-ghost)]">Personalised daily news lens</div>
              </div>
              <div className="border-b border-[#e8e4dc] py-[7px]">
                <div className="font-sans text-[11px] font-medium leading-[1.35] text-[var(--ink-mid)]">📈 Finance · Markets</div>
                <div className="font-sans text-[10px] font-light leading-[1.4] text-[var(--ink-ghost)]">Macro, companies, and commercial signals</div>
              </div>
              <div className="pt-[7px]">
                <div className="font-sans text-[11px] font-medium leading-[1.35] text-[var(--ink-mid)]">🌍 Geopolitics</div>
                <div className="font-sans text-[10px] font-light leading-[1.4] text-[var(--ink-ghost)]">Major world events and downstream impact</div>
              </div>
            </div>
          </div>
        )}

        {status === "loading" && (
          <div className="py-20 text-center">
            <div className="mx-auto mb-5 h-8 w-8 animate-[dailyDumpSpin_0.8s_linear_infinite] rounded-full border-2 border-[var(--rule)] border-t-[var(--amber)]" />
            <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--ink-mid)]">{liveStatus || "Starting…"}</div>
            <div className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--ink-light)]">Searching · Compiling · Writing</div>
          </div>
        )}

        {status === "error" && (
          <div>
            <div className="mt-6 rounded-[var(--radius)] border border-[#eed0c7] border-l-2 border-l-[#cc3333] bg-[#fff8f6] px-4 py-[14px] font-sans text-[12px] leading-[1.6] text-[#993333]">
              Error: {err}
            </div>
            <div className="mt-3 text-right">
              <button
                type="button"
                className="min-h-11 rounded-[var(--radius)] border border-[var(--rule)] bg-transparent px-4 py-[8px] font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-light)] transition-colors hover:border-[var(--ink-light)] hover:text-[var(--ink-mid)]"
                onClick={generate}
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {status === "done" && brief && profile && (
          <div>
            <div className="mb-3 flex justify-between font-mono text-[9px] uppercase tracking-[0.06em] text-[var(--ink-ghost)]">
              <span>
                {profile.isStub ? "Preview Brief" : `${firstName}'s Brief`}
                {profile.isStub ? <span className="ml-2 text-[var(--amber)]">Stub</span> : null}
                {!profile.isStub && acceptedCount > 0 ? <span className="ml-2 text-[var(--amber)]" title="Personalisation active">•</span> : null}
              </span>
              <span>{genTime}</span>
            </div>

            <div className="mb-4 flex justify-end">
              <button
                type="button"
                className="min-h-11 rounded-[var(--radius)] border border-[var(--rule)] bg-transparent px-4 py-[8px] font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-light)] transition-colors hover:border-[var(--ink-light)] hover:text-[var(--ink-mid)]"
                onClick={generate}
              >
                Refresh
              </button>
            </div>

            {nudgeKey ? (
              <NudgeCard
                entityKey={nudgeKey}
                accent="var(--amber)"
                onYes={() => handleNudgeYes(nudgeKey)}
                onCustom={(text) => handleNudgeCustom(nudgeKey, text)}
                onNo={() => handleNudgeNo(nudgeKey)}
              />
            ) : null}

            <BriefView
              brief={brief}
              accent="var(--amber)"
              onExpand={handleExpand}
              onFollow={handleFollow}
              onTrackEntity={handleTrackEntity}
              trackedEntities={trackedEntities}
            />

            {!profile.isStub ? <FeedbackPanel profile={profile} /> : null}

            <div className="mt-6 rounded-[var(--radius)] border border-[var(--rule)] p-[14px] font-sans text-[10px] font-light leading-[1.7] text-[var(--ink-ghost)]">
              AI-generated from live web sources. Not financial, legal, or professional advice. Always verify before acting.
              Personalisation tracks topic engagement — not source lean.
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

