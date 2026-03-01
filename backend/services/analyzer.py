import os
import json
import time
from groq import Groq

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

SYSTEM_PROMPT = """You are an expert ML paper reproducibility auditor.
Analyze the given section and return ONLY valid JSON. No explanation, no markdown, no extra text.
Be FAIR and REASONABLE — if a parameter is partially mentioned or can be inferred from context, mark it as found.
Only mark something missing if it is completely absent from the text."""


def get_combined_text(sections: dict, keys: list, max_chars: int = 3000) -> str:
    combined = ""
    for key in keys:
        content = sections.get(key, "").strip()
        if content:
            combined += f"\n\n[{key.upper()}]\n{content}"
    return combined[:max_chars] if combined else sections.get("other", "")[:max_chars]


def call_groq(prompt: str, retries: int = 3) -> dict:
    for attempt in range(retries):
        try:
            response = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=500,
            )
            raw = response.choices[0].message.content.strip()
            if "```" in raw:
                parts = raw.split("```")
                raw = parts[1] if len(parts) > 1 else parts[0]
                if raw.startswith("json"):
                    raw = raw[4:]
            raw = raw.strip()
            return json.loads(raw)
        except Exception as e:
            err = str(e)
            if "rate_limit" in err.lower() or "429" in err:
                wait = 10 * (attempt + 1)
                time.sleep(wait)
                continue
            return {
                "severity": "medium",
                "notes": "Could not parse response.",
                "found": [],
                "missing": ["details unclear from text"]
            }
    return {
        "severity": "high",
        "notes": "Analysis failed due to API rate limit. Try again in a few minutes.",
        "found": [],
        "missing": ["could not analyze — rate limit hit"]
    }


def call_groq_text(prompt: str, max_tokens: int = 800, retries: int = 3) -> str:
    """Call Groq and return plain text response (for summary)."""
    for attempt in range(retries):
        try:
            response = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": "You are an expert at summarizing ML research papers clearly and concisely. Return only valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=max_tokens,
            )
            raw = response.choices[0].message.content.strip()
            if "```" in raw:
                parts = raw.split("```")
                raw = parts[1] if len(parts) > 1 else parts[0]
                if raw.startswith("json"):
                    raw = raw[4:]
            return raw.strip()
        except Exception as e:
            err = str(e)
            if "rate_limit" in err.lower() or "429" in err:
                time.sleep(10 * (attempt + 1))
                continue
            return ""
    return ""


def generate_summary(sections: dict) -> dict:
    """Generate a 4-part paper summary."""
    full_text = get_combined_text(
        sections,
        ["abstract", "introduction", "methodology", "results", "conclusion", "other"],
        max_chars=4000
    )

    prompt = f"""Analyze this ML research paper and return a JSON summary with exactly these 4 fields:

1. "overview": 2-3 sentences explaining what this paper is about in simple language (no jargon). What problem does it solve?
2. "contributions": A list of 3-4 key contributions or novel ideas this paper introduces.
3. "findings": 2-3 sentences summarizing the main results and how well the method performed.
4. "limitations": A list of 2-3 limitations the paper mentions or that are clearly evident.

Paper text:
{full_text}

Return ONLY this JSON structure:
{{
  "overview": "...",
  "contributions": ["...", "...", "..."],
  "findings": "...",
  "limitations": ["...", "..."]
}}"""

    raw = call_groq_text(prompt, max_tokens=800)
    try:
        return json.loads(raw)
    except Exception:
        return {
            "overview": "Could not generate summary. Please try again.",
            "contributions": [],
            "findings": "",
            "limitations": []
        }


def analyze_paper(sections: dict) -> dict:
    category_config = {
        "hyperparameters": {
            "sections": ["methodology", "experiments", "introduction", "other"],
            "prompt_template": """Analyze this ML paper text for hyperparameter reporting.
Check ONLY these 6 parameters — mark as FOUND if mentioned anywhere, even briefly:
1. learning rate
2. batch size
3. dropout rate
4. number of layers / depth
5. hidden dimensions / model size
6. activation functions

Be lenient — standard architectures (ResNet, BERT, ViT etc.) imply some params as found.

Text:
{text}

Return JSON only:
{{
  "severity": "low|medium|high",
  "notes": "one sentence summary",
  "found": ["params clearly mentioned"],
  "missing": ["params completely absent"]
}}"""
        },
        "dataset": {
            "sections": ["methodology", "experiments", "results", "other"],
            "prompt_template": """Analyze this ML paper text for dataset documentation.
Check ONLY these 5 items — mark FOUND if mentioned anywhere:
1. dataset name
2. train/val/test split sizes or ratios
3. preprocessing steps
4. data augmentation techniques
5. class distribution or dataset statistics

Well-known datasets (ImageNet, CIFAR, COCO, MNIST etc.) = dataset name is FOUND automatically.

Text:
{text}

Return JSON only:
{{
  "severity": "low|medium|high",
  "notes": "one sentence summary",
  "found": ["items clearly mentioned"],
  "missing": ["items completely absent"]
}}"""
        },
        "training_config": {
            "sections": ["methodology", "experiments", "other"],
            "prompt_template": """Analyze this ML paper text for training configuration.
Check ONLY these 4 required items:
1. hardware (GPU/TPU type and count)
2. training duration (epochs or steps)
3. random seeds
4. framework and version (PyTorch, TensorFlow, JAX, etc.)

Text:
{text}

Return JSON only:
{{
  "severity": "low|medium|high",
  "notes": "one sentence summary",
  "found": ["items clearly mentioned"],
  "missing": ["required items completely absent"]
}}"""
        },
        "baselines": {
            "sections": ["results", "experiments", "introduction", "other"],
            "prompt_template": """Analyze this ML paper text for baseline comparison quality.
Check:
1. Are competitor methods / baselines named and cited?
2. Are comparisons on same dataset/metric?
3. Any sign of cherry-picking?

If text has no results section, return severity "low".

Text:
{text}

Return JSON only:
{{
  "severity": "low|medium|high",
  "notes": "one sentence summary",
  "found": ["what is done well"],
  "missing": ["what is problematic or absent"]
}}"""
        },
        "statistical": {
            "sections": ["results", "experiments", "other"],
            "prompt_template": """Analyze this ML paper text for statistical rigor.
Check ONLY:
1. Error bars or standard deviation reported
2. Results averaged over multiple runs/seeds
3. Confidence intervals or p-values

Be lenient — only mark HIGH if paper makes strong claims with zero uncertainty reported.

Text:
{text}

Return JSON only:
{{
  "severity": "low|medium|high",
  "notes": "one sentence summary",
  "found": ["statistical measures reported"],
  "missing": ["missing statistical details"]
}}"""
        },
        "code": {
            "sections": ["abstract", "introduction", "conclusion", "other"],
            "prompt_template": """Check this ML paper text for code/reproducibility availability.
Look for:
1. GitHub or any repository URL
2. Statement about code release
3. Reproducibility package or supplementary material

Text:
{text}

Return JSON only:
{{
  "severity": "low|medium|high",
  "notes": "one sentence summary",
  "found": ["code availability info found"],
  "missing": ["what is missing"]
}}"""
        },
    }

    results = {}
    for category, config in category_config.items():
        text = get_combined_text(sections, config["sections"], max_chars=3000)
        prompt = config["prompt_template"].format(text=text)
        results[category] = call_groq(prompt)
        time.sleep(1)

    return results