import { readFileSync, writeFileSync } from "node:fs";
import { createSentenceClassifier } from "./inference";
const model = JSON.parse(
  readFileSync(new URL("./model.json", import.meta.url), "utf8"),
);
const data = JSON.parse(
  readFileSync(new URL("./data/eval.json", import.meta.url), "utf8"),
);
const examples = Array.isArray(data) ? data : data.examples;
const classify = createSentenceClassifier(model);
let correct = 0,
  accepted = 0,
  acceptedCorrect = 0;
let maxMs = 0,
  totalMs = 0;
for (const item of examples) {
  const started = performance.now();
  const p = classify(item.text);
  const elapsed = performance.now() - started;
  totalMs += elapsed;
  maxMs = Math.max(maxMs, elapsed);
  correct += p.candidate === item.label ? 1 : 0;
  if (p.label !== "unknown") {
    accepted++;
    acceptedCorrect += p.label === item.label ? 1 : 0;
  }
}
const result = {
  examples: examples.length,
  rawAccuracy: correct / examples.length,
  accepted,
  abstained: examples.length - accepted,
  acceptedCorrect,
  meanInferenceMs: totalMs / examples.length,
  maxInferenceMs: maxMs,
  scope:
    "Synthetic engineering evaluation; local machine timing, not clinical performance.",
  modelId: model.model_id,
};
console.log(JSON.stringify(result, null, 2));
writeFileSync(
  new URL("./runtime-evaluation.json", import.meta.url),
  JSON.stringify(result, null, 2) + "\n",
);
