import os
import json
from datasets import load_dataset

def main():
    os.makedirs("data/raw", exist_ok=True)
    os.makedirs("reports", exist_ok=True)

    print("[Stage 1] Downloading PolyAI/banking77 dataset...")
    banking = load_dataset("PolyAI/banking77")
    print(banking)

    features = banking["train"].features
    labels = features["label"].names
    print(f"Total intent labels: {len(labels)}")

    # Save raw to disk
    banking.save_to_disk("data/raw/banking77")
    print("[Stage 1] Saved raw banking77 dataset to data/raw/banking77")

    # Save metadata
    metadata = {
        "dataset": "PolyAI/banking77",
        "license": "CC-BY-4.0",
        "retrieval_date": "2026-11-03",
        "num_classes": len(labels),
        "splits": {s: len(banking[s]) for s in banking},
        "columns": banking["train"].column_names,
        "features": str(features),
        "labels": labels
    }

    with open("reports/banking77_metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    # Save label mappings for stable reference
    label2id = {name: i for i, name in enumerate(labels)}
    id2label = {i: name for i, name in enumerate(labels)}
    os.makedirs("data/processed", exist_ok=True)
    with open("data/processed/banking77_label2id.json", "w", encoding="utf-8") as f:
        json.dump(label2id, f, indent=2)
    with open("data/processed/banking77_id2label.json", "w", encoding="utf-8") as f:
        json.dump(id2label, f, indent=2)

    print("[Stage 1] polyai/banking77 metadata and label mappings exported successfully.")

if __name__ == "__main__":
    main()

