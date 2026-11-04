"""Script to download HuggingFace models for offline inference."""
import os
import sys

# Ensure online mode during download
os.environ.pop("HF_HUB_OFFLINE", None)
os.environ.pop("TRANSFORMERS_OFFLINE", None)

from huggingface_hub import snapshot_download

REPOS = [
    "sentence-transformers/all-MiniLM-L6-v2",
    "Qwen/Qwen2.5-1.5B-Instruct",
]

def main():
    for repo in REPOS:
        print(f"[Download] Downloading {repo}...")
        try:
            snapshot_download(repo_id=repo)
            print(f"[Download] Successfully downloaded {repo}")
        except Exception as e:
            print(f"[Download] Failed downloading {repo}: {e}")
            sys.exit(1)
    print("[Download] All GenAI models downloaded successfully.")

if __name__ == "__main__":
    main()

