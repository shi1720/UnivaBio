export type Category = 'follow_up' | 'pending_result' | 'medication' | 'safety' | 'context' | 'unknown';
export type LoopStatus = 'suggested' | 'open' | 'waiting' | 'received' | 'closed' | 'dismissed';
export type Sentence = { id: string; text: string; start: number; end: number; category: Category; suggested: boolean; reason: string; modelScore: number; };
export type CareLoop = { id: string; title: string; category: 'follow_up' | 'pending_result'; sourceId: string; sourceQuote: string; sourceStart: number; sourceEnd: number; dateText: string; dueDate: string | null; dueEnd: string | null; dateKind: 'exact' | 'window' | 'missing' | 'ambiguous'; documentedOwner: string; owner: string; status: LoopStatus; flags: string[]; questions: string[]; closure: null | { note: string; reviewedBy: string; date: string; reporter: string; }; };
export type AuditEvent = { id: string; at: string; actor: string; actionId: string | null; kind: string; detail: string; };
export type Episode = { id: string; patientName: string; documentTitle: string; dischargeDate: string; sourceText: string; sentences: Sentence[]; loops: CareLoop[]; events: AuditEvent[]; version: number; createdAt: string; updatedAt: string; engine: string; };
export type ActionCommand =
 | { type: 'confirm' | 'update'; loopId: string; title: string; owner: string; dueDate: string | null; dueEnd: string | null }
 | { type: 'status'; loopId: string; status: 'open' | 'waiting' | 'received'; note: string }
 | { type: 'close'; loopId: string; note: string; reviewedBy: string; date: string }
 | { type: 'dismiss'; loopId: string; note: string }
 | { type: 'reopen'; loopId: string; note: string }
 | { type: 'manual'; sentenceId: string; title: string; category: 'follow_up' | 'pending_result' };
export type UserInfo = { displayName: string; email: string } | null;
