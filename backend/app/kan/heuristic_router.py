"""
Default CognitiveRouter implementation: rule-based, no model dependency.
Deliberately not a real KAN - it exists so the rest of the system can be
built and demoed against the CognitiveRouter contract (app/kan/interface.py)
today. Swap in a learned model later by implementing the same Protocol;
nothing outside this file needs to change.
"""

import re

from app.kan.interface import CognitiveRouter, QueryInput, RiskLevel, Route, RoutingDecision

_DOMAIN_KEYWORDS: dict[str, tuple[str, ...]] = {
    "programming": ("code", "function", "python", "javascript", "bug", "algorithm", "api", "class ", "def ", "compile", "error:"),
    "medical": ("symptom", "disease", "treatment", "diagnosis", "medication", "doctor", "patient", "dosage", "pain"),
    "current_affairs": (
        "news", "election", "president", "war", "economy", "economic", "economics",
        "policy", "policies", "government", "today", "yesterday", "trade", "tariff",
        "tariffs", "negotiation", "negotiations", "geopolitical",
    ),
}

_HIGH_STAKES_DOMAINS = {"medical", "current_affairs"}

_VAGUE_REFERENTS = re.compile(r"\b(it|this|that|these|those|thing)\b", re.IGNORECASE)
_CODE_MARKERS = re.compile(r"```|def \w+\(|function\s*\(|class \w+")


def _keyword_pattern(keyword: str) -> re.Pattern[str]:
    # Keywords ending in a space or colon are already delimited (e.g. "def ", "error:").
    if keyword[-1] in (" ", ":"):
        return re.compile(re.escape(keyword))
    return re.compile(rf"\b{re.escape(keyword)}\b")


_DOMAIN_PATTERNS: dict[str, tuple[re.Pattern[str], ...]] = {
    domain: tuple(_keyword_pattern(kw) for kw in kws) for domain, kws in _DOMAIN_KEYWORDS.items()
}


def _detect_domain(text: str) -> str:
    lower = text.lower()
    scores = {
        domain: sum(1 for pattern in patterns if pattern.search(lower))
        for domain, patterns in _DOMAIN_PATTERNS.items()
    }
    best_domain, best_score = max(scores.items(), key=lambda item: item[1])
    return best_domain if best_score > 0 else "general"


def _estimate_complexity(text: str) -> float:
    words = text.split()
    length_score = min(1.0, len(words) / 60)
    multi_part = text.count("?") > 1 or " and " in text.lower()
    has_code = bool(_CODE_MARKERS.search(text))
    score = length_score
    if multi_part:
        score += 0.15
    if has_code:
        score += 0.25
    return min(1.0, score)


def _estimate_ambiguity(text: str) -> float:
    words = text.split()
    if len(words) < 4:
        return 0.7
    vague_hits = len(_VAGUE_REFERENTS.findall(text))
    score = 0.25 + min(0.5, vague_hits * 0.15)
    if text.strip().endswith("?"):
        score -= 0.1
    return max(0.05, min(1.0, score))


def _estimate_hallucination_risk(domain: str, complexity: float, ambiguity: float) -> RiskLevel:
    if domain in _HIGH_STAKES_DOMAINS and (complexity > 0.5 or ambiguity > 0.5):
        return "high"
    if domain in _HIGH_STAKES_DOMAINS or ambiguity > 0.5 or complexity > 0.7:
        return "medium"
    return "low"


def _base_route(domain: str, complexity: float, has_uploaded_sources: bool) -> Route:
    if has_uploaded_sources or domain in _HIGH_STAKES_DOMAINS:
        return "rag"
    if complexity > 0.55:
        return "large_llm"
    return "small_llm"


_ROUTE_RANK: dict[Route, int] = {"small_llm": 0, "large_llm": 1, "rag": 2}


def _apply_trust_slider(route: Route, slider: float, needs_retrieval: bool) -> tuple[Route, bool]:
    """Trust Slider (F9): 0 = fast, 1 = reliable. Reliable end escalates the
    route and forces retrieval; fast end de-escalates unless already RAG
    (never drop retrieval a domain actually requires)."""
    if slider >= 0.75 and _ROUTE_RANK[route] < _ROUTE_RANK["large_llm"]:
        return "large_llm", needs_retrieval
    if slider <= 0.25 and route == "large_llm":
        return "small_llm", needs_retrieval
    return route, needs_retrieval


class HeuristicCognitiveRouter(CognitiveRouter):
    def analyze(self, query: QueryInput) -> RoutingDecision:
        domain = _detect_domain(query.text)
        complexity = _estimate_complexity(query.text)
        ambiguity = _estimate_ambiguity(query.text)
        hallucination_risk = _estimate_hallucination_risk(domain, complexity, ambiguity)

        route = _base_route(domain, complexity, query.has_uploaded_sources)
        needs_retrieval = route == "rag"
        route, needs_retrieval = _apply_trust_slider(route, query.trust_slider_value, needs_retrieval)
        needs_retrieval = needs_retrieval or route == "rag"

        base_budget = 512 + int(complexity * 1536)
        slider_multiplier = 0.7 + query.trust_slider_value * 0.6  # 0.7x .. 1.3x
        token_budget = int(base_budget * slider_multiplier)

        expected_confidence = max(0.3, min(0.95, 0.85 - ambiguity * 0.3 - (0.15 if hallucination_risk == "high" else 0)))
        carbon_estimate_g = round((0.4 + complexity * 1.8) * (1.4 if route == "large_llm" else 1.8 if route == "rag" else 1.0), 3)

        rationale = (
            f"domain={domain}, complexity={complexity:.2f}, ambiguity={ambiguity:.2f}, "
            f"hallucination_risk={hallucination_risk}, trust_slider={query.trust_slider_value:.2f}, "
            f"sources_uploaded={query.has_uploaded_sources} -> route={route}"
        )

        return RoutingDecision(
            complexity_score=complexity,
            ambiguity_score=ambiguity,
            domain=domain,
            needs_retrieval=needs_retrieval,
            needs_clarification=ambiguity > 0.65,
            expected_confidence=expected_confidence,
            token_budget=token_budget,
            carbon_estimate_g=carbon_estimate_g,
            hallucination_risk=hallucination_risk,
            route=route,
            rationale=rationale,
        )
