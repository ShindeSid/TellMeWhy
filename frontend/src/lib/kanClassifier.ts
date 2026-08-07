// KAN Classifiers (Feature 6): categorical complexity tier derived from the
// same complexity_score the router already computes - no new backend signal
// invented, just a human-readable bucketing of a real number.

export type ComplexityTier = "Simple" | "Moderate" | "Complex" | "Expert";

const TIER_WHY: Record<ComplexityTier, string> = {
  Simple: "a short, direct question with little ambiguity or reasoning depth required.",
  Moderate: "a question with some nuance - a few related concepts, but no deep multi-step reasoning.",
  Complex: "a question that likely needs multiple pieces of evidence or several reasoning steps.",
  Expert: "a question that looks like it needs specialist knowledge or careful multi-step reasoning to answer well.",
};

export function classifyComplexity(score: number): { tier: ComplexityTier; why: string } {
  let tier: ComplexityTier;
  if (score < 0.3) tier = "Simple";
  else if (score < 0.55) tier = "Moderate";
  else if (score < 0.8) tier = "Complex";
  else tier = "Expert";
  return { tier, why: TIER_WHY[tier] };
}
