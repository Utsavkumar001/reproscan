import httpx
import os
import json
import time
import xml.etree.ElementTree as ET
from groq import Groq

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

ARXIV_URL = "https://export.arxiv.org/api/query"


def extract_topics(sections: dict):
    """Use Groq to extract key topics/keywords from the paper."""
    text = ""
    for key in ["abstract", "introduction", "methodology"]:
        content = sections.get(key, "").strip()
        if content:
            text += content[:1000]
    if not text:
        text = sections.get("other", "")[:1500]

    prompt = f"""Extract 4-6 key technical topics/keywords from this ML paper text.
Return ONLY a JSON object like:
{{
  "keywords": ["topic1", "topic2", "topic3"],
  "main_task": "one sentence describing what this paper does"
}}

Text:
{text[:2000]}"""

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=200,
        )
        raw = response.choices[0].message.content.strip()
        if "```" in raw:
            parts = raw.split("```")
            raw = parts[1] if len(parts) > 1 else parts[0]
            if raw.startswith("json"):
                raw = raw[4:]
        result = json.loads(raw.strip())
        return result.get("keywords", []), result.get("main_task", "")
    except Exception as e:
        print(f"[Topic extraction failed]: {e}")
        return [], ""


def search_arxiv(query: str, max_results: int = 5) -> list:
    """Search ArXiv API — free, no key needed, no rate limits."""
    print(f"[ArXiv] Searching: {query}")
    try:
        params = {
            "search_query": f"all:{query}",
            "start": 0,
            "max_results": max_results,
            "sortBy": "relevance",
            "sortOrder": "descending",
        }

        with httpx.Client(timeout=15.0) as http:
            response = http.get(ARXIV_URL, params=params)
            print(f"[ArXiv] Status: {response.status_code}")

        # Parse XML response
        root = ET.fromstring(response.text)
        ns = {"atom": "http://www.w3.org/2005/Atom"}

        papers = []
        for entry in root.findall("atom:entry", ns):
            title = entry.find("atom:title", ns)
            summary = entry.find("atom:summary", ns)
            published = entry.find("atom:published", ns)
            link = entry.find("atom:id", ns)

            authors = entry.findall("atom:author", ns)
            author_names = []
            for a in authors[:3]:
                name = a.find("atom:name", ns)
                if name is not None:
                    author_names.append(name.text)
            author_str = ", ".join(author_names)
            if len(authors) > 3:
                author_str += " et al."

            title_text = title.text.strip().replace("\n", " ") if title is not None else "Untitled"
            abstract_text = summary.text.strip().replace("\n", " ") if summary is not None else ""
            year = published.text[:4] if published is not None else ""
            arxiv_url = link.text.strip() if link is not None else ""

            # Convert to https://arxiv.org/abs/XXXX format
            if "arxiv.org/abs/" in arxiv_url:
                arxiv_id = arxiv_url.split("/abs/")[-1]
                clean_url = f"https://arxiv.org/abs/{arxiv_id}"
            else:
                clean_url = arxiv_url

            papers.append({
                "title": title_text,
                "authors": author_str,
                "year": year,
                "citations": 0,
                "abstract": abstract_text[:200] + "..." if len(abstract_text) > 200 else abstract_text,
                "link": clean_url,
                "pdf_url": clean_url.replace("/abs/", "/pdf/"),
            })

        print(f"[ArXiv] Found {len(papers)} papers")
        return papers

    except Exception as e:
        print(f"[ArXiv] Error: {e}")
        return []


def get_recommendations(sections: dict, analysis: dict) -> dict:
    keywords, main_task = extract_topics(sections)
    print(f"[Recommender] Keywords: {keywords}, Task: {main_task}")

    base_query = " ".join(keywords[:3]) if keywords else "deep learning neural network"

    results = {
        "main_task": main_task,
        "keywords": keywords,
        "related_papers": [],
        "reproducibility_references": [],
    }

    # Search 1: Related papers on same topic
    results["related_papers"] = search_arxiv(base_query, max_results=5)

    time.sleep(1)  # be polite to ArXiv

    # Search 2: Reproducibility best practices papers
    results["reproducibility_references"] = search_arxiv(
        "machine learning reproducibility checklist best practices", max_results=3
    )

    return results