import { extractDate, isISODate } from "./dates";
import type { CareLoop, Category, Episode, Sentence } from "./types";
import model from "../ml/model.json";
import { createSentenceClassifier } from "../ml/inference";
const classifier = createSentenceClassifier(model);
function scoreSentence(text: string): { label: Category; score: number } {
  const result = classifier(text);
  return { label: result.label, score: result.confidence };
}
export const ENGINE_VERSION = "looplight-hybrid-1.2";
const MAX_PROPOSALS = 100;
const actionWords =
  /\b(follow[ -]?up|repeat|recheck|appointment|referral|refer|schedule|arrange|book|review|attend|return to (?:the )?(?:clinic|practice|doctor)|see your|see the|see Dr\.?|contact|call your|call the|pending|awaiting|awaited|outstanding|unreported|unavailable at discharge|not yet (?:available|back|reported|reviewed)|yet to be (?:reported|reviewed))\b/i;
const pendingWords =
  /\b(pending|awaiting|awaited|outstanding|unreported|unavailable at discharge|not yet (?:available|back|reported|reviewed)|yet to be (?:reported|reviewed))\b/i;
const followupWords =
  /\b(follow[ -]?up|repeat|recheck|appointment|referral|refer|schedule|arrange|book|attend|see your|see the|see Dr\.?|return to (?:the )?(?:clinic|practice|doctor))\b/i;
const medication =
  /\b(\d+\s*(mg|mcg|ml)|tablets?|capsules?|dosage|take\s+\w+\s+(daily|twice)|medication|medicines?|prescription|insulin|antibiotic|warfarin)\b/i;
const safety =
  /\b(emergency|urgent medical|immediately|chest pain|difficulty breathing|shortness of breath|severe pain|(?:call|dial|phone)\s+(?:911|999|112))\b/i;
const negation =
  /\b(no\s+(?:(?:further|additional|routine|repeat|specialist|outpatient|blood|test|results?|tests?|outstanding|remaining)\s+)*(?:follow[ -]?up|testing|tests?|results?|appointment|referral|labs?|pending)|do not\s+(?:repeat|recheck|schedule|arrange|book)|(?:not|never)\s+(?:required|needed|pending|indicated|outstanding))\b/i;
// Scope negation to one clause; unrelated negative symptoms must not suppress a result.
const negativeCareFrame =
  /\b(?:no|none of (?:the|these|our))\s+[^,;.!?\n]{0,90}?\b(?:reviews?|samples?|specimens?|reports?|results?|imaging|scans?|tests?|testing|appointments?|referrals?|follow[ -]?up)\b[^,;.!?\n]{0,70}?\b(?:needed|required|indicated|pending|awaiting|outstanding|left to chase)\b/i;
const missingResult =
  /\b(?:results?|reports?|findings)\b[^;.!?\n]{0,90}?\b(?:has|have|is|are)\s+(?:still\s+)?not\s+(?:yet\s+)?(?:arrived|back|available|reached|returned|reported|finalized|finalised)\b/i;
const sectionLabel =
  /^(?:(?:conditional|routine|recommended|your next)\s+)?(?:follow[ -]?up|result tracking|aftercare|appointments?|pending reports?)(?:\s+(?:and\s+(?:warning signs|aftercare|result tracking)|instructions?|plan|recommendations?|notes|summary))?\s*:?$/i;
const historical =
  /\b(?:(?:was|were|(?:has|have|had)\s+(?:already\s+)?been|already)\s+(?:already\s+)?(?:completed|reviewed|received|normal|negative|resolved|performed|done)|(?:appointment|review|follow[ -]?up)\s+(?:took place|occurred|was completed)|attended|(?:previous|last)\s+(?:appointment|review|follow[ -]?up))\b/i;
const injection =
  /\b(ignore (?:all |previous |prior )?(?:instructions|rules)|system prompt|developer message|reveal (?:the )?(?:key|token|secret)|send.*(?:https?:\/\/)|mark (?:all|every).*closed)\b/i;
const heading =
  /^(?:FICTIONAL EXAMPLE(?:\s*[-–—:]?.*)?|NOT A REAL PATIENT RECORD|\[Page \d+\]|(?:follow[ -]?up(?: care)?|discharge|aftercare|review|pending tests?|pending results?)(?:\s+(?:instructions?|plan|recommendations?|notes|summary))?\s*:?)$/i;
const nextAction =
  "(?:please\\s+)?(?:repeat|recheck|schedule|arrange|book|refer|review|follow[ -]?up|attend|return\\s+to|see\\s+(?:your|the|Dr\\.?))\\b";
function splitActionClauses(
  source: string,
  start: number,
  end: number,
): { text: string; start: number; end: number }[] {
  const text = source.slice(start, end),
    parts: { text: string; start: number; end: number }[] = [];
  const boundaries = new RegExp(`(?:;\\s*|\\s+and\\s+)(?=${nextAction})`, "gi");
  let from = 0;
  const push = (left: number, right: number) => {
    const segment = text.slice(left, right),
      leading = segment.match(/^\s*/)?.[0].length ?? 0,
      trailing = segment.match(/\s*$/)?.[0].length ?? 0;
    if (right - left > leading + trailing)
      parts.push({
        text: source.slice(start + left + leading, start + right - trailing),
        start: start + left + leading,
        end: start + right - trailing,
      });
  };
  for (const boundary of text.matchAll(boundaries)) {
    // A leading condition can govern both actions. Keep it attached for review.
    if (
      /\b(if|unless|when|provided|only if)\b/i.test(
        text.slice(from, boundary.index!),
      )
    )
      continue;
    // In a coordinated prohibition, 'do not' may govern the verb after 'and'.
    if (
      !boundary[0].startsWith(";") &&
      /\b(no|not|never|neither|don't|avoid)\b/i.test(
        text.slice(from, boundary.index!),
      )
    )
      continue;
    push(from, boundary.index!);
    from = boundary.index! + boundary[0].length;
  }
  push(from, text.length);
  return parts;
}
export function splitSentences(
  source: string,
): { text: string; start: number; end: number }[] {
  const parts: { text: string; start: number; end: number }[] = [];
  // Preserve exact UTF-16 string spans. Newlines separate instructions; Dr. and decimals do not.
  const re = /.+?(?:[.!?](?=\s|$)|$)/g;
  let lineOffset = 0;
  for (const line of source.split("\n")) {
    const masked = line
      .replace(
        /\b(?:Dr|Mr|Mrs|Ms|e\.g|i\.e)\./g,
        (x) => x.slice(0, -1) + "\uE000",
      )
      .replace(/(\d)\.(?=\d)/g, "$1\uE000");
    for (const match of masked.matchAll(re)) {
      const leading = match[0].match(/^\s*/)?.[0].length ?? 0;
      const trailing = match[0].match(/\s*$/)?.[0].length ?? 0;
      const start = lineOffset + match.index! + leading,
        end = lineOffset + match.index! + match[0].length - trailing;
      if (end > start) parts.push(...splitActionClauses(source, start, end));
    }
    lineOffset += line.length + 1;
  }
  return parts;
}
function friendlyTitle(text: string, category: Category): string {
  const trimmed = text
    .replace(/^\s*[-*•\d.)]+\s*/, "")
    .replace(
      /^(follow[- ]?up(?: plan)?|plan|pending tests|tests pending):\s*/i,
      "",
    );
  if (category === "pending_result") {
    const shortened = trimmed
      .replace(
        /\s+(?:are|is|remain|remains|were|was)\s+(?:still\s+)?(?:pending|awaited|outstanding|unreported).*$/i,
        "",
      )
      .replace(/\s+(?:is|are)\s+not yet (?:available|back).*$/i, "");
    if (shortened !== trimmed && shortened.length < 100) {
      const subject = shortened.replace(/^(?:the|an?|your)\s+/i, "");
      const clean = subject.charAt(0).toLowerCase() + subject.slice(1);
      return `Check the ${clean}${/\b(?:result|report)s?$/i.test(clean) ? "" : " result"}`.replace(
        /results$/,
        "result",
      );
    }
  }
  if (/^follow[ -]?up with (?:your |the )?primary care/i.test(trimmed))
    return "Follow up with primary care";

  return trimmed.length > 140 ? trimmed.slice(0, 137) + "…" : trimmed;
}
function documentedOwner(text: string): string {
  const team = text.match(
    /\b(?:your |the )?(primary care (?:clinician|doctor|physician|provider)|GP|PCP|cardiolog(?:ist|y team)|renal team|kidney team|discharging team|hospital team|respiratory (?:team|clinic))\b/i,
  );
  // Keep name matching case-sensitive so 'Dr. Smith in 7 days' cannot name 'Dr. Smith in'.
  const named = text.match(
    /\bDr\.?\s+[A-Z][\w-]+(?:\s+(?!(?:In|On|At|For|Within|After|Before|And|Will)\b)[A-Z][\w-]+)?\b/,
  );
  return (
    [team, named]
      .filter((match): match is RegExpMatchArray => match !== null)
      .sort((a, b) => a.index! - b.index!)[0]?.[0] ?? ""
  );
}
export function analyzeDocument(
  input: {
    patientName: string;
    documentTitle: string;
    dischargeDate: string;
    sourceText: string;
  },
  id: string = crypto.randomUUID(),
): Episode {
  if (input.sourceText.length > 40000)
    throw Error("Keep the source under 40,000 characters.");
  if (!isISODate(input.dischargeDate))
    throw Error("Choose a valid discharge date.");
  const now = new Date().toISOString();
  const sourceText = input.sourceText.replace(/\r\n?/g, "\n");
  const sentences: Sentence[] = [],
    loops: CareLoop[] = [];
  const seen = new Set<string>();
  for (const [index, part] of splitSentences(sourceText).entries()) {
    const result = scoreSentence(part.text);
    let category = result.label;
    let reason =
      "No follow-up proposed. Review the original sentence for omissions.";
    let suggested = false;
    const flags: string[] = [];
    const hasSafety = safety.test(part.text),
      hasMedication = medication.test(part.text),
      hasNegation =
        negation.test(part.text) || negativeCareFrame.test(part.text),
      hasHistory = historical.test(part.text);
    const mixedNegation =
      hasNegation &&
      /(?:,|;|\bbut\b|\bhowever\b|\band\b)[\s\S]*\b(?:repeat|recheck|schedule|arrange|book|review|follow[ -]?up|attend|referral|appointment|pending|awaiting|awaited|outstanding)\b/i.test(
        part.text,
      );
    const mixedHistory =
      hasHistory &&
      /(?:,|;|\bbut\b|\bthen\b|\band\b)\s*(?:please\s+)?(?:repeat|recheck|schedule|arrange|book|review|follow[ -]?up|attend)\b/i.test(
        part.text,
      );
    const unsplitActions =
      /\band\s+(?:please\s+)?(?:repeat|recheck|schedule|arrange|book|review|follow[ -]?up|attend)\b/i.test(
        part.text,
      );
    if (heading.test(part.text) || sectionLabel.test(part.text)) {
      category = "context";
      reason = "Document heading or example label; not a care instruction.";
    } else if (injection.test(part.text)) {
      category = "unknown";
      reason =
        "Instruction-like document text is treated as untrusted content. Check manually.";
    } else if (
      ((hasSafety || hasMedication) &&
        (followupWords.test(part.text) ||
          pendingWords.test(part.text) ||
          missingResult.test(part.text))) ||
      mixedNegation ||
      mixedHistory ||
      unsplitActions
    ) {
      category = "unknown";
      reason =
        "Mixed instructions; review manually. Preserve each action and any condition before adding follow-ups.";
    } else if (hasSafety) {
      category = "safety";
      reason =
        "Urgent-care instructions stay in the source; they are not scheduled tasks.";
    } else if (hasMedication) {
      category = "medication";
      reason =
        "Medication instructions are not converted to follow-up tasks. Confirm them with your care team.";
    } else if (hasNegation) {
      category = "context";
      reason =
        "Negated instruction: no automatic task proposed. Check this sentence manually if it contains another action.";
    } else if (
      hasHistory &&
      !(pendingWords.test(part.text) || missingResult.test(part.text))
    ) {
      category = "context";
      reason = "Describes an event already completed; no new task proposed.";
    } else if (
      actionWords.test(part.text) ||
      missingResult.test(part.text) ||
      category === "follow_up" ||
      category === "pending_result"
    ) {
      suggested = true;
      category =
        category === "pending_result" ||
        pendingWords.test(part.text) ||
        missingResult.test(part.text)
          ? "pending_result"
          : "follow_up";
      reason =
        "Candidate follow-up. Confirm against this sentence before tracking.";
      if (
        /\b(if|unless|consider|may need|might|as needed|as required)\b/i.test(
          part.text,
        )
      )
        flags.push("Conditional instruction. Ask whether it applies.");
      if (
        /\band\b/i.test(part.text) &&
        (part.text.match(
          /\b(repeat|recheck|schedule|arrange|book|review|refer|follow[ -]?up)\b/gi,
        )?.length ?? 0) > 1
      )
        flags.push(
          "This sentence may contain several actions. Review each one.",
        );
    }
    if (suggested && loops.length >= MAX_PROPOSALS) {
      suggested = false;
      category = "unknown";
      reason =
        "The 100-proposal limit was reached. Review this source manually or analyze a smaller document.";
    }
    const sentence: Sentence = {
      id: `s${index + 1}`,
      ...part,
      category,
      suggested,
      reason,
      modelScore: result.score,
    };
    sentences.push(sentence);
    if (!suggested) continue;
    const key = part.text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    if (seen.has(key)) {
      sentence.suggested = false;
      sentence.reason =
        "Duplicate instruction. The first occurrence supplies the task.";
      continue;
    }
    seen.add(key);
    const date = extractDate(part.text, input.dischargeDate),
      docOwner = documentedOwner(part.text);
    if (!date.dueDate)
      flags.push(
        date.dateKind === "missing"
          ? "Timing is not specified."
          : "The date needs confirmation.",
      );
    if (!docOwner)
      flags.push("The source does not name a responsible care team.");
    const questions: string[] = [];
    if (!date.dueDate)
      questions.push(
        "When should this follow-up happen, and when should I contact you if I have not heard back?",
      );
    if (!docOwner)
      questions.push(
        "Which care team owns this follow-up, and how should I contact them?",
      );
    if (category === "pending_result")
      questions.push(
        "Who will review the result and explain what happens next?",
      );
    if (flags.some((x) => x.startsWith("Conditional")))
      questions.push("Does this conditional instruction apply now?");
    loops.push({
      id: `l${index + 1}`,
      title: friendlyTitle(part.text, category),
      category: category as CareLoop["category"],
      sourceId: sentence.id,
      sourceQuote: part.text,
      sourceStart: part.start,
      sourceEnd: part.end,
      ...date,
      documentedOwner: docOwner,
      owner: "",
      status: "suggested",
      flags,
      questions,
      closure: null,
    });
  }
  // Similar follow-ups with different explicit timing stay separate and visibly require reconciliation.
  const normalized = loops.map(
    (loop) =>
      new Set(
        loop.sourceQuote
          .toLowerCase()
          .replace(/\b(in|within|after)\s+[\w–-]+\s+(days?|weeks?)\b/g, "")
          .match(/[a-z]{3,}/g) ?? [],
      ),
  );
  const conflicting = new Set<number>();
  for (let a = 0; a < loops.length; a++)
    for (let b = a + 1; b < loops.length; b++) {
      const x = normalized[a],
        y = normalized[b];
      const similarity =
        [...x].filter((t) => y.has(t)).length /
        Math.max(1, Math.min(x.size, y.size));
      if (
        similarity > 0.75 &&
        loops[a].dueEnd &&
        loops[b].dueEnd &&
        loops[a].dueEnd !== loops[b].dueEnd
      ) {
        conflicting.add(a);
        conflicting.add(b);
      }
    }
  for (const index of conflicting) {
    const loop = loops[index];
    loop.flags.push(
      "Possible conflicting timing elsewhere in the source. Ask the care team.",
    );
    loop.questions.push(
      "These instructions give different times for a similar follow-up. Which should I follow?",
    );
    loop.dueDate = null;
    loop.dueEnd = null;
    loop.dateKind = "ambiguous";
  }
  return {
    ...input,
    id,
    sourceText,
    sentences,
    loops,
    events: [
      {
        id: crypto.randomUUID(),
        at: now,
        actor: "Looplight",
        actionId: null,
        kind: "analyzed",
        detail: `Proposed ${loops.length} follow-ups for human review. No task is confirmed automatically.`,
      },
    ],
    version: 1,
    createdAt: now,
    updatedAt: now,
    engine: ENGINE_VERSION,
  };
}
