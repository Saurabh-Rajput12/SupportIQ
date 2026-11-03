from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class AnalyzeRequest(BaseModel):
    ticket_id: str = Field(min_length=1, max_length=64)
    subject: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=10000)
    prompt_type: str = Field(default="FEW_SHOT")

class IntentPrediction(BaseModel):
    label: str
    confidence: float
    model_id: str
    top_k: Optional[List[Dict[str, Any]]] = None
    is_confident: Optional[bool] = None

class SentimentPrediction(BaseModel):
    label: str
    confidence: float
    supported_labels: List[str]
    model_id: str
    is_uncertain: Optional[bool] = None

class PriorityRecommendation(BaseModel):
    label: str
    source: str = "rule_based"
    reasons: List[str]
    rule_version: str

class SummaryOutput(BaseModel):
    text: str
    model_id: str

class ReplyOutput(BaseModel):
    text: str
    prompt_type: str
    prompt_version: str
    provider: str
    model_id: str
    demo_fallback: bool

class AnalyzeResponse(BaseModel):
    request_id: str
    ticket_id: str
    intent: IntentPrediction
    sentiment: SentimentPrediction
    priority: PriorityRecommendation
    summary: SummaryOutput
    reply: ReplyOutput
    processing_ms: int
    warnings: List[str] = []

class SingleTextRequest(BaseModel):
    text: str = Field(min_length=1, max_length=10000)

class SummarizeRequest(BaseModel):
    text: str = Field(min_length=1, max_length=10000)
    max_new_tokens: int = Field(default=64, ge=16, le=256)

class ReplyGenerateRequest(BaseModel):
    ticket_text: str = Field(min_length=1, max_length=10000)
    intent: str
    sentiment: str
    priority: str
    summary: str
    prompt_type: str = "FEW_SHOT"
