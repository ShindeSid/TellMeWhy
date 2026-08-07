import type { ClaimStatus } from "@/types/api";

export const STATUS_ICON: Record<ClaimStatus, string> = {
  verified: "✓",
  weak: "⚠",
  unsupported: "✗",
};

export const STATUS_LABEL: Record<ClaimStatus, string> = {
  verified: "Backed by sources",
  weak: "Partially supported",
  unsupported: "Not backed by sources",
};

export const STATUS_TEXT_CLASS: Record<ClaimStatus, string> = {
  verified: "text-trust-high",
  weak: "text-trust-medium",
  unsupported: "text-trust-low",
};

export const STATUS_BG_CLASS: Record<ClaimStatus, string> = {
  verified: "bg-trust-high/10",
  weak: "bg-trust-medium/10",
  unsupported: "bg-trust-low/10",
};

export const STATUS_BORDER_CLASS: Record<ClaimStatus, string> = {
  verified: "border-trust-high/30",
  weak: "border-trust-medium/30",
  unsupported: "border-trust-low/30",
};

export const STATUS_UNDERLINE_CLASS: Record<ClaimStatus, string> = {
  verified: "decoration-trust-high",
  weak: "decoration-trust-medium",
  unsupported: "decoration-trust-low",
};
