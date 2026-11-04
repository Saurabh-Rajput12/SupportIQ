import os
import re
from typing import Dict, Any, Optional, List
import numpy as np
from .prompts import (
    SYSTEM_PROMPT,
    PROMPT_VERSION,
    build_prompt_by_strategy,
)
from ..llm.provider import get_provider

class ReplyGenerator:
    """
    SupportIQ GenAI RAG Reply Generation Engine.
    Powers instructional, conversational, chain-of-thought, self-consistency,
    zero-shot, few-shot, and structured prompting with real LLMs.
    Guaranteed Human-In-The-Loop: Strictly generates DRAFTS ONLY (sent: false).
    """
    def __init__(self, provider: Optional[str] = None):
        self.provider = provider or os.getenv("REPLY_PROVIDER", "hf_local")
        self.model_id = os.getenv("REPLY_MODEL_ID", "Qwen/Qwen2.5-1.5B-Instruct")
        self.max_new_tokens = int(os.getenv("GEN_MAX_NEW_TOKENS", "220"))

    def generate(
        self,
        ticket_text: str,
        intent: str,
        sentiment: str,
        priority: str,
        summary: str,
        prompt_type: str = "INSTRUCTIONAL",
        context_docs: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        prompt_type = (prompt_type or "INSTRUCTIONAL").upper().replace("-", "_")
        user_prompt = build_prompt_by_strategy(
            prompt_type, ticket_text, intent, sentiment, priority, summary, context_docs
        )

        llm = get_provider(self.provider)

        # Handle demo_fallback configuration explicitly
        if self.provider == "demo_fallback":
            reply_text = self._generate_fallback(
                ticket_text, intent, sentiment, priority, summary, prompt_type, context_docs
            )
            return {
                "text": reply_text,
                "prompt_type": prompt_type,
                "prompt_version": PROMPT_VERSION,
                "provider": "demo_fallback",
                "model_id": "demo-rule-template-v1",
                "demo_fallback": True,
            }

        try:
            if prompt_type == "SELF_CONSISTENCY":
                # Sample 3 candidate replies and pick the central/most consistent one
                candidates = llm.generate(
                    system=SYSTEM_PROMPT,
                    user=user_prompt,
                    temperature=0.7,
                    max_new_tokens=self.max_new_tokens,
                    n=3,
                )
                selected_reply = self._pick_most_consistent(candidates)
            elif prompt_type == "COT":
                raw_outs = llm.generate(
                    system=SYSTEM_PROMPT,
                    user=user_prompt,
                    temperature=0.0,
                    max_new_tokens=self.max_new_tokens + 80,
                    n=1,
                )
                selected_reply = self._extract_cot_reply(raw_outs[0])
            else:
                raw_outs = llm.generate(
                    system=SYSTEM_PROMPT,
                    user=user_prompt,
                    temperature=0.0,
                    max_new_tokens=self.max_new_tokens,
                    n=1,
                )
                selected_reply = raw_outs[0].strip()

            # Clean output
            selected_reply = self._clean_reply(selected_reply)

            if not selected_reply:
                raise ValueError("LLM generated an empty response")

            return {
                "text": selected_reply,
                "prompt_type": prompt_type,
                "prompt_version": PROMPT_VERSION,
                "provider": self.provider,
                "model_id": self.model_id,
                "demo_fallback": False,
            }

        except Exception as e:
            # Safe fallback if local LLM encounters memory limit or error
            fallback_text = self._generate_fallback(
                ticket_text, intent, sentiment, priority, summary, prompt_type, context_docs
            )
            return {
                "text": fallback_text,
                "prompt_type": prompt_type,
                "prompt_version": PROMPT_VERSION,
                "provider": "demo_fallback",
                "model_id": self.model_id,
                "demo_fallback": True,
                "warning": f"LLM provider error ({str(e)}). Switched to safe baseline template.",
            }

    def _extract_cot_reply(self, text: str) -> str:
        """Extract final reply portion from Chain-of-Thought output."""
        marker = "FINAL REPLY:"
        if marker in text:
            parts = text.split(marker, 1)
            return parts[1].strip()
        # Fallback regex if case varies
        match = re.search(r"(?:final\s+reply|reply):\s*(.*)", text, re.IGNORECASE | re.DOTALL)
        if match:
            return match.group(1).strip()
        return text.strip()

    def _pick_most_consistent(self, candidates: List[str]) -> str:
        """Pick candidate with highest average Jaccard / token similarity to peers."""
        if not candidates:
            return ""
        if len(candidates) == 1:
            return candidates[0].strip()

        token_sets = [set(re.findall(r"\w+", c.lower())) for c in candidates]
        avg_scores = []
        for i, s1 in enumerate(token_sets):
            sims = []
            for j, s2 in enumerate(token_sets):
                if i != j:
                    denom = len(s1.union(s2))
                    sims.append(len(s1.intersection(s2)) / denom if denom > 0 else 0.0)
            avg_scores.append(sum(sims) / len(sims) if sims else 0.0)

        best_idx = int(np.argmax(avg_scores))
        return candidates[best_idx].strip()

    def _clean_reply(self, text: str) -> str:
        """Strip artifact citations like [1], [2] and internal markers."""
        cleaned = re.sub(r"\[\d+\]", "", text)
        cleaned = re.sub(r"^(?:system|assistant|draft|response):\s*", "", cleaned, flags=re.I)
        return cleaned.strip()

    def _generate_fallback(
        self,
        ticket_text: str,
        intent: str,
        sentiment: str,
        priority: str,
        summary: str,
        prompt_type: str,
        context_docs: Optional[List[Dict[str, Any]]] = None,
    ) -> str:
        intent_clean = intent.replace("_", " ") if intent else "your inquiry"
        ctx_summary = ""
        if context_docs and len(context_docs) > 0:
            top_doc = context_docs[0]
            ctx_summary = f" Based on our official knowledge guidelines regarding {top_doc.get('title', intent_clean)}: {top_doc.get('text', '')}"

        if priority == "CRITICAL":
            opening = "Thank you for contacting our support team regarding this urgent matter. We take account security and urgency very seriously."
            action = f"Our operations team has flagged this case as {priority} priority.{ctx_summary} Please do not disclose sensitive credentials or full card details. An agent is reviewing the case to assist you immediately."
        elif priority == "HIGH":
            opening = f"Thank you for reaching out to SupportIQ. We understand the importance of your request regarding {intent_clean}."
            action = f"{ctx_summary} We have prioritized this inquiry. Please have any relevant transaction receipts or reference dates available so we can assist you promptly."
        else:
            opening = f"Thank you for contacting SupportIQ support. We are happy to assist you regarding {intent_clean}."
            action = f"{ctx_summary} Please let us know if you require further assistance or clarification."

        closing = "Best regards,\nSupportIQ Operations Team"
        return f"Hello,\n\n{opening}\n\n{action}\n\n{closing}"
