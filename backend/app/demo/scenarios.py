"""
Demo Mode presets (F39). Three fixed scenarios matching the KAN router's
domain keywords (medical / programming / current_affairs) so they exercise
different routes: medical and current-affairs both force RAG, programming
stays on small/large LLM. The canned answers deliberately include one
fabricated detail not present in the canned sources, so Milestone 6's claim
verification still visibly catches something instead of everything being
trivially "verified".
"""

from pydantic import BaseModel


class DemoChunk(BaseModel):
    title: str
    text: str


class DemoScenario(BaseModel):
    id: str
    title: str
    query_text: str
    trust_slider_value: float
    chunks: list[DemoChunk] | None  # None => non-RAG route
    canned_answer: str


SCENARIOS: list[DemoScenario] = [
    DemoScenario(
        id="medical",
        title="Medical",
        query_text="What is the recommended dosage of ibuprofen for adult patients with mild pain?",
        trust_slider_value=0.7,
        chunks=[
            DemoChunk(
                title="OTC analgesic dosing guideline",
                text="For healthy adults, the typical over-the-counter ibuprofen dose is 200-400mg "
                "every 4 to 6 hours as needed, not exceeding 1200mg per day without medical supervision.",
            ),
            DemoChunk(
                title="Ibuprofen safety notes",
                text="Ibuprofen should be taken with food to reduce stomach irritation. It is not "
                "recommended for patients with certain kidney conditions or in late pregnancy.",
            ),
        ],
        canned_answer=(
            "For healthy adults, the typical over-the-counter ibuprofen dose is 200-400mg every "
            "4 to 6 hours, not exceeding 1200mg per day without medical supervision. It is roughly "
            "twice as effective as paracetamol for most patients. Take it with food to reduce "
            "stomach irritation, and avoid it if you have certain kidney conditions or are in late "
            "pregnancy. Consult a doctor for persistent pain."
        ),
    ),
    DemoScenario(
        id="programming",
        title="Programming",
        query_text="Explain how binary search works and why it is faster than linear search for sorted arrays.",
        trust_slider_value=0.5,
        chunks=None,
        canned_answer=(
            "Binary search repeatedly halves a sorted array, comparing the middle element to the "
            "target and discarding the half that can't contain it. Because it discards half the "
            "remaining elements at every step, it runs in O(log n) time. Linear search checks "
            "elements one by one and runs in O(n) time, so binary search wins decisively on large "
            "sorted arrays but requires the array to be sorted first."
        ),
    ),
    DemoScenario(
        id="current_affairs",
        title="Current Affairs",
        query_text="What are the main economic policies being debated in the current global trade negotiations?",
        trust_slider_value=0.7,
        chunks=[
            DemoChunk(
                title="Trade negotiation summary",
                text="Current global trade talks center on tariff reduction schedules, "
                "digital-services taxation, and carbon border adjustment mechanisms between "
                "major economies.",
            ),
            DemoChunk(
                title="Carbon border policy brief",
                text="Carbon border adjustment mechanisms aim to tax imports based on their "
                "carbon footprint, intended to prevent domestic industries from being undercut "
                "by countries with looser emissions rules.",
            ),
        ],
        canned_answer=(
            "The main topics under debate are tariff reduction schedules, digital-services "
            "taxation, and carbon border adjustment mechanisms, which tax imports based on their "
            "carbon footprint to stop domestic industries being undercut by countries with looser "
            "emissions rules. Negotiators have already reached a binding global agreement on all "
            "three issues. Talks remain ongoing as of the latest sessions."
        ),
    ),
]


def find_scenario_by_id(scenario_id: str) -> DemoScenario | None:
    return next((s for s in SCENARIOS if s.id == scenario_id), None)


def find_scenario_for_query(query_text: str) -> DemoScenario | None:
    """Match by exact text first (scenario buttons), then substring, so
    demo mode still does something sensible if a judge edits the query."""
    for s in SCENARIOS:
        if s.query_text == query_text:
            return s
    normalized = query_text.strip().lower()
    for s in SCENARIOS:
        if s.query_text.strip().lower() in normalized or normalized in s.query_text.strip().lower():
            return s
    return None
