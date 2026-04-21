"use client";

import type { Profile } from "../lib/profiles";

function selectedClasses(profileId: string) {
  if (profileId === "mitchell") return "border-[#c8860a] bg-[rgba(200,134,10,0.10)]";
  if (profileId === "ralitsa") return "border-[#2a7fa8] bg-[rgba(42,127,168,0.10)]";
  return "border-[#5a7a5a] bg-[rgba(90,122,90,0.10)]";
}

function avatarStyle(profile: Profile) {
  if (profile.isStub) return { background: "rgba(90,122,90,0.2)", color: "#5a7a5a" };
  if (profile.id === "mitchell") return { background: "rgba(200,134,10,0.2)", color: "#c8860a" };
  return { background: "rgba(42,127,168,0.2)", color: "#2a7fa8" };
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
    <div className="sticky top-[52px] z-50 border-b border-[#2a2a2a] bg-[#1a1a1a] px-5 py-[10px] flex flex-wrap gap-2">
      {profiles.map((p) => {
        const isActive = activeProfileId === p.id;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.id)}
            className={[
              "flex items-center gap-2 cursor-pointer transition-all duration-150",
              "border border-[#333] bg-transparent",
              "px-3 py-[6px] pl-[6px]",
              "font-sans",
              "hover:border-[#555]",
              isActive ? selectedClasses(p.id) : "",
            ].join(" ")}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-mono text-[10px] font-medium"
              style={avatarStyle(p)}
            >
              {p.initials}
            </div>
            <div className="text-left">
              <span className={["text-xs font-medium", p.isStub ? "text-[#8a9a8a]" : "text-[#e0ddd8]"].join(" ")}>
                {p.name}
              </span>
              <span className="block font-mono text-[9px] tracking-[0.08em] text-[#555]">{p.role}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

