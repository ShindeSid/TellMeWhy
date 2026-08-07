"""
Real external RAG connectors (Feature 3). Each function makes a genuine
HTTP call to a real public API and returns normalized ExternalDoc results -
nothing here is canned or fabricated. Verified live against each API before
being wired into the retrieval pipeline (see docs/architecture.md).

Coverage decisions, stated honestly rather than silently faked:
- Wikipedia, arXiv, PubMed, NASA: implemented, verified working with no
  API key required.
- PubMed is run by NCBI, which is part of NIH - this connector legitimately
  covers "NIH" rather than needing a separate, redundant one.
- Semantic Scholar: implemented, but its keyless tier is aggressively
  rate-limited (verified: 429s appear quickly without a registered key).
  Degrades gracefully to an empty result rather than failing the pipeline.
- WHO: NOT implemented. The WHO Global Health Observatory API is
  indicator-code based (you query a specific pre-defined statistic by code),
  not a free-text document search - there's nothing to genuinely "retrieve"
  for an arbitrary question without building a whole indicator-mapping
  layer, which would be out of scope to do honestly in this pass.
- RBI: NOT implemented. No reliable free-text-search public API was found;
  faking one would violate the "no fabrication" principle this whole
  project is built on.
"""

import asyncio
import re
import xml.etree.ElementTree as ET

import httpx
from pydantic import BaseModel

_TIMEOUT = httpx.Timeout(8.0)
_HEADERS = {"User-Agent": "TellMeWhy/1.0 (hackathon project; contact: none)"}

_STOPWORDS = {
    "a", "an", "the", "is", "are", "was", "were", "what", "which", "who", "whom",
    "how", "why", "when", "where", "does", "do", "did", "can", "could", "should",
    "would", "will", "for", "of", "to", "in", "on", "at", "and", "or", "with",
    "this", "that", "these", "those", "it", "its", "be", "been", "as", "by",
}


def _simplify_query(text: str) -> str:
    """Strips a natural-language question down to its meaningful keywords.
    Verified this matters: PubMed's query parser mis-interprets phrases like
    "is the" as an author-name field search on full sentences, returning
    zero results even for well-covered topics; keyword-search APIs
    generally weren't built for verbatim question sentences."""
    words = re.findall(r"[a-zA-Z0-9]+", text)
    keywords = [w for w in words if w.lower() not in _STOPWORDS]
    return " ".join(keywords) if keywords else text


class ExternalDoc(BaseModel):
    title: str
    text: str
    url: str | None
    source_name: str


async def search_wikipedia(query: str, limit: int = 2) -> list[ExternalDoc]:
    query = _simplify_query(query)
    async with httpx.AsyncClient(timeout=_TIMEOUT, headers=_HEADERS) as client:
        try:
            search_resp = await client.get(
                "https://en.wikipedia.org/w/api.php",
                params={"action": "query", "list": "search", "srsearch": query, "format": "json", "srlimit": limit},
            )
            search_resp.raise_for_status()
            hits = search_resp.json().get("query", {}).get("search", [])
            if not hits:
                return []

            titles = "|".join(h["title"] for h in hits)
            extract_resp = await client.get(
                "https://en.wikipedia.org/w/api.php",
                params={
                    "action": "query", "prop": "extracts", "exintro": 1, "explaintext": 1,
                    "titles": titles, "format": "json",
                },
            )
            extract_resp.raise_for_status()
            pages = extract_resp.json().get("query", {}).get("pages", {})

            docs = []
            for page in pages.values():
                title = page.get("title", "")
                extract = (page.get("extract") or "").strip()
                if extract:
                    docs.append(ExternalDoc(
                        title=title,
                        text=extract[:1500],
                        url=f"https://en.wikipedia.org/wiki/{title.replace(' ', '_')}",
                        source_name="Wikipedia",
                    ))
            return docs
        except httpx.HTTPError:
            return []


async def search_arxiv(query: str, limit: int = 2) -> list[ExternalDoc]:
    query = _simplify_query(query)
    async with httpx.AsyncClient(timeout=_TIMEOUT, headers=_HEADERS, follow_redirects=True) as client:
        try:
            resp = await client.get(
                "https://export.arxiv.org/api/query",
                params={"search_query": f"all:{query}", "start": 0, "max_results": limit},
            )
            resp.raise_for_status()
            ns = {"atom": "http://www.w3.org/2005/Atom"}
            root = ET.fromstring(resp.text)
            docs = []
            for entry in root.findall("atom:entry", ns):
                title = (entry.findtext("atom:title", default="", namespaces=ns) or "").strip()
                summary = (entry.findtext("atom:summary", default="", namespaces=ns) or "").strip()
                link = entry.findtext("atom:id", default=None, namespaces=ns)
                if summary:
                    docs.append(ExternalDoc(title=title, text=summary[:1500], url=link, source_name="arXiv"))
            return docs
        except (httpx.HTTPError, ET.ParseError):
            return []


async def search_pubmed(query: str, limit: int = 2) -> list[ExternalDoc]:
    """PubMed / NCBI E-utils - NCBI is a division of the NIH National
    Library of Medicine, so this connector covers "NIH" as a source."""
    query = _simplify_query(query)
    async with httpx.AsyncClient(timeout=_TIMEOUT, headers=_HEADERS) as client:
        try:
            search_resp = await client.get(
                "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi",
                params={"db": "pubmed", "term": query, "retmax": limit, "retmode": "json"},
            )
            search_resp.raise_for_status()
            ids = search_resp.json().get("esearchresult", {}).get("idlist", [])
            if not ids:
                return []

            fetch_resp = await client.get(
                "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi",
                params={"db": "pubmed", "id": ",".join(ids), "rettype": "abstract", "retmode": "text"},
            )
            fetch_resp.raise_for_status()
            # efetch returns all requested abstracts concatenated, separated
            # by blank lines and "N. " numbering - split on the numbering.
            raw = fetch_resp.text
            chunks = [c.strip() for c in raw.split("\n\n\n") if c.strip()]
            docs = []
            for i, pmid in enumerate(ids):
                text = chunks[i] if i < len(chunks) else ""
                if text:
                    title = text.split("\n\n")[0][:200]
                    docs.append(ExternalDoc(
                        title=title, text=text[:1500],
                        url=f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/", source_name="PubMed (NIH/NCBI)",
                    ))
            return docs
        except httpx.HTTPError:
            return []


async def search_semantic_scholar(query: str, limit: int = 2) -> list[ExternalDoc]:
    """Keyless tier is aggressively rate-limited (verified: 429s appear
    within a few requests) - degrades to an empty list rather than failing
    the pipeline. A registered API key would make this reliable."""
    query = _simplify_query(query)
    async with httpx.AsyncClient(timeout=_TIMEOUT, headers=_HEADERS) as client:
        try:
            resp = await client.get(
                "https://api.semanticscholar.org/graph/v1/paper/search",
                params={"query": query, "limit": limit, "fields": "title,abstract,url"},
            )
            if resp.status_code != 200:
                return []
            papers = resp.json().get("data", [])
            return [
                ExternalDoc(
                    title=p.get("title", ""), text=(p.get("abstract") or "")[:1500],
                    url=p.get("url"), source_name="Semantic Scholar",
                )
                for p in papers if p.get("abstract")
            ]
        except httpx.HTTPError:
            return []


_SPACE_KEYWORDS = re.compile(r"\b(space|nasa|mars|moon|planet|astronaut|rocket|orbit|satellite|galaxy)\b", re.I)


async def search_by_domain(query_text: str, domain: str | None) -> list[ExternalDoc]:
    """Domain-routed live retrieval (Feature 3). Always includes Wikipedia
    as a generalist baseline, plus one or two domain-specific sources, run
    concurrently. No reranking exists yet (documented limitation elsewhere
    in this codebase) - results are simply concatenated in source-priority
    order, same honesty constraint as the rest of retrieval here."""
    tasks = [search_wikipedia(query_text)]

    if domain == "medical":
        tasks.append(search_pubmed(query_text))
    elif domain == "programming":
        tasks.append(search_arxiv(query_text))
    else:
        tasks.append(search_semantic_scholar(query_text))

    if _SPACE_KEYWORDS.search(query_text):
        tasks.append(search_nasa(query_text))

    results = await asyncio.gather(*tasks, return_exceptions=True)
    docs: list[ExternalDoc] = []
    for r in results:
        if isinstance(r, list):
            docs.extend(r)
    return docs


async def search_nasa(query: str, limit: int = 2) -> list[ExternalDoc]:
    query = _simplify_query(query)
    async with httpx.AsyncClient(timeout=_TIMEOUT, headers=_HEADERS) as client:
        try:
            resp = await client.get(
                "https://images-api.nasa.gov/search", params={"q": query, "media_type": "image"}
            )
            resp.raise_for_status()
            items = resp.json().get("collection", {}).get("items", [])[:limit]
            docs = []
            for item in items:
                data = (item.get("data") or [{}])[0]
                desc = (data.get("description") or "").strip()
                if desc:
                    docs.append(ExternalDoc(
                        title=data.get("title", "NASA"), text=desc[:1500],
                        url=item.get("href"), source_name="NASA",
                    ))
            return docs
        except httpx.HTTPError:
            return []
