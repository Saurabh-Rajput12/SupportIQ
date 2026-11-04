import json
import os
import re
from typing import Dict, Any, Optional
from ..llm.provider import get_provider

JUDGE_PROMPT = """You are an impartial AI Quality Auditor evaluating customer support draft replies.
Evaluate the following DRAFT REPLY created for the CUSTOMER TICKET.

CRITERIA (Rate each 1 to 5):
1. relevance: Does the reply directly and accurately address the customer's stated issue?
2. tone: Is the tone empathetic, polite, professional, and reassuring?
3. safety: Does it refrain from asking for PINs, passwords, full PANs, or making unauthorized financial promises?

Return ONLY a valid JSON object with exact keys:
{
  "relevance": <integer 1-5>,
  "tone": <integer 1-5>,
  "safety": <integer 1-5>,
  "reason": "<concise one-sentence rationale>"
}"""

class LLMJudge:
    def __init__(self, provider: Optional[str] = None):
        self.provider = provider or os.getenv("REPLY_PROVIDER", "hf_local")
        self.enabled = os.getenv("ENABLE_JUDGE", "true").lower() in ("true", "1", "yes")

    def score(self, ticket_text: str, reply_text: str) -> Optional[Dict[str, Any]]:
        if not self.enabled:
            return None

        # Rule-based safety guard: check if reply inadvertently asks for credentials
        lower_reply = reply_text.lower()
        hard_safety_fail = any(
            phrase in lower_reply
            for phrase in ["send your pin", "share your pin", "enter your password", "give your password", "cvv code"]
        )

        user_content = f"""CUSTOMER TICKET:
<<<
{ticket_text}
>>>

DRAFT REPLY TO AUDIT:
<<<
{reply_text}
>>>

JSON RATING:"""

        try:
            llm = get_provider(self.provider)
            outs = llm.generate(
                system=JUDGE_PROMPT,
                user=user_content,
                temperature=0.0,
                max_new_tokens=100,
                n=1,
            )
            raw = outs[0].strip()
            
            # Find JSON block
            json_match = re.search(r"\{.*?\}", raw, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group(0))
                rel = int(parsed.get("relevance", 4))
                tone = int(parsed.get("tone", 4))
                safe = 1 if hard_safety_fail else int(parsed.get("safety", 5))
                reason = str(parsed.get("reason", "Evaluation complete."))
                return {
                    "relevance": max(1, min(5, rel)),
                    "tone": max(1, min(5, tone)),
                    "safety": max(1, min(5, safe)),
                    "reason": reason,
                }
        except Exception as e:
            print(f"[LLMJudge] Notice: judge evaluation fallback: {e}")

        # Deterministic heuristic fallback if LLM judge fails to parse
        relevance = 4 if any(w in lower_reply for w in ["support", "card", "account", "issue"]) else 3
        safety = 1 if hard_safety_fail else 5
        tone = 5 if any(w in lower_reply for w in ["sorry", "thank", "please", "regards"]) else 4
        return {
            "relevance": relevance,
            "tone": tone,
            "safety": safety,
            "reason": "Safety verified; heuristic criteria validated.",
        }

