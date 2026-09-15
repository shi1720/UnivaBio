/**
 * Looplight's local sentence-category model. No network, eval(), or dependencies.
 * This proposes a topic for review; it does not validate clinical instructions.
 */
export const CATEGORIES = [
  "follow_up", "pending_result", "medication", "safety", "context",
] as const;

export type SentenceCategory = (typeof CATEGORIES)[number];
export interface SentenceModel {
  schema_version: number;
  model_id: string;
  labels: string[];
  vocabulary: string[];
  weights: number[][];
  intercepts: number[];
  features: { bigram_weight: number; normalization: string; tokenizer: string };
  thresholds: {
    min_score: number;
    min_margin: number;
    min_coverage: number;
    min_tokens: number;
    max_tokens: number;
    max_chars: number;
  };
}
export type AbstentionReason =
  | "input_too_long"
  | "too_few_tokens"
  | "low_vocabulary_coverage"
  | "low_model_score"
  | "ambiguous_scores";

export interface SentencePrediction {
  label: SentenceCategory | "unknown";
  candidate: SentenceCategory;
  /** An uncalibrated softmax score, never clinical certainty. */
  confidence: number;
  margin: number;
  /** Fraction of tokens represented by training unigram vocabulary. */
  coverage: number;
  scores: Record<SentenceCategory, number>;
  reason: AbstentionReason | null;
}

export function tokenize(text: string): string[] {
  return (text.normalize("NFKC").toLowerCase().replace(/\u2019/g, "'")
    .match(/[a-z]+(?:'[a-z]+)?|\d+/g) ?? [])
    .map((token) => /^\d+$/.test(token) ? "<num>" : token);
}

function validateModel(model: SentenceModel): void {
  if (model.schema_version !== 1 || model.labels.length !== CATEGORIES.length ||
      !CATEGORIES.every((label, i) => model.labels[i] === label) ||
      model.weights.length !== CATEGORIES.length ||
      model.intercepts.length !== CATEGORIES.length ||
      model.weights.some((row) => row.length !== model.vocabulary.length || row.some((v) => !Number.isFinite(v))) ||
      model.intercepts.some((v) => !Number.isFinite(v)) ||
      model.features.normalization !== "l2_all_features" ||
      model.features.tokenizer !== "nfkc-lower-ascii-words-numbers-v1") {
    throw new Error("Unsupported or malformed Looplight sentence model");
  }
}

/** Create once and reuse; caches the vocabulary map outside prediction calls. */
export function createSentenceClassifier(model: SentenceModel) {
  validateModel(model);
  const vocab = new Map(model.vocabulary.map((feature, i) => [feature, i]));
  const h = model.thresholds;

  return function classifySentence(text: string): SentencePrediction {
    // Code-point limits agree with Python even when a note contains emoji.
    const characters = Array.from(text);
    const allTokens = tokenize(characters.slice(0, h.max_chars).join(""));
    const truncated = characters.length > h.max_chars || allTokens.length > h.max_tokens;
    const tokens = allTokens.slice(0, h.max_tokens);
    const features = new Map<string, number>();
    const add = (feature: string, amount: number) => {
      features.set(feature, (features.get(feature) ?? 0) + amount);
    };
    for (const token of tokens) add(`u:${token}`, 1);
    for (let i = 0; i + 1 < tokens.length; i++) {
      add(`b:${tokens[i]} ${tokens[i + 1]}`, model.features.bigram_weight);
    }
    const norm = Math.sqrt([...features.values()].reduce((sum, n) => sum + n * n, 0)) || 1;
    const x: Array<[number, number]> = [];
    for (const [feature, value] of features) {
      const index = vocab.get(feature);
      if (index !== undefined) x.push([index, value / norm]);
    }
    const logits = model.weights.map((weights, k) =>
      model.intercepts[k] + x.reduce((sum, [j, value]) => sum + weights[j] * value, 0));
    const peak = Math.max(...logits);
    const exps = logits.map((value) => Math.exp(value - peak));
    const total = exps.reduce((sum, value) => sum + value, 0);
    const probabilities = exps.map((value) => value / total);
    const ranked = probabilities.map((score, index) => ({ score, index }))
      .sort((a, b) => b.score - a.score || a.index - b.index);
    const best = ranked[0];
    const candidate = CATEGORIES[best.index];
    const margin = best.score - ranked[1].score;
    const coverage = tokens.filter((token) => vocab.has(`u:${token}`)).length / Math.max(1, tokens.length);
    const reason: AbstentionReason | null =
      truncated ? "input_too_long" :
      tokens.length < h.min_tokens ? "too_few_tokens" :
      coverage < h.min_coverage ? "low_vocabulary_coverage" :
      best.score < h.min_score ? "low_model_score" :
      margin < h.min_margin ? "ambiguous_scores" : null;
    return {
      label: reason ? "unknown" : candidate,
      candidate,
      confidence: best.score,
      margin,
      coverage,
      scores: Object.fromEntries(CATEGORIES.map((label, i) => [label, probabilities[i]])) as Record<SentenceCategory, number>,
      reason,
    };
  };
}

// Convenience API; use createSentenceClassifier for repeated calls.
export function classifySentence(text: string, model: SentenceModel): SentencePrediction {
  return createSentenceClassifier(model)(text);
}
