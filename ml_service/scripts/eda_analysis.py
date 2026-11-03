import json
import os
import numpy as np
import pandas as pd
from datasets import load_from_disk

def run_eda():
    dataset_path = "data/raw/banking77"
    if not os.path.exists(dataset_path):
        raise FileNotFoundError(f"Dataset path {dataset_path} does not exist.")

    ds = load_from_disk(dataset_path)
    train_df = pd.DataFrame(ds["train"])
    test_df = pd.DataFrame(ds["test"])

    # Load label mapping
    with open("data/processed/banking77_id2label.json", "r") as f:
        id2label = json.load(f)

    train_df["intent_name"] = train_df["label"].map(lambda x: id2label.get(str(x), str(x)))
    test_df["intent_name"] = test_df["label"].map(lambda x: id2label.get(str(x), str(x)))

    train_df["char_len"] = train_df["text"].str.len()
    train_df["word_count"] = train_df["text"].str.split().str.len()

    class_counts = train_df["intent_name"].value_counts()

    eda_summary = {
        "train_rows": len(train_df),
        "test_rows": len(test_df),
        "num_classes": int(train_df["label"].nunique()),
        "missing_text_train": int(train_df["text"].isna().sum()),
        "missing_label_train": int(train_df["label"].isna().sum()),
        "exact_duplicates_train": int(train_df.duplicated(subset=["text"]).sum()),
        "char_length_stats": {
            "mean": float(train_df["char_len"].mean()),
            "std": float(train_df["char_len"].std()),
            "min": int(train_df["char_len"].min()),
            "max": int(train_df["char_len"].max()),
            "p50": float(train_df["char_len"].median()),
            "p95": float(train_df["char_len"].quantile(0.95))
        },
        "word_count_stats": {
            "mean": float(train_df["word_count"].mean()),
            "std": float(train_df["word_count"].std()),
            "min": int(train_df["word_count"].min()),
            "max": int(train_df["word_count"].max()),
            "p50": float(train_df["word_count"].median()),
            "p95": float(train_df["word_count"].quantile(0.95))
        },
        "class_balance": {
            "min_samples_per_class": int(class_counts.min()),
            "max_samples_per_class": int(class_counts.max()),
            "mean_samples_per_class": float(class_counts.mean())
        }
    }

    os.makedirs("reports", exist_ok=True)
    with open("reports/eda_summary.json", "w", encoding="utf-8") as f:
        json.dump(eda_summary, f, indent=2)

    print("[EDA] Analysis completed successfully:")
    print(json.dumps(eda_summary, indent=2))

if __name__ == "__main__":
    run_eda()

