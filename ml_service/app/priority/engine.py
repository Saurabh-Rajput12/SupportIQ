from typing import Dict, Any, List, Optional

RULE_VERSION = "1.0"

CRITICAL_TERMS = (
    "account hacked",
    "card stolen",
    "stolen card",
    "fraud",
    "unauthorized access",
    "unauthorized transaction",
    "compromised card",
    "card swallowed",
    "identity theft",
    "hacked",
)

URGENT_TERMS = (
    "immediately",
    "urgent",
    "urgently",
    "right now",
    "as soon as possible",
    "asap",
    "emergency",
    "locked out",
    "deadline",
)

HIGH_IMPACT_INTENTS = {
    "cash_withdrawal_not_recognised",
    "card_payment_not_recognised",
    "lost_or_stolen_card",
    "compromised_card",
    "card_swallowed",
    "passcode_forgotten",
    "pin_blocked",
    "direct_debit_payment_not_recognised",
}

LOW_IMPACT_INTENTS = {
    "age_limit",
    "country_support",
    "fiat_currency_support",
    "supported_cards_and_currencies",
    "exchange_rate",
    "order_physical_card",
    "getting_virtual_card",
}

class PriorityEngine:
    """
    SupportIQ Rule-Based Priority Engine.
    Produces transparent, deterministic triage recommendations with explicit reason codes.
    Priority is NEVER an unexplained black-box classification.
    Levels: CRITICAL, HIGH, MEDIUM, LOW.
    """

    @staticmethod
    def evaluate(
        text: str,
        intent_label: Optional[str] = None,
        sentiment: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        t = text.casefold() if text else ""
        reasons: List[str] = []

        # 1. Critical Security & Safety Rule
        matched_critical = [term for term in CRITICAL_TERMS if term in t]
        if matched_critical:
            reasons.append("SECURITY_OR_FRAUD_KEYWORD")
            return {
                "label": "CRITICAL",
                "source": "rule_based",
                "reasons": reasons,
                "matched_terms": matched_critical,
                "rule_version": RULE_VERSION,
            }

        # 2. Urgency language rule
        matched_urgent = [term for term in URGENT_TERMS if term in t]
        has_urgency = bool(matched_urgent)
        if has_urgency:
            reasons.append("EXPLICIT_URGENCY_LANGUAGE")

        # 3. Negative sentiment observation (does NOT alone cause CRITICAL)
        sentiment_label = sentiment.get("label", "").lower() if sentiment else ""
        if sentiment_label == "negative":
            reasons.append("NEGATIVE_SENTIMENT_SIGNAL_ONLY")

        # 4. High-impact intent evaluation
        is_high_impact = bool(intent_label and intent_label in HIGH_IMPACT_INTENTS)
        if is_high_impact:
            reasons.append("HIGH_IMPACT_INTENT")

        # Decision hierarchy
        if has_urgency and is_high_impact:
            return {
                "label": "HIGH",
                "source": "rule_based",
                "reasons": reasons,
                "rule_version": RULE_VERSION,
            }

        if is_high_impact or has_urgency:
            return {
                "label": "HIGH",
                "source": "rule_based",
                "reasons": reasons,
                "rule_version": RULE_VERSION,
            }

        if intent_label and intent_label in LOW_IMPACT_INTENTS and not has_urgency:
            reasons.append("LOW_IMPACT_INFORMATION")
            return {
                "label": "LOW",
                "source": "rule_based",
                "reasons": reasons,
                "rule_version": RULE_VERSION,
            }

        if intent_label:
            reasons.append("STANDARD_SUPPORT_REQUEST")
            return {
                "label": "MEDIUM",
                "source": "rule_based",
                "reasons": reasons,
                "rule_version": RULE_VERSION,
            }

        reasons.append("NO_CLASSIFIED_INTENT")
        return {
            "label": "LOW",
            "source": "rule_based",
            "reasons": reasons,
            "rule_version": RULE_VERSION,
        }
