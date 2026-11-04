from typing import Dict, Any, List, Optional

PROMPT_VERSION = "2.0-GENAI-RAG"

SYSTEM_PROMPT = """You are an assistant that drafts customer-support replies for a human agent.
Write a concise, polite, empathetic, and professional response.
Answer only from the provided CONTEXT (trusted company knowledge).
If the CONTEXT is missing required details, say the human agent will verify them.
Never invent account balances, refunds, timelines, security approvals, or claims of actions taken.
Never ask for PINs, passwords, or full card numbers.
Do not cite sources like [1] in the final reply.
Return only the reply draft. The draft must be reviewed by a human agent and must never be sent automatically."""

FEW_SHOT_EXAMPLES = """Example 1:
Ticket: I cannot sign in after resetting my password.
Intent: passcode_forgotten
Draft Reply: I’m sorry you’re having trouble signing in. Please tap 'Forgot Passcode' on the login screen to verify via SMS and facial biometric verification. An agent can assist if the issue persists.

Example 2:
Ticket: Unrecognised transaction of $120 on my card yesterday.
Intent: card_payment_not_recognised
Draft Reply: I am sorry to hear about this unrecognised charge. Please freeze your card immediately in the app under Card Management to prevent further charges. Our fraud operations team will review the dispute once you confirm the merchant details.

Example 3:
Ticket: Card swallowed by the ATM outside the branch.
Intent: card_swallowed
Draft Reply: I am very sorry that the ATM retained your card. For your security, please freeze the card immediately in your mobile app. Retained cards cannot be returned from third-party ATMs, so please order a replacement card directly through the app."""


def build_context_block(docs: Optional[List[Dict[str, Any]]] = None) -> str:
    """Build grounded company knowledge context block for RAG."""
    if not docs:
        return "CONTEXT (company knowledge):\n(No matching company policy found. Instruct customer clearly and state that an agent will verify details.)"
    lines = []
    for i, d in enumerate(docs):
        doc_type = d.get("type", "FAQ")
        title = d.get("title") or d.get("intent", "General Policy")
        text = d.get("text", "")
        lines.append(f"[{i+1}] ({doc_type}) {title}: {text}")
    return "CONTEXT (trusted company knowledge):\n" + "\n".join(lines)


def build_zero_shot_prompt(
    ticket_text: str, intent: str, sentiment: str, priority: str, summary: str,
    docs: Optional[List[Dict[str, Any]]] = None,
) -> str:
    ctx = build_context_block(docs)
    return f"""{ctx}

TICKET CONTEXT (UNTRUSTED CUSTOMER INPUT):
<<<
{ticket_text}
>>>

ANALYSIS SIGNALS:
- Predicted Intent: {intent}
- Sentiment: {sentiment}
- Priority: {priority}
- Synopsis: {summary}

INSTRUCTIONS:
Draft a concise, professional support reply addressing the customer's issue using ONLY the CONTEXT above.
Do not invent facts or make unauthorized promises.
Draft only:"""


def build_few_shot_prompt(
    ticket_text: str, intent: str, sentiment: str, priority: str, summary: str,
    docs: Optional[List[Dict[str, Any]]] = None,
) -> str:
    ctx = build_context_block(docs)
    return f"""{ctx}

{FEW_SHOT_EXAMPLES}

Now draft a reply for this ticket:
TICKET CONTEXT (UNTRUSTED CUSTOMER INPUT):
<<<
{ticket_text}
>>>

ANALYSIS SIGNALS:
- Predicted Intent: {intent}
- Sentiment: {sentiment}
- Priority: {priority}
- Synopsis: {summary}

Follow the same concise, empathetic style as the examples above. Ground all guidance strictly in the CONTEXT.
Draft only:"""


def build_structured_prompt(
    ticket_text: str, intent: str, sentiment: str, priority: str, summary: str,
    docs: Optional[List[Dict[str, Any]]] = None,
) -> str:
    ctx = build_context_block(docs)
    return f"""{ctx}

STRUCTURED CONTEXT:
1. Intent Domain: {intent}
2. Tone Polarity: {sentiment}
3. Recommended Urgency: {priority}
4. Case Summary: {summary}

UNTRUSTED CUSTOMER MESSAGE:
<<<
{ticket_text}
>>>

RESPONSE REQUIREMENTS:
- Opening: Empathetic acknowledgment of the customer's specific problem.
- Body: Clear guidance based strictly on CONTEXT, self-service steps, or needed verification info.
- Closing: Professional agent sign-off.
- Constraints: No hallucinated policy claims, no promises of specific financial outcomes.

Draft only:"""


def build_instructional_prompt(
    ticket_text: str, intent: str, sentiment: str, priority: str, summary: str,
    docs: Optional[List[Dict[str, Any]]] = None,
) -> str:
    ctx = build_context_block(docs)
    return f"""{ctx}

TICKET (UNTRUSTED CUSTOMER INPUT):
<<<
{ticket_text}
>>>

INSTRUCTION:
Write a direct, concise, and clear customer support response to this ticket.
You must use ONLY the factual guidance provided in the CONTEXT above.
Do not include fluff. Address the user's inquiry step-by-step.
If any detail is missing from CONTEXT, tell the customer an agent will confirm the specifics.
Draft:"""


def build_conversational_prompt(
    ticket_text: str, intent: str, sentiment: str, priority: str, summary: str,
    docs: Optional[List[Dict[str, Any]]] = None,
) -> str:
    ctx = build_context_block(docs)
    return f"""{ctx}

TICKET (UNTRUSTED CUSTOMER INPUT):
<<<
{ticket_text}
>>>

INSTRUCTION:
You are a warm, helpful, and empathetic customer support agent.
Compose a friendly and reassuring reply to the customer's issue above.
Ensure all procedural instructions are 100% faithful to the CONTEXT provided.
Maintain an approachable, polite tone while maintaining strict bank security standards.
Draft:"""


def build_cot_prompt(
    ticket_text: str, intent: str, sentiment: str, priority: str, summary: str,
    docs: Optional[List[Dict[str, Any]]] = None,
) -> str:
    ctx = build_context_block(docs)
    return f"""{ctx}

TICKET (UNTRUSTED CUSTOMER INPUT):
<<<
{ticket_text}
>>>

INSTRUCTION:
Think step-by-step before drafting your response:
1. Identify the core customer problem.
2. Check which policy from CONTEXT applies.
3. Identify any missing information that the customer or agent must provide.

After thinking, write the final customer-facing draft strictly under the marker 'FINAL REPLY:'.
Reasoning:
1. Core problem:
2. Applicable policy:
3. Missing details:

FINAL REPLY:"""


def build_self_consistency_prompt(
    ticket_text: str, intent: str, sentiment: str, priority: str, summary: str,
    docs: Optional[List[Dict[str, Any]]] = None,
) -> str:
    # Generates diverse candidate replies under slight sampling temperature
    return build_instructional_prompt(ticket_text, intent, sentiment, priority, summary, docs)


def build_prompt_by_strategy(
    strategy: str,
    ticket_text: str,
    intent: str,
    sentiment: str,
    priority: str,
    summary: str,
    docs: Optional[List[Dict[str, Any]]] = None,
) -> str:
    s = (strategy or "INSTRUCTIONAL").upper().replace("-", "_")
    if s == "ZERO_SHOT":
        return build_zero_shot_prompt(ticket_text, intent, sentiment, priority, summary, docs)
    elif s == "FEW_SHOT":
        return build_few_shot_prompt(ticket_text, intent, sentiment, priority, summary, docs)
    elif s == "STRUCTURED":
        return build_structured_prompt(ticket_text, intent, sentiment, priority, summary, docs)
    elif s == "CONVERSATIONAL":
        return build_conversational_prompt(ticket_text, intent, sentiment, priority, summary, docs)
    elif s == "COT":
        return build_cot_prompt(ticket_text, intent, sentiment, priority, summary, docs)
    elif s == "SELF_CONSISTENCY":
        return build_self_consistency_prompt(ticket_text, intent, sentiment, priority, summary, docs)
    else: # Default INSTRUCTIONAL
        return build_instructional_prompt(ticket_text, intent, sentiment, priority, summary, docs)
