def calculate_risk_score(analysis: dict) -> dict:
    """
    Weighted risk scoring — reduced parameter set, fair scoring.
    Max raw score = 10 → normalized to 10.
    """

    weights = {
        "hyperparameters": 2.5,
        "dataset":         2.0,
        "training_config": 2.0,
        "baselines":       1.5,
        "statistical":     1.5,
        "code":            0.5,
    }

    severity_multiplier = {
        "low":     0.2,
        "medium":  0.6,
        "high":    1.0,
        "unknown": 0.5,
    }

    category_breakdown = {}
    total_raw = 0.0
    max_raw = sum(weights.values())  # = 10.0

    for category, weight in weights.items():
        analysis_data = analysis.get(category, {})
        severity = analysis_data.get("severity", "unknown")
        multiplier = severity_multiplier.get(severity, 0.5)

        found = len(analysis_data.get("found", []))
        missing = len(analysis_data.get("missing", []))
        total_checks = found + missing

        if total_checks > 0:
            missing_ratio = missing / total_checks
            effective_multiplier = (multiplier * 0.6) + (missing_ratio * 0.4)
        else:
            effective_multiplier = multiplier * 0.5

        risk_contribution = weight * effective_multiplier
        total_raw += risk_contribution

        category_breakdown[category] = {
            "risk": round(risk_contribution, 2),
            "max": weight,
            "severity": severity,
            "found_count": found,
            "missing_count": missing,
        }

    total_score = round((total_raw / max_raw) * 10, 1)
    total_score = max(1.0, min(9.5, total_score))

    if total_score <= 3.5:
        level = "LOW"
        message = "Paper is reasonably reproducible. Minor details missing."
    elif total_score <= 6.5:
        level = "MEDIUM"
        message = "Some key reproducibility details are missing. Reproduction may be difficult."
    else:
        level = "HIGH"
        message = "Critical reproducibility information is missing. Reproduction is unlikely without author contact."

    return {
        "total_score": total_score,
        "level": level,
        "message": message,
        "category_breakdown": category_breakdown,
    }


def build_red_flags(analysis: dict) -> list:
    """
    Build a list of red flags from the analysis results.
    """
    CATEGORY_META = {
        "hyperparameters": {"icon": "🔧", "label": "Hyperparameters"},
        "dataset":         {"icon": "📊", "label": "Dataset Details"},
        "training_config": {"icon": "⚙️",  "label": "Training Config"},
        "baselines":       {"icon": "📏", "label": "Baseline Comparison"},
        "statistical":     {"icon": "📉", "label": "Statistical Rigor"},
        "code":            {"icon": "💻", "label": "Code Availability"},
    }

    red_flags = []

    for category, data in analysis.items():
        meta = CATEGORY_META.get(category, {"icon": "⚠️", "label": category})
        severity = data.get("severity", "unknown")
        missing_items = data.get("missing", [])

        if severity in ("medium", "high"):
            for item in missing_items:
                red_flags.append({
                    "category": meta["label"],
                    "icon": meta["icon"],
                    "issue": f"Missing: {item}",
                    "severity": severity,
                })

            if not missing_items and severity == "high":
                notes = data.get("notes", "Details not reported.")
                red_flags.append({
                    "category": meta["label"],
                    "icon": meta["icon"],
                    "issue": notes,
                    "severity": severity,
                })

    return red_flags