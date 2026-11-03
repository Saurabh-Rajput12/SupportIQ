from typing import Dict, Any

PROMPT_VERSION = "1.0"

SYSTEM_PROMPT = """You are an assistant that drafts customer-support replies for a human agent.
Write a concise, polite, empathetic and professional response.
Use only facts present in the ticket context. Do not invent account details,
refunds, delivery status, policy terms, approvals, or actions already taken.
If information is missing, ask a clear follow-up question or say the agent
must verify it. Do not claim that you have performed an action.
Return only the reply draft. The draft must be reviewed by a human agent
and must never be sent automatically."""

FEW_SHOT_EXAMPLES = """Example 1
Ticket: I cannot sign in after resetting my password.
Intent: login_issue
Draft Reply: I’m sorry you’re having trouble signing in. Please confirm whether the password-reset email arrived and whether you see a specific error message. We can then guide you through the next verification steps.

Example 2
Ticket: My invoice has the wrong billing address.
Intent: invoice_update
Draft Reply: Thanks for letting us know. Please share the correct billing details and your invoice reference through our secure portal so an agent can verify the account record and advise on the update process.

Example 3
Ticket: Card swallowed by the ATM outside the bank.
Intent: card_swallowed
Draft Reply: I am sorry to hear that your card was retained by the machine. For your security, please let us know if your card is temporarily blocked in your mobile app, and visit the branch during operating hours with valid government ID to retrieve or re-issue your card."""

def build_zero_shot_prompt(ticket_text: str, intent: str, sentiment: str, priority: str, summary: str) -> str:
    return f"""TICKET CONTEXT (UNTRUSTED CUSTOMER INPUT):
<<<
{ticket_text}
>>>

ANALYSIS SIGNALS:
- Predicted Intent: {intent}
- Sentiment: {sentiment}
- Priority: {priority}
- Synopsis: {summary}

INSTRUCTIONS:
Draft a concise, professional, empathetic support reply addressing the issue above.
Do not invent facts, account details, or claim any refund/investigation has already concluded.
Draft only:"""

def build_few_shot_prompt(ticket_text: str, intent: str, sentiment: str, priority: str, summary: str) -> str:
    return f"""{FEW_SHOT_EXAMPLES}

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

Follow the same concise, empathetic style as the examples above.
Draft only:"""

def build_structured_prompt(ticket_text: str, intent: str, sentiment: str, priority: str, summary: str) -> str:
    return f"""STRUCTURED CONTEXT:
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
- Body: Clear guidance, request for necessary verification references, or self-service step.
- Closing: Professional agent sign-off.
- Constraints: No hallucinated policy claims, no promises of specific financial outcomes.

Draft only:"""

