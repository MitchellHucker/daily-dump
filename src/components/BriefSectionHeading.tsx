/** Shared heading row for Previous dump, general headlines, etc. */
export function BriefSectionHeading({
  title,
  timestamp,
}: {
  title: string;
  timestamp?: string | null;
}) {
  return (
    <div className="mb-4 flex justify-between border-l-2 border-[var(--amber)] pl-3 font-mono uppercase tracking-[0.06em]">
      <span className="text-[10px] font-semibold text-[var(--ink-mid)]">{title}</span>
      {timestamp ? <span className="text-[9px] text-stone-500">{timestamp}</span> : null}
    </div>
  );
}
