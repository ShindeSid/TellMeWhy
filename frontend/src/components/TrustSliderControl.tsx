import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export function TrustSliderControl() {
  const value = useWorkspaceStore((s) => s.trustSliderValue);
  const setValue = useWorkspaceStore((s) => s.setTrustSliderValue);
  const status = useWorkspaceStore((s) => s.status);

  const isBusy = status === "routing" || status === "generating";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs text-neutral-500" id="trust-slider-label">
        <span>Fast</span>
        <span>Reliable</span>
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
    </div>
  );
}
