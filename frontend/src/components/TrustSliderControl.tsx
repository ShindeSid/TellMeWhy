import { IconShield, IconZap } from "@/components/icons";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

function describeValue(value: number): string {
  if (value < 0.3) return "Prioritizing speed - quicker, less thorough answers";
  if (value > 0.7) return "Prioritizing reliability - slower, more carefully checked answers";
  return "Balanced between speed and thoroughness";
}

export function TrustSliderControl() {
  const value = useWorkspaceStore((s) => s.trustSliderValue);
  const setValue = useWorkspaceStore((s) => s.setTrustSliderValue);
  const status = useWorkspaceStore((s) => s.status);

  const isBusy = status === "routing" || status === "generating";

  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-neutral-200/70 border-t-2 border-t-brand-400 bg-white p-4 shadow-card dark:border-neutral-700/70 dark:border-t-brand-500 dark:bg-neutral-800">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">How should we balance speed vs. reliability?</span>
        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{Math.round(value * 100)}%</span>
      </div>
      <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400" id="trust-slider-label">
        <span className="flex items-center gap-1">
          <IconZap className="h-3.5 w-3.5" /> Fast
        </span>
        <span className="flex items-center gap-1">
          <IconShield className="h-3.5 w-3.5" /> Reliable
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        disabled={isBusy}
        onChange={(e) => setValue(Number(e.target.value))}
        aria-labelledby="trust-slider-label"
        aria-valuetext={`${Math.round(value * 100)}% toward reliable`}
        className="w-full accent-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500"
      />
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{describeValue(value)}</p>
    </div>
  );
}
