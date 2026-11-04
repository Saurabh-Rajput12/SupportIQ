import os
os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from .schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    SingleTextRequest,
    SummarizeRequest,
    ReplyGenerateRequest,
    RetrieveRequest,
    RetrieveResponse,
    SimilarRequest,
    SimilarResponse,
)
from .pipeline import get_pipeline

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Model warm up on startup
    pipeline = get_pipeline()
    pipeline.warm_up()
    yield

app = FastAPI(
    title="SupportIQ GenAI RAG Service",
    description="GenAI Support Copilot: BERT Intent, Sentiment, Priority Rules, T5 Summarization, FAISS Vector Search, Real LLM RAG, Groundedness Checking, and LLM-as-a-Judge.",
    version="2.0.0",
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
    return {"status": "ok", "service": "supportiq-genai-service", "version": "2.0.0"}

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
            "embedding": os.getenv("EMBED_MODEL_ID", "sentence-transformers/all-MiniLM-L6-v2"),
            "llm": os.getenv("REPLY_MODEL_ID", "Qwen/Qwen2.5-1.5B-Instruct"),
            "vector_store": "faiss-index-flat-ip",
        },
        "rag_index_docs": pipeline.store.index.ntotal if pipeline.store.index else 0,
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

@app.post("/api/v1/retrieve", response_model=RetrieveResponse)
def retrieve(req: RetrieveRequest):
    try:
        pipeline = get_pipeline()
        clean_query = pipeline.cleaner.clean(req.query)
        docs = pipeline.store.search(
            query=clean_query,
            k=req.k,
            doc_types=req.doc_types,
            min_score=req.min_score,
        )
        return {"query": req.query, "count": len(docs), "docs": docs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/similar", response_model=SimilarResponse)
def similar_tickets(req: SimilarRequest):
    try:
        pipeline = get_pipeline()
        clean_query = pipeline.cleaner.clean(req.query)
        similar = pipeline.store.search(
            query=clean_query,
            k=req.k,
            doc_types=["PAST_TICKET", "LIVE_TICKET"],
        )
        is_dup = bool(similar and float(similar[0].get("score", 0.0)) >= 0.90)
        return {"query": req.query, "similar_tickets": similar, "is_duplicate": is_dup}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/reply/generate")
def generate_reply(req: ReplyGenerateRequest):
    try:
        pipeline = get_pipeline()
        clean_text = pipeline.cleaner.clean(req.ticket_text)
        
        # If no context docs provided explicitly, retrieve top knowledge articles
        docs = req.context_docs
        if docs is None:
            docs = pipeline.store.search(clean_text, k=pipeline.rag_top_k, doc_types=["FAQ", "POLICY", "APPROVED_REPLY"])

        return pipeline.reply_generator.generate(
            ticket_text=clean_text,
            intent=req.intent,
            sentiment=req.sentiment,
            priority=req.priority,
            summary=req.summary,
            prompt_type=req.prompt_type,
            context_docs=docs,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
