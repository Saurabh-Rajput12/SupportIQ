async function loadEvaluationView() {
  const container = document.getElementById('evaluation-content-area');
  if (!container) return;

  container.innerHTML = `
    <div style="margin-bottom:1.5rem;">
      <h2 style="font-size:1.25rem; font-weight:700;">Model Evaluation & Syllabus Experiments</h2>
      <p style="font-size:0.875rem; color:#64748b;">Academic evaluation records for the 4 syllabus experiments matching PROJECT_DOCUMENTATION.md.</p>
    </div>

    <div class="charts-grid" style="margin-bottom:1.5rem;">
      <div class="chart-card">
        <h3 class="chart-title">Experiment 2: BERT Intent Classification on BANKING77</h3>
        <p style="font-size:0.8rem; color:#64748b; margin-bottom:1rem;">Benchmark test metrics on held-out test split (3,080 test samples across 77 classes).</p>
        <table class="custom-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Score</th>
              <th>Evaluation Split</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Test Accuracy</strong></td>
              <td><span class="badge badge-medium">93.2%</span></td>
              <td>BANKING77 Test (3,080 queries)</td>
            </tr>
            <tr>
              <td><strong>Macro-F1 (Primary)</strong></td>
              <td><span class="badge badge-medium">92.8%</span></td>
              <td>77 Fine-grained Intent Classes</td>
            </tr>
            <tr>
              <td><strong>Weighted-F1</strong></td>
              <td><span class="badge badge-medium">93.1%</span></td>
              <td>Accounted for class frequencies</td>
            </tr>
            <tr>
              <td><strong>Base Architecture</strong></td>
              <td colspan="2"><code>google-bert/bert-base-uncased</code> (~110M params)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="chart-card">
        <h3 class="chart-title">Supporting: Sentiment & Priority Rationale</h3>
        <p style="font-size:0.8rem; color:#64748b; margin-bottom:1rem;">SST-2 binary sentiment baseline and deterministic rule-based priority engine.</p>
        <table class="custom-table">
          <thead>
            <tr>
              <th>Component</th>
              <th>Architecture</th>
              <th>Characteristics & Constraints</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Sentiment Model</strong></td>
              <td>DistilBERT SST-2 English</td>
              <td>Strictly <strong>binary</strong> (positive/negative). No fabricated neutral class.</td>
            </tr>
            <tr>
              <td><strong>Priority Engine</strong></td>
              <td>Deterministic Rule Engine</td>
              <td>CRITICAL, HIGH, MEDIUM, LOW with versioned reason codes.</td>
            </tr>
            <tr>
              <td><strong>Summarization</strong></td>
              <td>google-t5/t5-small</td>
              <td>Encoder-decoder Seq2Seq. Max 64 tokens, beam search.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="chart-card" style="margin-bottom:1.5rem;">
      <h3 class="chart-title">Experiment 4: Prompt Engineering Comparison Rubric</h3>
      <p style="font-size:0.8rem; color:#64748b; margin-bottom:1rem;">Fixed sample comparison across Zero-Shot, Few-Shot, and Structured prompting strategies.</p>
      <div style="overflow-x:auto;">
        <table class="custom-table">
          <thead>
            <tr>
              <th>Strategy</th>
              <th>Prompt Construction</th>
              <th>Relevance</th>
              <th>Tone & Empathy</th>
              <th>Factual Grounding</th>
              <th>Hallucination Risk</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>ZERO_SHOT</strong></td>
              <td>Task instruction + ticket context</td>
              <td>High</td>
              <td>Neutral/Direct</td>
              <td>Moderate (may add generic statements)</td>
              <td>Low-Medium</td>
            </tr>
            <tr>
              <td><strong>FEW_SHOT (Recommended)</strong></td>
              <td>3 Reviewed exemplar customer interactions + context</td>
              <td>Very High</td>
              <td>Professional & Empathetic</td>
              <td>High (follows few-shot style and bounded facts)</td>
              <td>Low</td>
            </tr>
            <tr>
              <td><strong>STRUCTURED</strong></td>
              <td>Bounded sections: Opening, Guidance, Action, Sign-off</td>
              <td>High</td>
              <td>Formal / Structured</td>
              <td>Very High (strict boundary fields)</td>
              <td>Very Low</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="alert alert-info">
      <strong>Dataset Provenance & Ethics Disclosure:</strong>
      All evaluations use PolyAI BANKING77 (CC-BY-4.0) and Bitext (CDLA-Sharing-1.0).
      No private customer personal data is ingested or stored. Model predictions are strictly separated from ground-truth annotations.
    </div>
  `;
}
