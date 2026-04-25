"use client";

import type { Profile } from "../lib/profiles";

function selectedClasses(profileId: string) {
  if (profileId === "mitchell") return "border-[var(--amber)] bg-[var(--amber-bg)] text-[var(--amber)]";
  if (profileId === "ralitsa") return "border-[var(--amber)] bg-[var(--amber-bg)] text-[var(--amber)]";
  return "border-[var(--amber)] bg-[var(--amber-bg)] text-[var(--amber)]";
}

function avatarStyle(profile: Profile) {
  if (profile.isStub) return { background: "#f0ede6", color: "#999" };
  return { background: "#141210", color: "#f7f6f2" };
}

export function ProfileBar({
  profiles,
  activeProfileId,
  onSelect,
}: {
  profiles: Profile[];
  activeProfileId: string | null;
  onSelect: (profileId: string) => void;
}) {
  return (
    <div className="sticky top-[49px] z-50 flex flex-wrap gap-[6px] border-b border-[var(--rule)] bg-[var(--bg)] px-5 py-[10px]">
      {profiles.map((p) => {
        const isActive = activeProfileId === p.id;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.id)}
            className={[
              "flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--radius)] border px-3 py-[6px] pl-[6px] transition-colors duration-150",
              "border-[var(--rule)] bg-white font-sans hover:border-[var(--ink-light)]",
              isActive ? selectedClasses(p.id) : "text-[var(--ink-mid)]",
            ].join(" ")}
          >
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-medium"
              style={avatarStyle(p)}
            >
              {p.initials}
            </div>
            <div className="text-left">
              <span className="text-[11px] font-medium">{p.name}</span>
              <span className="block font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--ink-ghost)]">{p.role}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

