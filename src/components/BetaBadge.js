export default function BetaBadge({ darkMode = true, className = "" }) {
  const colors = darkMode
    ? "border-violet-300/20 bg-violet-400/10 text-violet-200"
    : "border-violet-300 bg-violet-50 text-violet-700";

  return (
    <span
      aria-label="Beta sürümü"
      title="KineticAI beta sürümünde"
      className={`inline-flex shrink-0 items-center rounded-full border px-1.5 py-0.5 text-[9px] font-bold leading-none tracking-[0.08em] ${colors} ${className}`}
    >
      BETA
    </span>
  );
}
