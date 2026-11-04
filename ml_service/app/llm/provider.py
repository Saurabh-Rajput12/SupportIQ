"""LLM Providers: Local HuggingFace CausalLM, OpenAI-compatible API, and Demo Fallback."""
import os
import json
from typing import List, Dict, Any, Optional
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM

class HFLocalProvider:
    def __init__(self, model_id: Optional[str] = None):
        self.model_id = model_id or os.getenv("REPLY_MODEL_ID", "Qwen/Qwen2.5-1.5B-Instruct")
        self.device = "mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu")
        self.tokenizer = None
        self.model = None

    def load(self):
        if self.model is not None:
            return
        print(f"[HFLocalProvider] Loading LLM {self.model_id} on {self.device}...")
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_id)
        dtype = torch.float16 if self.device in ("mps", "cuda") else torch.float32
        self.model = AutoModelForCausalLM.from_pretrained(
            self.model_id,
            torch_dtype=dtype,
            low_cpu_mem_usage=True,
        ).to(self.device).eval()
        print(f"[HFLocalProvider] Successfully loaded {self.model_id}")

    def generate(
        self,
        system: str,
        user: str,
        temperature: float = 0.0,
        max_new_tokens: int = 220,
        n: int = 1,
    ) -> List[str]:
        self.load()
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ]
        prompt_text = self.tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True,
        )
        inputs = self.tokenizer(prompt_text, return_tensors="pt").to(self.device)
        input_len = inputs["input_ids"].shape[1]

        outputs = []
        for _ in range(n):
            with torch.no_grad():
                gen_tokens = self.model.generate(
                    **inputs,
                    max_new_tokens=max_new_tokens,
                    do_sample=temperature > 0.0,
                    temperature=max(temperature, 1e-5) if temperature > 0.0 else None,
                    top_p=0.9 if temperature > 0.0 else None,
                    pad_token_id=self.tokenizer.eos_token_id,
                )
            generated_ids = gen_tokens[0][input_len:]
            text = self.tokenizer.decode(generated_ids, skip_special_tokens=True).strip()
            outputs.append(text)
        return outputs


class OpenAICompatibleProvider:
    def __init__(
        self,
        api_base: Optional[str] = None,
        api_key: Optional[str] = None,
        model_id: Optional[str] = None,
    ):
        import httpx
        self.httpx = httpx
        self.api_base = (api_base or os.getenv("REPLY_API_BASE", "http://localhost:11434/v1")).rstrip("/")
        self.api_key = api_key or os.getenv("REPLY_API_KEY", "dummy")
        self.model_id = model_id or os.getenv("REPLY_MODEL_ID", "Qwen/Qwen2.5-1.5B-Instruct")

    def load(self):
        pass

    def generate(
        self,
        system: str,
        user: str,
        temperature: float = 0.0,
        max_new_tokens: int = 220,
        n: int = 1,
    ) -> List[str]:
        headers = {"Authorization": f"Bearer {self.api_key}"}
        payload = {
            "model": self.model_id,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": temperature,
            "max_tokens": max_new_tokens,
            "n": n,
        }
        res = self.httpx.post(
            f"{self.api_base}/chat/completions",
            json=payload,
            headers=headers,
            timeout=120.0,
        )
        res.raise_for_status()
        data = res.json()
        return [choice["message"]["content"].strip() for choice in data["choices"]]


class DemoFallbackProvider:
    def __init__(self, model_id: Optional[str] = None):
        self.model_id = model_id or "demo-rule-template-v1"

    def load(self):
        pass

    def generate(
        self,
        system: str,
        user: str,
        temperature: float = 0.0,
        max_new_tokens: int = 220,
        n: int = 1,
    ) -> List[str]:
        # Simple extraction from user text
        return [
            f"Dear Customer,\n\nThank you for reaching out to SupportIQ. We have received your inquiry and our operations team has noted your issue. An agent will review and update you shortly.\n\nBest regards,\nSupportIQ Operations Team"
        ] * n


_CACHED_PROVIDER = None

def get_provider(provider_type: Optional[str] = None) -> Any:
    global _CACHED_PROVIDER
    p_type = provider_type or os.getenv("REPLY_PROVIDER", "hf_local").lower()
    
    if _CACHED_PROVIDER is not None:
        return _CACHED_PROVIDER

    if p_type == "hf_local":
        _CACHED_PROVIDER = HFLocalProvider()
    elif p_type in ("openai_compatible", "api"):
        _CACHED_PROVIDER = OpenAICompatibleProvider()
    else:
        _CACHED_PROVIDER = DemoFallbackProvider()
    
    return _CACHED_PROVIDER

