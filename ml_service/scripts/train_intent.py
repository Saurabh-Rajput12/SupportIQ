import argparse
import json
import os
import time
import numpy as np
import torch
from datasets import load_from_disk
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer,
    DataCollatorWithPadding,
)

def compute_metrics(eval_pred):
    logits, y_true = eval_pred
    y_pred = np.argmax(logits, axis=-1)
    p, r, f1, _ = precision_recall_fscore_support(
        y_true, y_pred, average="macro", zero_division=0
    )
    weighted_p, weighted_r, weighted_f1, _ = precision_recall_fscore_support(
        y_true, y_pred, average="weighted", zero_division=0
    )
    acc = accuracy_score(y_true, y_pred)
    return {
        "accuracy": float(acc),
        "macro_precision": float(p),
        "macro_recall": float(r),
        "macro_f1": float(f1),
        "weighted_f1": float(weighted_f1),
    }

def main():
    parser = argparse.ArgumentParser(description="Train or evaluate BERT on BANKING77")
    parser.add_argument("--model_id", type=str, default="google-bert/bert-base-uncased")
    parser.add_argument("--output_dir", type=str, default="models/intent_classifier")
    parser.add_argument("--epochs", type=int, default=1)
    parser.add_argument("--batch_size", type=int, default=16)
    parser.add_argument("--eval_batch_size", type=int, default=32)
    parser.add_argument("--max_length", type=int, default=128)
    parser.add_argument("--learning_rate", type=float, default=2e-5)
    parser.add_argument("--max_train_samples", type=int, default=None)
    parser.add_argument("--max_test_samples", type=int, default=None)
    parser.add_argument("--eval_only", action="store_true")
    args = parser.parse_args()

    device = "mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[BERT Intent] Using device: {device}")

    # Load dataset from local cache
    dataset_path = "data/raw/banking77"
    if not os.path.exists(dataset_path):
        raise FileNotFoundError(f"Dataset path {dataset_path} not found. Run download_datasets.py first.")

    raw = load_from_disk(dataset_path)
    labels = raw["train"].features["label"].names
    label2id = {name: i for i, name in enumerate(labels)}
    id2label = {i: name for i, name in enumerate(labels)}

    tokenizer = AutoTokenizer.from_pretrained(args.model_id)

    def tokenize(batch):
        return tokenizer(batch["text"], truncation=True, max_length=args.max_length)

    train_valid = raw["train"].train_test_split(
        test_size=0.1, seed=42, stratify_by_column="label"
    )
    train_ds = train_valid["train"]
    valid_ds = train_valid["test"]
    test_ds = raw["test"]

    if args.max_train_samples and args.max_train_samples < len(train_ds):
        train_ds = train_ds.select(range(args.max_train_samples))
    if args.max_test_samples and args.max_test_samples < len(test_ds):
        test_ds = test_ds.select(range(args.max_test_samples))
        valid_ds = valid_ds.select(range(min(len(valid_ds), args.max_test_samples)))

    print(f"[BERT Intent] Splits: train={len(train_ds)}, valid={len(valid_ds)}, test={len(test_ds)}")

    tokenized_train = train_ds.map(tokenize, batched=True)
    tokenized_valid = valid_ds.map(tokenize, batched=True)
    tokenized_test = test_ds.map(tokenize, batched=True)

    model_source = args.output_dir if args.eval_only else args.model_id
    model = AutoModelForSequenceClassification.from_pretrained(
        model_source,
        num_labels=len(labels),
        id2label=id2label,
        label2id=label2id,
    )

    training_args = TrainingArguments(
        output_dir="models/intent_checkpoints",
        learning_rate=args.learning_rate,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.eval_batch_size,
        num_train_epochs=args.epochs,
        weight_decay=0.01,
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="macro_f1",
        report_to="none",
        seed=42,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_train,
        eval_dataset=tokenized_valid,
        processing_class=tokenizer,
        data_collator=DataCollatorWithPadding(tokenizer),
        compute_metrics=compute_metrics,
    )

    start_time = time.time()
    if not args.eval_only:
        print("[BERT Intent] Starting training...")
        train_result = trainer.train()
        train_duration = time.time() - start_time
        print(f"[BERT Intent] Training completed in {train_duration:.2f} seconds.")

    print("[BERT Intent] Evaluating on held-out test split...")
    test_metrics = trainer.evaluate(tokenized_test)
    print("TEST METRICS:", test_metrics)

    # Save final model artifact and tokenizer
    os.makedirs(args.output_dir, exist_ok=True)
    trainer.save_model(args.output_dir)
    tokenizer.save_pretrained(args.output_dir)

    with open(os.path.join(args.output_dir, "label2id.json"), "w") as f:
        json.dump(label2id, f, indent=2)
    with open(os.path.join(args.output_dir, "id2label.json"), "w") as f:
        json.dump(id2label, f, indent=2)

    os.makedirs("reports", exist_ok=True)
    report_data = {
        "model_id": args.model_id,
        "date": "2026-11-03",
        "device": device,
        "test_metrics": test_metrics,
        "num_classes": len(labels),
    }
    with open("reports/intent_evaluation_results.json", "w") as f:
        json.dump(report_data, f, indent=2)

    print(f"[BERT Intent] Model and tokenizer saved to {args.output_dir}")
    print("[BERT Intent] Evaluation report saved to reports/intent_evaluation_results.json")

if __name__ == "__main__":
    main()

