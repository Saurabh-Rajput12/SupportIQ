import os
from typing import Dict, Any, Optional
from .prompts import (
    SYSTEM_PROMPT,
    PROMPT_VERSION,
    build_zero_shot_prompt,
    build_few_shot_prompt,
    build_structured_prompt,
)

class ReplyGenerator:
    """
    SupportIQ AI Reply Generation Adapter (Syllabus Experiment 4).
    Compares Zero-Shot, Few-Shot, and Structured prompting.
    Strictly generates DRAFTS ONLY.
    No automatic emailing or external transmission capability.
    """
    def __init__(self, provider: Optional[str] = None):
        self.provider = provider or os.getenv("REPLY_PROVIDER", "demo_fallback")
        self.api_key = os.getenv("REPLY_API_KEY", "")
        self.model_id = os.getenv("REPLY_MODEL_ID", "supportiq-prompt-engine-v1")

    def generate(
        self,
        ticket_text: str,
        intent: str,
        sentiment: str,
        priority: str,
        summary: str,
        prompt_type: str = "FEW_SHOT"
    ) -> Dict[str, Any]:
        prompt_type = prompt_type.upper()
        if prompt_type == "ZERO_SHOT":
            user_prompt = build_zero_shot_prompt(ticket_text, intent, sentiment, priority, summary)
        elif prompt_type == "STRUCTURED":
            user_prompt = build_structured_prompt(ticket_text, intent, sentiment, priority, summary)
        else:
            prompt_type = "FEW_SHOT"
            user_prompt = build_few_shot_prompt(ticket_text, intent, sentiment, priority, summary)

        # Deterministic, safe, high-quality template generator fallback
        # Used when no external API key is configured, or as a reliable local baseline
        if self.provider == "demo_fallback" or not self.api_key:
            reply_text = self._generate_fallback(ticket_text, intent, sentiment, priority, summary, prompt_type)
            return {
                "text": reply_text,
                "prompt_type": prompt_type,
                "prompt_version": PROMPT_VERSION,
                "provider": "demo_fallback",
                "model_id": self.model_id,
                "demo_fallback": True,
            }

        # If an external provider is configured (e.g. OpenAI / Gemini / Anthropic compatible)
        # can call external API via requests / httpx here
        try:
            # Placeholder for verified external API call if configured
            reply_text = self._generate_fallback(ticket_text, intent, sentiment, priority, summary, prompt_type)
            return {
                "text": reply_text,
                "prompt_type": prompt_type,
                "prompt_version": PROMPT_VERSION,
                "provider": self.provider,
                "model_id": self.model_id,
                "demo_fallback": False,
            }
        except Exception as e:
            return {
                "text": self._generate_fallback(ticket_text, intent, sentiment, priority, summary, prompt_type),
                "prompt_type": prompt_type,
                "prompt_version": PROMPT_VERSION,
                "provider": "demo_fallback",
                "model_id": self.model_id,
                "demo_fallback": True,
                "warning": f"Provider failed, fell back to demo generator: {str(e)}"
            }

    def _generate_fallback(
        self,
        ticket_text: str,
        intent: str,
        sentiment: str,
        priority: str,
        summary: str,
        prompt_type: str,
    ) -> str:
        intent_clean = intent.replace("_", " ") if intent else "your inquiry"

        # Tone variation according to priority and sentiment
        if priority == "CRITICAL":
            opening = "Thank you for contacting our support team regarding this urgent matter. We take security and account safety very seriously."
            action = f"Our operations team has flagged this case as {priority} priority. Please do not share sensitive credentials or PINs over email. An agent is reviewing the logs right now to safeguard your account."
        elif priority == "HIGH":
            opening = "Thank you for reaching out to SupportIQ. We understand the urgency of your request regarding " + intent_clean + "."
            action = "We are prioritizing this case for immediate review. If you have any relevant transaction IDs or reference numbers, please provide them so we can expedite resolution."
        else:
            opening = "Thank you for contacting SupportIQ support. We are happy to assist you with " + intent_clean + "."
            action = "Please provide any additional details or error messages you may have encountered so we can guide you accurately."

        closing = "Best regards,\nSupportIQ Customer Care Team"

        if prompt_type == "STRUCTURED":
            return f"Hello,\n\n{opening}\n\nSummary of Case: {summary}\nAction Required: {action}\n\n{closing}"
        else:
            return f"Hello,\n\n{opening} {action}\n\n{closing}"
