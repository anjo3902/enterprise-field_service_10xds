from ai_engine.gemini_diagnosis import _apply_confidence_severity_threshold


def test_low_confidence_caps_to_low():
    payload = {
        "final_severity": "critical",
        "image_severity": "critical",
        "description_severity": "high",
        "confidence": 0.40,
        "final_reasoning": "model output",
        "reason": "model output",
    }

    out = _apply_confidence_severity_threshold(payload)
    assert out["final_severity"] == "low"
    assert out["image_severity"] == "low"
    assert out["description_severity"] == "low"


def test_medium_confidence_caps_high_to_medium():
    payload = {
        "final_severity": "high",
        "image_severity": "high",
        "description_severity": "high",
        "confidence": 0.60,
        "final_reasoning": "model output",
        "reason": "model output",
    }

    out = _apply_confidence_severity_threshold(payload)
    assert out["final_severity"] == "medium"


def test_high_confidence_allows_high_but_not_critical():
    payload = {
        "final_severity": "critical",
        "image_severity": "critical",
        "description_severity": "critical",
        "confidence": 0.80,
        "final_reasoning": "model output",
        "reason": "model output",
    }

    out = _apply_confidence_severity_threshold(payload)
    assert out["final_severity"] == "high"


def test_very_high_confidence_keeps_critical():
    payload = {
        "final_severity": "critical",
        "image_severity": "critical",
        "description_severity": "critical",
        "confidence": 0.95,
        "final_reasoning": "model output",
        "reason": "model output",
    }

    out = _apply_confidence_severity_threshold(payload)
    assert out["final_severity"] == "critical"


def test_na_description_severity_is_preserved():
    payload = {
        "final_severity": "high",
        "image_severity": "high",
        "description_severity": "N/A",
        "confidence": 0.60,
        "final_reasoning": "model output",
        "reason": "model output",
    }

    out = _apply_confidence_severity_threshold(payload)
    assert out["final_severity"] == "medium"
    assert out["description_severity"] == "N/A"