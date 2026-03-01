import fitz  # PyMuPDF
import re
from typing import Dict


SECTION_KEYWORDS = {
    "abstract":     ["abstract"],
    "introduction": ["introduction", "intro"],
    "methodology":  ["method", "methodology", "approach", "proposed", "model", "architecture"],
    "experiments":  ["experiment", "experimental setup", "implementation detail", "training detail"],
    "results":      ["result", "evaluation", "performance", "comparison", "benchmark"],
    "conclusion":   ["conclusion", "discussion", "limitation"],
    "references":   ["reference", "bibliography"],
}


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract full raw text from PDF bytes."""
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    full_text = ""
    for page in doc:
        full_text += page.get_text()
    return full_text


def split_into_sections(text: str) -> Dict[str, str]:
    """
    Split paper text into logical sections using keyword matching.
    Returns dict: { section_name: section_text }
    """
    lines = text.split("\n")
    sections: Dict[str, list] = {k: [] for k in SECTION_KEYWORDS}
    sections["other"] = []
    current_section = "other"

    for line in lines:
        stripped = line.strip().lower()

        # Check if line is a section heading (short + matches keyword)
        if 1 <= len(stripped.split()) <= 6:
            matched = False
            for section, keywords in SECTION_KEYWORDS.items():
                if any(kw in stripped for kw in keywords):
                    current_section = section
                    matched = True
                    break

        sections[current_section].append(line)

    return {k: "\n".join(v).strip() for k, v in sections.items()}


def extract_sections(file_bytes: bytes) -> Dict[str, str]:
    """Main entry: PDF bytes → structured sections dict."""
    raw_text = extract_text_from_pdf(file_bytes)
    sections = split_into_sections(raw_text)

    # Fallback: if methodology is empty, use 'other'
    if not sections.get("methodology") and sections.get("other"):
        sections["methodology"] = sections["other"][:3000]

    return sections