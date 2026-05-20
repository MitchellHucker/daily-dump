"use client";

import { Suspense } from "react";
import { UserButton, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { BriefView } from "@/components/BriefView";
import { FeedbackPanel } from "@/components/FeedbackPanel";
import { GeneralNewsHeadlines } from "@/components/GeneralNewsHeadlines";
import { NudgeCard } from "@/components/NudgeCard";
import { PreviousDumpSection } from "@/components/PreviousDumpSection";
import { ProfileBar } from "@/components/ProfileBar";
import { mapGeneralNewsToStories, type GeneralNewsArticle } from "@/lib/generalNews";
import { useInteractionTracker, type NudgeCandidate } from "@/lib/interactions";
import type { Story } from "@/lib/types";
import { TOPIC_OPTIONS_BY_ID, type ProfileTopicPreference } from "@/lib/onboarding";
import { PROFILES, type Profile } from "@/lib/profiles";
import { STUB_BRIEF, type Brief } from "@/lib/stubs";

type Status = "idle" | "loading" | "done" | "error";

type SseFrame = { event: string; data: string };

type CachedBrief = {
  id: string;
  content: Brief;
  generated_at: string | null;
  date: string;
};

type BriefsResponse = {
  date: string;
  todayBrief: CachedBrief | null;
  currentBrief: CachedBrief | null;
  previousBrief: CachedBrief | null;
  devMode: boolean;
};

type UserProfileResponse = {
  profile: {
    topics: ProfileTopicPreference[];
  } | null;
};

const USER_PROFILE_ID = "user-profile";

const USER_PROFILE_BUTTON: Profile = {
  id: USER_PROFILE_ID,
  name: "Your Profile",
  initials: "YP",
  role: "Saved onboarding topics",
  accent: "#c8860a",
  sections: [],
  prompt: () => "",
};

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

function formatTime(dateString?: string | null) {
  const date = dateString ? new Date(dateString) : new Date();
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(dateString?: string | null) {
  const date = dateString ? new Date(dateString) : new Date();
  return date.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function formatUtcResetCountdown() {
  const now = new Date();
  const nextUtcMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  const diffMs = Math.max(0, nextUtcMidnight - now.getTime());
  const totalMinutes = Math.ceil(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
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

function AppHeader({ today, devMode }: { today: string; devMode: boolean }) {
  return (
    <header className="sticky top-0 z-[100] flex items-center justify-between border-b border-[var(--rule)] bg-[var(--bg)] px-5 py-[11px]">
      <div className="font-heading text-[18px] font-extrabold tracking-[-0.4px]">
        Daily<span className="text-[var(--amber)]">.</span>Dump
      </div>
      <div className="flex items-center gap-2">
        {devMode ? (
          <div className="rounded-full border border-[var(--amber)] bg-[var(--amber-bg)] px-2 py-[5px] font-mono text-[8px] font-semibold uppercase tracking-[0.12em] text-[var(--amber)]">
            Dev mode
          </div>
        ) : null}
        <div className="font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--ink-ghost)]">{today}</div>
        <Suspense fallback={<span className="inline-block size-8 shrink-0 rounded-full bg-[var(--rule)]" aria-hidden />}>
          <UserButton />
        </Suspense>
      </div>
    </header>
  );
}

export function BriefClient() {
  const router = useRouter();
  const { user } = useUser();
  const [active, setActive] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [brief, setBrief] = useState<Brief | null>(null);
  const [err, setErr] = useState("");
  const [genTime, setGenTime] = useState<string | null>(null);
  const today = useClientToday();
  const [liveStatus, setLiveStatus] = useState("");
  const [isCacheLoading, setIsCacheLoading] = useState(true);
  const [hasTodayBrief, setHasTodayBrief] = useState(false);
  const [currentBrief, setCurrentBrief] = useState<CachedBrief | null>(null);
  const [previousBrief, setPreviousBrief] = useState<CachedBrief | null>(null);
  const [devMode, setDevMode] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfileResponse["profile"]>(null);
  const [todayDate, setTodayDate] = useState("");
  const [resetCountdown, setResetCountdown] = useState(formatUtcResetCountdown);
  const [dismissedNudges, setDismissedNudges] = useState<Set<string>>(new Set());
  const [trackedEntities, setTrackedEntities] = useState<Set<string>>(new Set());
  const [nudgeAccepted, setNudgeAccepted] = useState<Record<string, string>>({});
  const [nudgePlacement, setNudgePlacement] = useState<NudgeCandidate | null>(null);
  const [generalNewsStories, setGeneralNewsStories] = useState<Story[]>([]);
  const [generalNewsLoading, setGeneralNewsLoading] = useState(true);

  const { track, getNudge, dismissNudge, markNudgeSessionAnswered } = useInteractionTracker();
  const nudgeSessionAnswered = useRef(false);

  const activeProfile = devMode && active && active !== USER_PROFILE_ID ? PROFILES[active as keyof typeof PROFILES] : null;
  const canForceRegenerate = devMode && active !== "preview";
  const acceptedCount = Object.keys(nudgeAccepted).length;

  const clerkFeedbackName =
    user?.fullName?.trim() ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "You";

  const feedbackProfileName =
    devMode && active === "preview"
      ? PROFILES.preview.name
      : devMode && active === "mitchell"
        ? PROFILES.mitchell.name
        : devMode && active === "ralitsa"
          ? PROFILES.ralitsa.name
          : clerkFeedbackName;

  /** Latest dump UI only when today's brief exists (or Preview stub). Avoids showing yesterday as "Latest dump". */
  const showBriefComplete =
    status === "done" &&
    brief &&
    (hasTodayBrief || Boolean(devMode && active === "preview")) &&
    (Boolean(userProfile) || Boolean(devMode && active === "preview"));

  useEffect(() => {
    let cancelled = false;

    async function loadBriefs() {
      setIsCacheLoading(true);
      try {
        const [briefsRes, profileRes, generalNewsRes] = await Promise.all([
          fetch("/api/briefs", { cache: "no-store" }),
          fetch("/api/profile", { cache: "no-store" }),
          fetch("/api/general-news", { cache: "no-store" }),
        ]);
        if (!briefsRes.ok) throw new Error(`HTTP ${briefsRes.status}`);
        if (!profileRes.ok) throw new Error(`HTTP ${profileRes.status}`);

        const data = (await briefsRes.json()) as BriefsResponse;
        const profileData = (await profileRes.json()) as UserProfileResponse;
        if (cancelled) return;

        if (generalNewsRes.ok) {
          const generalData = (await generalNewsRes.json()) as { articles?: GeneralNewsArticle[] };
          setGeneralNewsStories(mapGeneralNewsToStories(generalData.articles ?? []));
        }
        setGeneralNewsLoading(false);

        setTodayDate(data.date);
        setDevMode(data.devMode);
        setUserProfile(profileData.profile);
        if (data.devMode && profileData.profile) setActive((prev) => prev ?? USER_PROFILE_ID);
        setCurrentBrief(data.currentBrief);
        setPreviousBrief(data.previousBrief);

        if (data.todayBrief) {
          setBrief(data.todayBrief.content);
          setGenTime(formatTime(data.todayBrief.generated_at));
          setHasTodayBrief(true);
          setResetCountdown(formatUtcResetCountdown());
          setStatus("done");
        } else {
          setHasTodayBrief(false);
          setBrief(null);
          setGenTime(null);
          setStatus("idle");
        }
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        setErr(`Failed to load cached briefs: ${msg}`);
        setStatus("error");
        setGeneralNewsLoading(false);
      } finally {
        if (!cancelled) setIsCacheLoading(false);
      }
    }

    loadBriefs();

    return () => {
      cancelled = true;
    };
  }, []);

  /** Server page should gate this, but post–sign-in client navigations can still mount Brief with no saved profile — send users to onboarding instead of a blank main. */
  useEffect(() => {
    if (isCacheLoading) return;
    if (devMode) return;
    if (userProfile?.topics && userProfile.topics.length > 0) return;
    router.replace("/onboarding");
  }, [isCacheLoading, devMode, userProfile, router]);

  useEffect(() => {
    if (!hasTodayBrief) return;

    const interval = window.setInterval(() => {
      setResetCountdown(formatUtcResetCountdown());
    }, 60000);

    return () => window.clearInterval(interval);
  }, [hasTodayBrief]);

  const checkForNudge = useCallback(() => {
    if (nudgeSessionAnswered.current) return;

    const candidate = getNudge();
    if (!candidate || dismissedNudges.has(candidate.entityKey)) return;

    setNudgePlacement((prev) => {
      if (prev?.entityKey === candidate.entityKey && prev.storyKey === candidate.storyKey) return prev;
      return candidate;
    });
  }, [getNudge, dismissedNudges]);

  const handleExpand = useCallback(
    (entities: string[], storyKey: string) => {
      track("expand", entities, storyKey);
      setTimeout(checkForNudge, 100);
    },
    [track, checkForNudge],
  );

  const handleFollow = useCallback(
    (entities: string[], storyKey: string) => {
      track("follow", entities, storyKey);
      setTrackedEntities((prev) => new Set([...prev, ...entities]));
      setTimeout(checkForNudge, 100);
    },
    [track, checkForNudge],
  );

  const handleTrackEntity = useCallback(
    (entity: string, storyKey: string) => {
      track("follow", [entity], storyKey);
      setTrackedEntities((prev) => new Set([...prev, entity]));
      setTimeout(checkForNudge, 100);
    },
    [track, checkForNudge],
  );

  const clearNudgePlacement = useCallback(
    (entityKey: string) => {
      nudgeSessionAnswered.current = true;
      markNudgeSessionAnswered();
      dismissNudge(entityKey);
      setDismissedNudges((p) => new Set([...p, entityKey]));
      setNudgePlacement(null);
    },
    [dismissNudge, markNudgeSessionAnswered],
  );

  const handleNudgeYes = (key: string) => {
    setNudgeAccepted((p) => ({ ...p, [key]: "more" }));
    clearNudgePlacement(key);
  };

  const handleNudgeCustom = (key: string, text: string) => {
    setNudgeAccepted((p) => ({ ...p, [key]: text }));
    clearNudgePlacement(key);
  };

  const handleNudgeNo = (key: string) => {
    clearNudgePlacement(key);
  };

  const renderInlineNudge = useCallback(
    (storyKey: string) => {
      if (!nudgePlacement || nudgePlacement.storyKey !== storyKey) return null;
      const { entityKey } = nudgePlacement;
      return (
        <NudgeCard
          key={`${entityKey}-${storyKey}`}
          entityKey={entityKey}
          accent="var(--amber)"
          inline
          onYes={() => handleNudgeYes(entityKey)}
          onCustom={(text) => handleNudgeCustom(entityKey, text)}
          onNo={() => handleNudgeNo(entityKey)}
        />
      );
    },
    [nudgePlacement],
  );

  const select = (id: string) => {
    if (active === id) return;
    setActive(id);
    if (status !== "done") {
      setStatus("idle");
      setBrief(null);
    }
    setNudgePlacement(null);
    setErr("");
    setLiveStatus("");
  };

  const generate = async ({ forceRegenerate = false }: { forceRegenerate?: boolean } = {}) => {
    const p = activeProfile;
    setStatus("loading");
    setBrief(null);
    setErr("");
    setNudgePlacement(null);
    setLiveStatus("Starting…");

    if (p?.isStub) {
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
        body: JSON.stringify({ profileId: p?.id, forceRegenerate }),
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
            const generatedAt = new Date().toISOString();
            setBrief(brief);
            setGenTime(formatTime(generatedAt));
            setLiveStatus("");
            setStatus("done");
            if (currentBrief) setPreviousBrief(currentBrief);
            setCurrentBrief({
              id: `local-${generatedAt}`,
              content: brief,
              generated_at: generatedAt,
              date: todayDate || generatedAt.slice(0, 10),
            });
            setHasTodayBrief(true);
            setResetCountdown(formatUtcResetCountdown());
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

  const displayName = activeProfile?.name ?? clerkFeedbackName;
  const firstName = displayName.split(" ")[0] ?? "there";
  const showGeneralNews = generalNewsLoading || generalNewsStories.length > 0;
  const generateButtonTopicSummary =
    userProfile?.topics && userProfile.topics.length > 0
      ? userProfile.topics.map((topic) => topic.label).join(" · ")
      : activeProfile?.sections.map((section) => section.label).join(" · ") || "Your saved topics";

  const showProfileGateSpinner =
    status === "idle" && (isCacheLoading || (!devMode && !(userProfile?.topics && userProfile.topics.length > 0)));

  /** Yesterday (or earlier) dump in Previous dump chrome — same whether or not today's brief exists. */
  const previousDumpDisplay =
    showBriefComplete && previousBrief
      ? { brief: previousBrief.content, generatedAt: previousBrief.generated_at }
      : !hasTodayBrief && currentBrief
        ? { brief: currentBrief.content, generatedAt: currentBrief.generated_at }
        : null;

  const previousDumpSection =
    previousDumpDisplay && !showProfileGateSpinner ? (
      <PreviousDumpSection
        brief={previousDumpDisplay.brief}
        generatedAtLabel={formatDateTime(previousDumpDisplay.generatedAt)}
        onExpand={handleExpand}
        onFollow={handleFollow}
        onTrackEntity={handleTrackEntity}
        trackedEntities={trackedEntities}
        renderAfterStory={renderInlineNudge}
        className="mt-8"
      />
    ) : null;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <AppHeader today={today} devMode={devMode} />

      {devMode ? (
        <ProfileBar
          profiles={userProfile ? [USER_PROFILE_BUTTON, ...Object.values(PROFILES)] : Object.values(PROFILES)}
          activeProfileId={active}
          onSelect={select}
        />
      ) : null}

      <main className="mx-auto max-w-[680px] px-5 pb-20 pt-5">
        {showProfileGateSpinner ? (
          <div className="py-20 text-center">
            <div className="mx-auto mb-5 h-8 w-8 animate-[dailyDumpSpin_0.8s_linear_infinite] rounded-full border-2 border-[var(--rule)] border-t-[var(--amber)]" />
            <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--ink-mid)]">
              {!isCacheLoading && !devMode ? "Setting up your profile…" : "Checking today's brief…"}
            </div>
          </div>
        ) : null}

        {!showProfileGateSpinner && status === "idle" && (userProfile || devMode) && (
          <div>
            <div className="mb-1 font-heading text-[28px] font-bold tracking-[-0.5px]">Morning, {firstName}.</div>
            <p className="mb-5 font-sans text-[13px] font-light text-[var(--ink-light)]">Your brief is ready to generate.</p>
            <button
              type="button"
              className="mb-6 flex w-full items-center justify-between gap-6 rounded-[var(--radius)] bg-[var(--ink)] px-[30px] py-[24px] text-left transition-opacity hover:opacity-90"
              onClick={() => generate()}
            >
              <span className="min-w-0">
                <span className="block font-sans text-[18px] font-bold leading-[1.2] tracking-[-0.2px] text-[var(--bg)]">
                  Get today&apos;s <span className="text-[var(--amber)]">Dump</span>
                </span>
                <span className="mt-[6px] block font-sans text-[13px] font-medium leading-[1.3] text-[rgba(247,246,242,0.45)]">
                  {generateButtonTopicSummary}
                </span>
              </span>
              <span aria-hidden="true" className="shrink-0 font-sans text-[26px] font-semibold leading-none text-[var(--amber)]">
                →
              </span>
            </button>
            {showGeneralNews ? (
              <GeneralNewsHeadlines stories={generalNewsStories} loading={generalNewsLoading} />
            ) : null}
            {previousDumpSection}
            {userProfile?.topics?.length ? (
            <section className="mt-8 border-t border-[var(--rule)] pt-6">
              <div className="rounded-[var(--radius)] bg-[#f0ede6] px-[14px] py-3">
                <div className="mb-2 font-mono text-[8px] font-medium uppercase tracking-[0.16em] text-[var(--ink-ghost)]">Your topics</div>
                <div className="divide-y divide-[var(--rule)]">
                  {userProfile.topics.map((topic) => {
                    const option = TOPIC_OPTIONS_BY_ID[topic.id];
                    return (
                      <div key={topic.id} className="py-[7px]">
                        <div className="font-sans text-[11px] font-medium leading-[1.35] text-[var(--ink-mid)]">
                          {option?.icon ?? "•"} {topic.label}
                          {topic.interests.length ? ` · ${topic.interests.join(", ")}` : ""}
                        </div>
                        <div className="font-sans text-[10px] font-light leading-[1.4] text-[var(--ink-ghost)]">
                          {topic.lens || "Broad general coverage"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
            ) : null}
          </div>
        )}

        {status === "loading" && (
          <div>
            <div className="py-20 text-center">
              <div className="mx-auto mb-5 h-8 w-8 animate-[dailyDumpSpin_0.8s_linear_infinite] rounded-full border-2 border-[var(--rule)] border-t-[var(--amber)]" />
              <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--ink-mid)]">{liveStatus || "Starting…"}</div>
              <div className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--ink-light)]">Searching · Compiling · Writing</div>
            </div>
            {showGeneralNews ? (
              <GeneralNewsHeadlines stories={generalNewsStories} loading={generalNewsLoading} />
            ) : null}
            {previousDumpSection}
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
                onClick={() => generate()}
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {showBriefComplete ? (
          <div>
            <div className="mb-3 flex justify-between font-mono text-[9px] uppercase tracking-[0.06em] text-[var(--ink-ghost)]">
              <span>
                {activeProfile?.isStub ? "Preview Brief" : "Latest dump"}
                {activeProfile?.isStub ? <span className="ml-2 text-[var(--amber)]">Stub</span> : null}
                {!activeProfile?.isStub && acceptedCount > 0 ? <span className="ml-2 text-[var(--amber)]" title="Personalisation active">•</span> : null}
              </span>
              <span>{genTime}</span>
            </div>

            <div className="mb-4 flex flex-wrap justify-end gap-2">
              {hasTodayBrief ? (
                <div className="rounded-[var(--radius)] border border-[var(--rule)] bg-[#f0ede6] px-4 py-[9px] text-right font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-light)]">
                  Already generated today
                  <span className="ml-2 normal-case text-[var(--ink-ghost)]">Resets in {resetCountdown}</span>
                </div>
              ) : (
                <button
                  type="button"
                  className="min-h-11 rounded-[var(--radius)] border border-[var(--rule)] bg-transparent px-4 py-[8px] font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-light)] transition-colors hover:border-[var(--ink-light)] hover:text-[var(--ink-mid)]"
                  onClick={() => generate()}
                >
                  Generate today&apos;s brief
                </button>
              )}
              {canForceRegenerate ? (
                <button
                  type="button"
                  className="min-h-11 rounded-[var(--radius)] border border-[var(--amber)] bg-transparent px-4 py-[8px] font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--amber)] transition-opacity hover:opacity-80"
                  onClick={() => generate({ forceRegenerate: true })}
                >
                  Force regenerate latest
                </button>
              ) : null}
            </div>

            <BriefView
              brief={brief}
              accent="var(--amber)"
              storyKeyPrefix="latest"
              onExpand={handleExpand}
              onFollow={handleFollow}
              onTrackEntity={handleTrackEntity}
              trackedEntities={trackedEntities}
              renderAfterStory={renderInlineNudge}
            />

            {showGeneralNews ? (
              <GeneralNewsHeadlines stories={generalNewsStories} loading={generalNewsLoading} className="mt-8" />
            ) : null}

            {previousDumpSection}

            <FeedbackPanel profileName={feedbackProfileName} />

            <div className="mt-6 rounded-[var(--radius)] border border-[var(--rule)] p-[14px] font-sans text-[10px] font-light leading-[1.7] text-[var(--ink-ghost)]">
              AI-generated from live web sources. Not financial, legal, or professional advice. Always verify before acting.
              Personalisation tracks topic engagement — not source lean.
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
