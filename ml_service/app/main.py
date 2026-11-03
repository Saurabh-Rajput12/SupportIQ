from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from .schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    SingleTextRequest,
    SummarizeRequest,
    ReplyGenerateRequest,
)
from .pipeline import get_pipeline

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Model warm up on startup
    pipeline = get_pipeline()
    pipeline.warm_up()
    yield

app = FastAPI(
    title="SupportIQ ML Service",
    description="NLP Inference Service: BERT Intent Classification, Sentiment Analysis, Rule-Based Priority, T5 Summarization, and Few-Shot Reply Drafting.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok", "service": "supportiq-ml-service"}

@app.get("/ready")
def ready():
    pipeline = get_pipeline()
    return {
        "ready": True,
        "models": {
            "intent": "supportiq-bert-banking77-v1",
            "sentiment": "distilbert-base-uncased-finetuned-sst-2-english",
            "priority": "rule-based-engine-v1.0",
            "summary": "google-t5/t5-small",
            "reply": "supportiq-prompt-engine-v1",
        }
    }

@app.post("/api/v1/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest):
    try:
        pipeline = get_pipeline()
        return pipeline.analyze(req.model_dump())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis pipeline error: {str(e)}")

@app.post("/api/v1/intent/predict")
def predict_intent(req: SingleTextRequest):
    try:
        pipeline = get_pipeline()
        clean_text = pipeline.cleaner.clean(req.text)
        return pipeline.intent_classifier.predict(clean_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/sentiment/predict")
def predict_sentiment(req: SingleTextRequest):
    try:
        pipeline = get_pipeline()
        clean_text = pipeline.cleaner.clean(req.text)
        return pipeline.sentiment_analyzer.predict(clean_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/summarize")
def summarize(req: SummarizeRequest):
    try:
        pipeline = get_pipeline()
        clean_text = pipeline.cleaner.clean(req.text)
        return pipeline.t5_summarizer.summarize(clean_text, max_new_tokens=req.max_new_tokens)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/reply/generate")
def generate_reply(req: ReplyGenerateRequest):
    try:
        pipeline = get_pipeline()
        clean_text = pipeline.cleaner.clean(req.ticket_text)
        return pipeline.reply_generator.generate(
            ticket_text=clean_text,
            intent=req.intent,
            sentiment=req.sentiment,
            priority=req.priority,
            summary=req.summary,
            prompt_type=req.prompt_type,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
