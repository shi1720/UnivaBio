"use client";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  FlaskConical,
  ShieldCheck,
  Code2,
  ArrowRight,
} from "lucide-react";
import { createSentenceClassifier } from "../../ml/inference";
import model from "../../ml/model.json";
import evaluation from "../../ml/evaluation.json";
const classify = createSentenceClassifier(model);
const labelNames = {
  follow_up: "Follow-up",
  pending_result: "Pending result",
  medication: "Medication",
  safety: "Safety",
  context: "Context",
  unknown: "Needs manual review",
};
export default function EvidenceView({
  onChallenge,
}: {
  onChallenge: () => void;
}) {
  const [text, setText] = useState(
    "The result is not known yet, so confirm which clinician will follow it through.",
  );
  const prediction = useMemo(() => classify(text), [text]);
  const labels = [
    "follow_up",
    "pending_result",
    "medication",
    "safety",
    "context",
  ] as const;
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">OPEN ABOUT THE EVIDENCE</div>
          <h1>Useful AI. Visible limits.</h1>
          <p>
            Inspect what the model does, where it fails, and what a person still
            needs to check.
          </p>
        </div>
        <button className="secondary-button" onClick={onChallenge}>
          <FlaskConical size={17} /> Try a challenge
        </button>
      </div>
      <div className="evidence-intro">
        <div>
          <h2>One task: recognize the kind of instruction.</h2>
          <p>
            A small trained text model suggests sentence categories. Separate
            rules preserve source spans, parse explicit timing, flag
            uncertainty, and keep medical instructions in their original
            context.
          </p>
          <p>
            Nothing becomes a confirmed follow-up until a person reviews it.
          </p>
        </div>
        <div className="model-recipe">
          <span>225 synthetic training examples</span>
          <ArrowRight size={18} />
          <span>Word + word-pair features</span>
          <ArrowRight size={18} />
          <span>5-category logistic regression</span>
        </div>
      </div>
      <section className="metrics-row" aria-label="Synthetic model evaluation">
        <div>
          <strong>
            {Math.round(evaluation.raw_top1_accuracy * 100)}
            <span>%</span>
          </strong>
          <h3>Raw category accuracy</h3>
          <p>41 of 50 held-out synthetic sentences. This ignores abstention.</p>
        </div>
        <div>
          <strong>
            {evaluation.abstained_count}
            <span>/50</span>
          </strong>
          <h3>Conservative abstentions</h3>
          <p>6 accepted predictions, all correct. Coverage is only 12%.</p>
        </div>
        <div>
          <strong>
            0<span> API calls</span>
          </strong>
          <h3>For model inference</h3>
          <p>
            Runs in the browser or our server. No external model service or key.
          </p>
        </div>
      </section>
      <div className="notice warning">
        <ShieldCheck size={20} />
        <p>
          <strong>Engineering evaluation, not clinical validation.</strong> All
          275 examples are original synthetic text, authored with AI assistance
          and not clinically annotated. There are no patient outcomes,
          real-record accuracy claims, or proven reductions in missed
          follow-ups.
        </p>
      </div>
      <section className="live-lab">
        <div>
          <div className="eyebrow">LIVE MODEL INSPECTOR</div>
          <h2>Put a sentence under the lens.</h2>
          <p>
            This runs the actual trained model on your text. The score is not a
            measure of clinical certainty.
          </p>
        </div>
        <label>
          Your example sentence
          <textarea
            rows={3}
            maxLength={2000}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        <div className="prediction-summary">
          <span
            className={
              "status " + (prediction.label === "unknown" ? "amber" : "blue")
            }
          >
            {prediction.label === "unknown"
              ? "Model abstained"
              : "Category proposed"}
          </span>
          <strong>Possible category: {labelNames[prediction.candidate]}</strong>
          <span>
            {Math.round(prediction.confidence * 100)}% uncalibrated model score
          </span>
        </div>
        <div className="score-bars">
          {labels.map((label) => (
            <div key={label}>
              <span>{labelNames[label]}</span>
              <div>
                <span style={{ width: `${prediction.scores[label] * 100}%` }} />
              </div>
              <span>{(prediction.scores[label] * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
        <p className="field-help">
          Conservative gates: model score ≥{" "}
          {Math.round(model.thresholds.min_score * 100)}%, score margin ≥{" "}
          {Math.round(model.thresholds.min_margin * 100)}%, vocabulary coverage
          ≥ {Math.round(model.thresholds.min_coverage * 100)}%, and at least{" "}
          {model.thresholds.min_tokens} tokens. Even an accepted category needs
          human review.
        </p>
      </section>
      <section className="evidence-section">
        <h2>The failures are part of the report.</h2>
        <p>
          Rows show the actual category; columns show the raw model prediction.
          Each category has 10 challenge examples.
        </p>
        <div className="table-scroll">
          <table className="confusion-table">
            <caption>
              Raw category confusion matrix · 50 synthetic examples
            </caption>
            <thead>
              <tr>
                <th scope="col">Actual / predicted</th>
                {labels.map((l) => (
                  <th scope="col" key={l}>
                    {labelNames[l]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {labels.map((row) => (
                <tr key={row}>
                  <th scope="row">{labelNames[row]}</th>
                  {labels.map((col) => (
                    <td key={col} className={row === col ? "diagonal" : ""}>
                      {evaluation.confusion_matrix_raw[row][col]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="field-help">
          Macro F1: {evaluation.macro_f1.toFixed(3)}. Conditional instructions,
          mixed instructions, negation, and unfamiliar wording remain difficult.
          The full prediction file and reproduction scripts are in the
          repository.
        </p>
      </section>
      <section className="evidence-section">
        <h2>Does it find the actions in a whole document?</h2>
        <p>
          A separate frozen challenge used 20 synthetic documents with 44
          annotated actions. The initial engine reached 84.2% suggestion
          precision and 72.7% recall. After those failures informed fixes, the
          current engine reaches 97.1% precision and 75.0% recall on the same
          known fixtures. This is a regression check, not new-document
          validation.
        </p>
        <p>
          Eleven actions still need source review. All 44 action snippets remain
          visible, which does not guarantee a person will find them. Disabling
          the classifier produces the same task outputs on this set: no added
          extraction benefit from ML has been measured here. The full report
          retains the original failures and comparison.
        </p>
      </section>
      <section className="evidence-section">
        <h2>A workflow with a reason to exist.</h2>
        <div className="reference-list">
          <a
            href="https://pubmed.ncbi.nlm.nih.gov/16027454/"
            target="_blank"
            rel="noreferrer"
          >
            <span>
              <strong>Pending results at discharge</strong>
              <small>
                Roy et al., 2005 · 2,644 patients at two academic hospitals.
                Historical evidence of the handoff gap.
              </small>
            </span>
            <ArrowUpRight size={19} />
          </a>
          <a
            href="https://healthit.gov/clinical-quality-and-safety/safer-guides"
            target="_blank"
            rel="noreferrer"
          >
            <span>
              <strong>SAFER: test results reporting and follow-up</strong>
              <small>
                Federal guidance on safer communication and follow-up. It does
                not certify Looplight.
              </small>
            </span>
            <ArrowUpRight size={19} />
          </a>
          <a
            href="https://www.ahrq.gov/patient-safety/settings/hospital/red/toolkit/redtool5.html"
            target="_blank"
            rel="noreferrer"
          >
            <span>
              <strong>AHRQ: reinforcing the discharge plan</strong>
              <small>
                Postdischarge contact, appointments, understanding, and
                caregiver concerns.
              </small>
            </span>
            <ArrowUpRight size={19} />
          </a>
        </div>
      </section>
      <section className="limits-grid">
        <div>
          <h3>Built and available</h3>
          <ul>
            <li>Original source text and traceable suggestions</li>
            <li>Human review, corrections, and history</li>
            <li>Separate result receipt and reported clinical review</li>
            <li>Sign-in and saved, account-scoped care spaces</li>
            <li>Visit brief, calendar file, and data export</li>
          </ul>
        </div>
        <div>
          <h3>Still needs real-world validation</h3>
          <ul>
            <li>Accuracy on real records and other languages</li>
            <li>Caregiver usability and staff time savings</li>
            <li>Clinical governance and health-data deployment review</li>
            <li>EHR integration and multi-user collaboration</li>
            <li>Any effect on health outcomes</li>
          </ul>
        </div>
      </section>
      <a
        className="text-button"
        href="https://github.com/shi1720/UnivaBio"
        target="_blank"
        rel="noreferrer"
      >
        <Code2 size={17} /> Read the code and model report{" "}
        <ArrowUpRight size={16} />
      </a>
    </>
  );
}
