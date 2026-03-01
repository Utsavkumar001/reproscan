import httpx
import os
import json
import time
import xml.etree.ElementTree as ET
from groq import Groq

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
ARXIV_URL = "https://export.arxiv.org/api/query"


def get_abstract(sections: dict) -> str:
    for key in ["abstract", "introduction", "other"]:
        text = sections.get(key, "").strip()
        if text:
            return text[:2000]
    return ""


def fetch_similar_papers(query: str, max_results: int = 5) -> list:
    try:
        params = {
            "search_query": f"all:{query}",
            "start": 0,
            "max_results": max_results,
            "sortBy": "relevance",
        }
        with httpx.Client(timeout=15.0) as http:
            r = http.get(ARXIV_URL, params=params)
        root = ET.fromstring(r.text)
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        papers = []
        for entry in root.findall("atom:entry", ns):
            title   = entry.find("atom:title", ns)
            summary = entry.find("atom:summary", ns)
            published = entry.find("atom:published", ns)
            link    = entry.find("atom:id", ns)
            authors = entry.findall("atom:author", ns)
            author_names = [a.find("atom:name", ns).text for a in authors[:2] if a.find("atom:name", ns) is not None]

            title_text   = title.text.strip().replace("\n", " ") if title is not None else ""
            summary_text = summary.text.strip().replace("\n", " ")[:400] if summary is not None else ""
            year         = published.text[:4] if published is not None else ""
            url          = link.text.strip() if link is not None else ""
            if "arxiv.org/abs/" in url:
                url = f"https://arxiv.org/abs/{url.split('/abs/')[-1]}"

            papers.append({
                "title":   title_text,
                "authors": ", ".join(author_names),
                "year":    year,
                "abstract": summary_text,
                "link":    url,
            })
        return papers
    except Exception as e:
        print(f"[Novelty] ArXiv fetch error: {e}")
        return []


def analyze_novelty(sections: dict) -> dict:
    paper_text = get_abstract(sections)
    if not paper_text:
        return {"error": "Could not extract paper content."}

    # Step 1: Extract keywords for search
    kw_prompt = f"""Extract the 4-5 most specific technical keywords from this ML paper abstract.
Return ONLY JSON: {{"keywords": ["kw1", "kw2", "kw3"], "title_guess": "short paper topic"}}

Text: {paper_text[:1500]}"""

    try:
        kw_resp = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": kw_prompt}],
            temperature=0.1, max_tokens=150,
        )
        raw = kw_resp.choices[0].message.content.strip()
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"): raw = raw[4:]
        kw_data = json.loads(raw.strip())
        keywords = kw_data.get("keywords", [])
        topic = kw_data.get("title_guess", "machine learning")
    except Exception as e:
        print(f"[Novelty] keyword extract failed: {e}")
        keywords = ["machine learning", "neural network"]
        topic = "ML paper"

    # Step 2: Fetch similar papers from ArXiv
    query = " ".join(keywords[:3])
    similar_papers = fetch_similar_papers(query, max_results=5)
    time.sleep(1)

    if not similar_papers:
        return {
            "novelty_score": 5.0,
            "overlap_pct": 50,
            "topic": topic,
            "keywords": keywords,
            "verdict": "Could not fetch comparison papers. ArXiv may be temporarily unavailable.",
            "what_overlaps": [],
            "what_is_new": [],
            "most_similar": [],
        }

    # Step 3: Groq comparison
    papers_text = "\n\n".join([
        f"Paper {i+1}: {p['title']} ({p['year']})\n{p['abstract']}"
        for i, p in enumerate(similar_papers)
    ])

    compare_prompt = f"""You are a research novelty analyst. Compare the TARGET PAPER with the PRIOR WORKS below.

TARGET PAPER:
{paper_text[:1500]}

PRIOR WORKS:
{papers_text[:2500]}

Analyze and return ONLY this JSON:
{{
  "novelty_score": <float 1-10, where 10 = extremely novel, 1 = completely derivative>,
  "overlap_pct": <integer 0-100, estimated conceptual overlap with prior work>,
  "verdict": "<2 sentence overall novelty assessment>",
  "what_overlaps": ["<concept that overlaps with prior work>", ...],
  "what_is_new": ["<genuinely novel contribution>", ...],
  "most_similar_title": "<title of most similar prior paper>",
  "most_similar_reason": "<why it is most similar>"
}}"""

    try:
        resp = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": compare_prompt}],
            temperature=0.2, max_tokens=600,
        )
        raw = resp.choices[0].message.content.strip()
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"): raw = raw[4:]
        result = json.loads(raw.strip())
        result["topic"]    = topic
        result["keywords"] = keywords
        result["most_similar"] = similar_papers[:3]
        return result
    except Exception as e:
        print(f"[Novelty] Groq compare failed: {e}")
        return {
            "novelty_score": 5.0,
            "overlap_pct": 50,
            "topic": topic,
            "keywords": keywords,
            "verdict": "Analysis failed. Please try again.",
            "what_overlaps": [],
            "what_is_new": [],
            "most_similar": similar_papers[:3],
        }