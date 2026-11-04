import re
from typing import List, Dict, Any, Optional

GREETING = re.compile(
    r"^(hello|hi|dear|thank you|thanks|best regards|regards|sincerely|cheers|welcome|good morning|good afternoon|good evening|an agent will|our team will|we will follow up|let us know|please let us know|feel free)",
    re.I,
)

def check_groundedness(
    reply_text: str,
    docs: List[Dict[str, Any]],
    ticket_text: str,
    embedder,
    threshold: float = 0.45,
) -> Dict[str, Any]:
    """
    Evaluate whether each claim in the draft reply is grounded in the retrieved docs or ticket text.
    Returns:
      score: 0.0 to 1.0 (ratio of supported sentences)
      unsupported: list of sentences that fail semantic similarity threshold against context
      unsupported_numbers: hallucinated numeric figures (days, amounts) not present in context
      threshold: float
    """
    if not reply_text or not reply_text.strip():
        return {
            "score": 1.0,
            "unsupported": [],
            "unsupported_numbers": [],
            "threshold": threshold,
            "note": "empty reply",
        }

    # Split into sentences
    raw_sents = [s.strip() for s in re.split(r"(?<=[.!?])\s+", reply_text) if s.strip()]
    sents = [
        s for s in raw_sents
        if len(s.split()) >= 4 and not GREETING.match(s) and not s.lower().startswith("best regards")
    ]

    if not sents:
        return {
            "score": 1.0,
            "unsupported": [],
            "unsupported_numbers": [],
            "threshold": threshold,
            "note": "no factual claims",
        }

    ctx = [d["text"] for d in (docs or []) if d.get("text")]
    if ticket_text:
        ctx.append(ticket_text)

    if not ctx:
        return {
            "score": 0.0,
            "unsupported": sents,
            "unsupported_numbers": [],
            "threshold": threshold,
            "note": "no context available",
        }

    S = embedder.encode(sents)
    C = embedder.encode(ctx)
    sims = (S @ C.T).max(axis=1)

    unsupported = [s for s, b in zip(sents, sims) if float(b) < threshold]

    # Numeric consistency check: verify any numbers in reply exist in context or ticket
    ctx_full = " ".join(ctx)
    ctx_nums = set(re.findall(r"\b\d+(?:\.\d+)?\b", ctx_full))
    reply_nums = set(re.findall(r"\b\d+(?:\.\d+)?\b", reply_text))
    # Exclude trivial numbers like single digit list indices if any
    bad_nums = [n for n in reply_nums if n not in ctx_nums and n not in {"1", "2", "3", "4", "5"}]

    score = round(1.0 - (len(unsupported) / len(sents)), 2)
    return {
        "score": max(0.0, min(1.0, score)),
        "unsupported": unsupported,
        "unsupported_numbers": bad_nums,
        "threshold": threshold,
    }
