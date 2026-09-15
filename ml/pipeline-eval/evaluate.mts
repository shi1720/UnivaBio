/** Run once on the frozen document set; no fitting, threshold edits, or data edits. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync} from 'node:fs';
import {dirname,resolve,join,basename} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
import type {CareLoop,Episode,Sentence} from './snapshot/lib/types.ts';

type Gold={id:string;snippet:string;category:'follow_up'|'pending_result';source_start:number;source_end:number;condition:string|null;manual_review_allowed:boolean;timing:{kind:string;due_date:string|null;due_end:string|null;explanation:string}};
type Negative={id:string;snippet:string;kind:string;source_start:number;source_end:number};
type Document={id:string;group:string;source_text:string;patient_name:string;document_title:string;discharge_date:string;actions:Gold[];negatives:Negative[]};
type Pair={prediction:number;gold:number};
const read=(name:string)=>JSON.parse(readFileSync(new URL(name,import.meta.url),'utf8'));
const dataset=read('./dataset.json');
const lock=read('./dataset.lock.json');
const initialManifest=read('./snapshot/manifest.json');
const root=dirname(fileURLToPath(import.meta.url));
const option=(name:string)=>{const index=process.argv.indexOf(name);return index<0?null:process.argv[index+1]??null;};
const selectedEngine=option('--engine');
const phase=selectedEngine?'release_regression_on_seen_fixtures':'initial_snapshot_replay';
const outputPath=resolve(root,option('--out')??(selectedEngine?'release-results.json':'replay-results.json'));
const errorsPath=join(dirname(outputPath),basename(outputPath).replace(/(?:-results)?\.json$/,'-errors.json'));
for(const target of [outputPath,errorsPath]){
 const protectedDirectory=['initial-1.1','snapshot','release-snapshots'].some(name=>target.startsWith(resolve(root,name)+'/'));
 const protectedFile=['results.json','errors.json','dataset.json','dataset.lock.json'].some(name=>target===resolve(root,name));
 assert.ok(!protectedDirectory&&!protectedFile,'Never overwrite frozen datasets, snapshots, or retained initial results');
}
let manifest=initialManifest;
const sha=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');
assert.equal(sha(readFileSync(new URL('./dataset.json',import.meta.url))),lock.dataset_sha256,'Frozen dataset was modified');
assert.equal(initialManifest.dataset_sha256,lock.dataset_sha256);
for(const [name,digest] of Object.entries(initialManifest.files))assert.equal(sha(readFileSync(new URL('./snapshot/'+name,import.meta.url))),digest,'Frozen engine source was modified: '+name);
assert.equal(sha(readFileSync(new URL('./snapshot/lib/engine.rules-only.ts',import.meta.url))),initialManifest.rules_only_adapter_sha256);
for(const doc of dataset.documents as Document[])for(const row of [...doc.actions,...doc.negatives])assert.equal(doc.source_text.slice(row.source_start,row.source_end),row.snippet,'Gold span mismatch: '+row.id);

let hybridURL=new URL('./snapshot/lib/engine.ts',import.meta.url);
let baselineURL=new URL('./snapshot/lib/engine.rules-only.ts',import.meta.url);
let checkout:string|null=null;
if(selectedEngine){
 const enginePath=resolve(selectedEngine);checkout=dirname(dirname(enginePath));
 assert.equal(basename(enginePath),'engine.ts','--engine must point to the checkout lib/engine.ts file');
 const snapshotParent=join(root,'release-snapshots');mkdirSync(snapshotParent,{recursive:true});
 const runSnapshot=mkdtempSync(join(snapshotParent,'run-'));
 manifest={dataset_sha256:lock.dataset_sha256,source_checkout:checkout,evaluation_phase:phase,files:{},policy:'Release regression on seen fixtures; current checkout imported read-only. Exact source copied for reproducibility and rules-only adapter. Initial snapshot and measured results retained.'};
 for(const name of ['lib/engine.ts','lib/dates.ts','lib/types.ts','ml/inference.ts','ml/model.json']){
  const bytes=readFileSync(join(checkout,name));const destination=join(runSnapshot,name);
  mkdirSync(dirname(destination),{recursive:true});writeFileSync(destination,bytes);manifest.files[name]=sha(bytes);
 }
 const engine=readFileSync(join(runSnapshot,'lib/engine.ts'),'utf8');
 const scorer=/function\s+scoreSentence\s*\([^)]*\)\s*:\s*\{[^{}]*\}\s*\{[\s\S]*?^\}/m;
 const sourceScorer=engine.match(scorer);
 assert.ok(sourceScorer&&sourceScorer[0].includes('classifier'),'Cannot safely isolate the sentence scorer for the baseline adapter');
 const adapted=sourceScorer[0].replace(/(\}\s*\{)[\s\S]*$/,"$1\n return {label:'unknown',score:0};\n}");
 const baseline=engine.replace(sourceScorer[0],adapted);
 writeFileSync(join(runSnapshot,'lib/engine.rules-only.ts'),baseline);
 writeFileSync(join(runSnapshot,'package.json'),'{"private":true,"type":"module"}\n');
 manifest.rules_only_adapter_sha256=sha(Buffer.from(baseline));manifest.saved_snapshot=runSnapshot;
 writeFileSync(join(runSnapshot,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 hybridURL=pathToFileURL(enginePath);baselineURL=pathToFileURL(join(runSnapshot,'lib/engine.rules-only.ts'));
}
const hybrid=(await import(hybridURL.href)).analyzeDocument;
const rulesOnly=(await import(baselineURL.href)).analyzeDocument;

let networkAttempts=0;
globalThis.fetch=(async()=>{networkAttempts++;throw new Error('Network calls are forbidden during offline evaluation');}) as typeof fetch;
const nonspace=(s:string)=>s.replace(/\s/g,'').length;
const intersect=(a:number,b:number,c:number,d:number)=>Math.max(0,Math.min(b,d)-Math.max(a,c));
function spanValid(source:string,start:number,end:number,quote:string){return Number.isInteger(start)&&Number.isInteger(end)&&start>=0&&end>start&&end<=source.length&&source.slice(start,end)===quote;}
function coverage(source:string,start:number,end:number,gold:Gold){
 const from=Math.max(start,gold.source_start),to=Math.min(end,gold.source_end);
 return to>from?nonspace(source.slice(from,to))/Math.max(1,nonspace(gold.snippet)):0;
}
function edgesFor(doc:Document,predictions:CareLoop[],typed:boolean){
 return predictions.map(pred=>doc.actions.map((gold,index)=>({index,score:coverage(doc.source_text,pred.sourceStart,pred.sourceEnd,gold),category:gold.category}))
  .filter(row=>row.score>=0.9&&(!typed||row.category===pred.category)&&spanValid(doc.source_text,pred.sourceStart,pred.sourceEnd,pred.sourceQuote))
  .sort((a,b)=>b.score-a.score||a.index-b.index).map(row=>row.index));
}
/** Maximum one-to-one matching: one broad/duplicate card cannot count as two actions. */
function match(edges:number[][],goldCount:number):Pair[]{
 const owner=new Array<number>(goldCount).fill(-1);
 function visit(pred:number,seen:Set<number>):boolean{
  for(const gold of edges[pred]){
   if(seen.has(gold))continue;seen.add(gold);
   if(owner[gold]===-1||visit(owner[gold],seen)){owner[gold]=pred;return true;}
  }
  return false;
 }
 for(let pred=0;pred<edges.length;pred++)visit(pred,new Set());
 return owner.flatMap((prediction,gold)=>prediction<0?[]:[{prediction,gold}]);
}
const ratio=(a:number,b:number)=>b?a/b:null;
const reviewCue=(sentence:Sentence)=>sentence.category==='unknown'||/review manually|check manually|check this sentence manually|proposal limit|untrusted content/i.test(sentence.reason);
const sourcePreview=(text:string)=>text.length>500?text.slice(0,480)+`… [${text.length} characters]`:text;
function evaluateDocument(doc:Document,episode:Episode,durationMs:number){
 const predictions=episode.loops,strictEdges=edgesFor(doc,predictions,true),locationEdges=edgesFor(doc,predictions,false);
 const strictPairs=match(strictEdges,doc.actions.length),locationPairs=match(locationEdges,doc.actions.length);
 const goldMatched=new Set(strictPairs.map(p=>p.gold)),predMatched=new Set(strictPairs.map(p=>p.prediction));
 const locByPred=new Map(locationPairs.map(pair=>[pair.prediction,pair.gold]));
 const errors:any[]=[];
 let datesAssigned=0,datesSupported=0,unsupportedAssignedDates=0,knownDatesComplete=0,conditionalAcknowledged=0;
 const goldResults=doc.actions.map((gold,index)=>{
  const sentences=episode.sentences.filter(s=>coverage(doc.source_text,s.start,s.end,gold)>=0.9&&spanValid(doc.source_text,s.start,s.end,s.text));
  const explicitlyCued=sentences.some(reviewCue),pair=strictPairs.find(p=>p.gold===index);
  const located=locationPairs.some(p=>p.gold===index);
  const prediction=pair?predictions[pair.prediction]:null;
  const knownDate=gold.timing.kind==='exact'||gold.timing.kind==='window';
  const completeDate=!!prediction&&knownDate&&prediction.dueDate===gold.timing.due_date&&prediction.dueEnd===gold.timing.due_end;
  if(completeDate)knownDatesComplete++;
  const conditionInProposal=!!prediction&&!!gold.condition&&prediction.sourceQuote.includes(gold.condition)&&prediction.flags.some(flag=>/conditional/i.test(flag));
  const conditionInReview=!!gold.condition&&sentences.some(s=>reviewCue(s)&&s.text.includes(gold.condition!));
  if(gold.condition&&(conditionInProposal||conditionInReview))conditionalAcknowledged++;
  if(!goldMatched.has(index))errors.push({type:'missed_typed_action',gold_id:gold.id,expected_category:gold.category,snippet:gold.snippet,manual_review_allowed:gold.manual_review_allowed,source_visible:sentences.length>0,explicit_review_cue:explicitlyCued,review_sentences:sentences.map(s=>({id:s.id,category:s.category,reason:s.reason}))});
  if(prediction&&gold.condition&&!conditionInProposal)errors.push({type:'conditional_proposal_not_fully_acknowledged',gold_id:gold.id,prediction_id:prediction.id,condition:gold.condition,flags:prediction.flags,quote:prediction.sourceQuote});
  return {gold_id:gold.id,typed_suggestion:!!pair,category_agnostic_suggestion:located,review_visible:sentences.length>0,explicit_review_cue:explicitlyCued,suggested_or_explicitly_review_cued:located||explicitlyCued,known_date_complete:completeDate,condition_acknowledged:gold.condition?(conditionInProposal||conditionInReview):null,review_sentence_ids:sentences.map(s=>s.id)};
 });
 predictions.forEach((pred,index)=>{
  const goldIndex=locByPred.get(index),gold=goldIndex===undefined?null:doc.actions[goldIndex];
  if(!predMatched.has(index))errors.push({type:gold&&gold.category!==pred.category?'wrong_action_category':'false_positive_suggestion',prediction_id:pred.id,quote:pred.sourceQuote,predicted_category:pred.category,expected_category:gold?.category??null,gold_id:gold?.id??null,overlapping_negative_spans:doc.negatives.filter(n=>intersect(pred.sourceStart,pred.sourceEnd,n.source_start,n.source_end)>0).map(n=>({id:n.id,kind:n.kind,snippet:sourcePreview(n.snippet)}))});
  if(!spanValid(doc.source_text,pred.sourceStart,pred.sourceEnd,pred.sourceQuote))errors.push({type:'invalid_source_span',prediction_id:pred.id,start:pred.sourceStart,end:pred.sourceEnd,quote:sourcePreview(pred.sourceQuote)});
  if(pred.status!=='suggested'||pred.closure!==null)errors.push({type:'automatic_confirmation_or_closure',prediction_id:pred.id,status:pred.status,closure:pred.closure});
  if(locationEdges[index].length>1)errors.push({type:'compound_card_covers_multiple_gold_actions',prediction_id:pred.id,gold_ids:locationEdges[index].map(g=>doc.actions[g].id),quote:pred.sourceQuote});
  const hasDate=pred.dueDate!==null||pred.dueEnd!==null;
  const supported=!!gold&&['exact','window'].includes(gold.timing.kind)&&pred.dueDate===gold.timing.due_date&&pred.dueEnd===gold.timing.due_end;
  if(hasDate){
   datesAssigned++;
   if(supported)datesSupported++;
   else{unsupportedAssignedDates++;errors.push({type:'unsupported_or_incorrect_assigned_date',prediction_id:pred.id,gold_id:gold?.id??null,quote:pred.sourceQuote,expected:gold?.timing??null,actual:{dateKind:pred.dateKind,dateText:pred.dateText,dueDate:pred.dueDate,dueEnd:pred.dueEnd}});}
  }
  if(gold&&['exact','window'].includes(gold.timing.kind)&&!hasDate)errors.push({type:'explicit_date_not_extracted',prediction_id:pred.id,gold_id:gold.id,quote:pred.sourceQuote,expected:gold.timing,actual:{dateKind:pred.dateKind,dateText:pred.dateText,dueDate:pred.dueDate,dueEnd:pred.dueEnd}});
  if(gold&&gold.timing.kind==='ambiguous'&&!hasDate&&pred.dateKind==='missing')errors.push({type:'specified_uncertain_timing_labeled_missing',prediction_id:pred.id,gold_id:gold.id,quote:pred.sourceQuote,expected:gold.timing,actual:{dateKind:pred.dateKind,dateText:pred.dateText}});
 });
 const exactLoopSpans=predictions.filter(p=>spanValid(doc.source_text,p.sourceStart,p.sourceEnd,p.sourceQuote)).length;
 const exactSentenceSpans=episode.sentences.filter(s=>spanValid(doc.source_text,s.start,s.end,s.text)).length;
 return {
  document_id:doc.id,group:doc.group,source_characters:doc.source_text.length,engine_version:episode.engine,
  counts:{gold_actions:doc.actions.length,suggestions:predictions.length,true_positives:strictPairs.length,false_positives:predictions.length-strictPairs.length,false_negatives:doc.actions.length-strictPairs.length,localized_actions:locationPairs.length,review_visible_gold:goldResults.filter(g=>g.review_visible).length,explicit_review_cued_gold:goldResults.filter(g=>g.explicit_review_cue).length,suggested_or_review_cued_gold:goldResults.filter(g=>g.suggested_or_explicitly_review_cued).length,known_date_gold:doc.actions.filter(g=>['exact','window'].includes(g.timing.kind)).length,known_date_complete:knownDatesComplete,dated_suggestions:datesAssigned,supported_dated_suggestions:datesSupported,unsupported_dated_suggestions:unsupportedAssignedDates,conditional_gold:doc.actions.filter(g=>g.condition).length,conditional_acknowledged:conditionalAcknowledged,sentences:episode.sentences.length,exact_sentence_spans:exactSentenceSpans,exact_loop_spans:exactLoopSpans},
  suggestion_precision:ratio(strictPairs.length,predictions.length),suggestion_recall:ratio(strictPairs.length,doc.actions.length),
  strict_matches:strictPairs.map(p=>({gold_id:doc.actions[p.gold].id,prediction_id:predictions[p.prediction].id})),
  category_agnostic_matches:locationPairs.map(p=>({gold_id:doc.actions[p.gold].id,prediction_id:predictions[p.prediction].id})),
  gold_results:goldResults,errors,duration_ms:durationMs,
  output:{sentences:episode.sentences,loops:episode.loops,events:episode.events.map(({id,at,...event})=>event)},
 };
}
function aggregate(rows:any[]){
 const totals:Record<string,number>={};
 for(const row of rows)for(const [key,value] of Object.entries(row.counts))totals[key]=(totals[key]??0)+(value as number);
 const precision=ratio(totals.true_positives,totals.suggestions),recall=ratio(totals.true_positives,totals.gold_actions);
 return {documents:rows.length,counts:totals,suggestion_precision:precision,suggestion_recall:recall,suggestion_f1:precision!==null&&recall!==null&&precision+recall?2*precision*recall/(precision+recall):0,category_agnostic_action_recall:ratio(totals.localized_actions,totals.gold_actions),review_visible_gold_coverage:ratio(totals.review_visible_gold,totals.gold_actions),explicit_review_cue_coverage:ratio(totals.explicit_review_cued_gold,totals.gold_actions),suggested_or_review_cued_gold_coverage:ratio(totals.suggested_or_review_cued_gold,totals.gold_actions),known_date_action_completion:ratio(totals.known_date_complete,totals.known_date_gold),assigned_date_support_precision:ratio(totals.supported_dated_suggestions,totals.dated_suggestions),conditional_acknowledgment:ratio(totals.conditional_acknowledged,totals.conditional_gold),exact_loop_source_spans:ratio(totals.exact_loop_spans,totals.suggestions),exact_sentence_source_spans:ratio(totals.exact_sentence_spans,totals.sentences),documents_with_perfect_action_precision_and_recall:rows.filter(r=>r.counts.false_positives===0&&r.counts.false_negatives===0).length,error_counts:Object.fromEntries([...new Set(rows.flatMap(r=>r.errors.map((e:any)=>e.type)))].map(type=>[type,rows.reduce((n,r)=>n+r.errors.filter((e:any)=>e.type===type).length,0)]))};
}
const results:any={schema_version:1,evaluation_phase:phase,initial_results_sha256:sha(readFileSync(new URL('./initial-1.1/results.json',import.meta.url))),dataset_sha256:lock.dataset_sha256,engine_manifest:manifest,
 methodology:{matching:'Maximum one-to-one matching using >=90% gold non-whitespace character coverage within an exact returned source span. Strict TP additionally requires the correct action category. A duplicate or compound card cannot count for several gold actions.',suggestion_metrics:'TP/(TP+FP) and TP/(TP+FN) over all 44 authored gold actions, including conditional and manual-review-allowed actions. Wrong categories count as both FP and FN.',review_visibility:'Gold text present in a valid returned review sentence is counted separately from correct suggestions. Visibility does not establish that users will notice the text.',review_cue:'A containing sentence marked unknown, or with an explicit manual/untrusted/limit reason. Suggested-or-cued coverage uses category-agnostic action matching, so a wrong category may be surfaced but remains a strict suggestion error.',dates:'Any automatically assigned date must equal the explicit gold date/window. Ambiguous/missing gold must not receive an assigned date. Missing extraction is distinguished from unsupported assignment.',scope:'Document analysis only. Does not test authentication, database persistence, PDF extraction, actual clinical correctness, usability, or health outcomes.',baseline:'Identical frozen engine with scoreSentence returning unknown and 0. Deterministic rules remain unchanged; the unused classifier is still constructed. No fitting or threshold changes.',interpretation:'Single AI-assisted author style, 20 synthetic documents, no clinician labels; descriptive engineering evidence, not clinical validation or a generalization estimate.'},modes:{}};
for(const [mode,analyze] of [['hybrid',hybrid],['rules_only',rulesOnly]] as const){
 const rows=[];
 for(const doc of dataset.documents as Document[]){
  const input={patientName:doc.patient_name,documentTitle:doc.document_title,dischargeDate:doc.discharge_date,sourceText:doc.source_text};
  const start=performance.now();
  const episode=analyze(input,'eval-'+mode+'-'+doc.id);
  rows.push(evaluateDocument(doc,episode,performance.now()-start));
 }
 const boundaries=dataset.boundary_probes.map((probe:any)=>{
  let error:string|null=null;
  try{analyze({patientName:probe.patient_name,documentTitle:probe.document_title,dischargeDate:probe.discharge_date,sourceText:probe.source_text});}
  catch(cause){error=cause instanceof Error?cause.message:String(cause);}
  return {id:probe.id,characters:probe.source_text.length,expected:probe.expected_outcome,error,passed:error!==null&&new RegExp(probe.expected_error_pattern,'i').test(error)};
 });
 const groups=Object.fromEntries([...new Set(rows.map(r=>r.group))].map(group=>[group,aggregate(rows.filter(r=>r.group===group))]));
 results.modes[mode]={summary:aggregate(rows),groups,boundary_probes:boundaries,documents:rows};
}
results.network_attempts=networkAttempts;
results.mode_differences=results.modes.hybrid.documents.flatMap((row:any,index:number)=>{
 const other=results.modes.rules_only.documents[index];
 const stable=(loops:CareLoop[])=>JSON.stringify(loops.map(({id,...loop})=>loop));
 return stable(row.output.loops)===stable(other.output.loops)?[]:[{document_id:row.document_id,hybrid_counts:row.counts,rules_only_counts:other.counts,hybrid_errors:row.errors,rules_only_errors:other.errors}];
});
if(checkout)for(const [name,digest] of Object.entries(manifest.files))assert.equal(sha(readFileSync(join(checkout,name))),digest,'Checkout changed during evaluation; rerun with the engine frozen: '+name);
mkdirSync(dirname(outputPath),{recursive:true});
writeFileSync(outputPath,JSON.stringify(results,null,2)+'\n');
writeFileSync(errorsPath,JSON.stringify(Object.fromEntries(Object.entries(results.modes).map(([mode,value]:[string,any])=>[mode,value.documents.flatMap((doc:any)=>doc.errors.map((error:any)=>({document_id:doc.document_id,...error})))])),null,2)+'\n');
console.log(JSON.stringify({evaluation_phase:phase,output:outputPath,errors:errorsPath,dataset_sha256:lock.dataset_sha256,hybrid:results.modes.hybrid.summary,rules_only:results.modes.rules_only.summary,documents_changed_by_ml:results.mode_differences.length,network_attempts:networkAttempts,boundary_probes:results.modes.hybrid.boundary_probes},null,2));
