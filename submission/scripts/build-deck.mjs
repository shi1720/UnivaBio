import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
const modules = process.env.RUNTIME_NODE_MODULES;
if (!modules) throw new Error('Set RUNTIME_NODE_MODULES to the bundled Node packages directory.');
const runtimeRequire = createRequire(path.join(path.resolve(modules), 'package.json'));
const { Presentation, PresentationFile } = await import(pathToFileURL(runtimeRequire.resolve('@oai/artifact-tool')).href);

const ROOT = path.resolve(process.env.LOOPLIGHT_SUBMISSION_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const SKILL = process.env.PRESENTATIONS_SKILL_DIR;
if (!SKILL || !path.isAbsolute(SKILL)) throw new Error('Set PRESENTATIONS_SKILL_DIR to the installed presentations skill directory.');
const PYTHON = process.env.RUNTIME_PYTHON;
if (!PYTHON || !path.isAbsolute(PYTHON)) throw new Error('Set RUNTIME_PYTHON to the bundled Python executable.');
const { finalizePresentation, resolvePresentationFont } = await import(pathToFileURL(path.join(SKILL, 'container_tools/artifact_tool_utils.mjs')).href);
const font = resolvePresentationFont({ fontFamily: process.env.PRESENTATION_FONT || 'Noto Sans' });
const version = process.argv[2] || 'v1';
const BUILD = path.join(ROOT, '.build', version);
await fs.mkdir(BUILD, { recursive: true });
await fs.mkdir(path.join(ROOT, 'output'), { recursive: true });
const p = Presentation.create({ slideSize: { width: 1280, height: 720 } });
const C = { navy: '#102238', blue: '#315bdb', lime: '#c7f578', white: '#ffffff', muted: '#5a687c', pale: '#dce4ef' };
let objectCount = 0;

function text(s, txt, x, y, w, h, size=28, color=C.navy, bold=false) {
  const t = s.shapes.add({ geometry:'textbox', name:`text-${++objectCount}`, position:{left:x,top:y,width:w,height:h}, fill:'none', line:{fill:'none',width:0} });
  t.text=txt;
  t.text.style={typeface:font,fontSize:size,bold,color,autoFit:'none',wrap:'square',insets:{top:0,bottom:0,left:0,right:0},verticalAlignment:'top'};
  return t;
}
function slide(bg=C.white) { const s=p.slides.add();s.background.fill=bg;return s; }
function footer(s, n, dark=false) { text(s,`Looplight  /  ${String(n).padStart(2,'0')}`,72,666,1040,28,17,dark?C.pale:C.muted); }
function notes(s, txt) { s.speakerNotes.textFrame.setText(txt); }
function title(s, txt, dark=false) { return text(s,txt,72,60,1136,116,49,dark?C.white:C.navy,true); }

// 1: Product title. All text stays editable.
{
  const s=slide(C.navy);
  text(s,'LOOPLIGHT',72,58,900,46,29,C.lime,true);
  text(s,'The next step,\naccounted for.',68,198,1136,217,84,C.white,true);
  text(s,'A follow-up ledger for the days after discharge.',72,460,1060,76,35,C.white);
  text(s,'Shivam Gupta',72,614,700,32,23,C.white,true);
  text(s,'Founder & builder   /   Built with AI-assisted development',72,651,1100,28,18,C.pale);
  notes(s,'Looplight is Shivam Gupta\'s UnivaBio project, built with AI-assisted development. The product is a working MVP for synthetic demonstration, with no clinical validation or claimed health outcome. Open with the family scenario, then demonstrate the real application. No external visual assets are used on this slide.');
}

// 2: Real problem, with a historical fact qualified where it appears.
{
  const s=slide();
  title(s,'Care continues after discharge');
  text(s,'Anita is home.\nMaya has the document.\nA result is still pending.',72,232,592,210,39,C.navy,true);
  text(s,'Fictional family.\nA real coordination problem.',72,491,555,85,26,C.muted);
  text(s,'41%',760,203,440,135,111,C.blue,true);
  text(s,'had results return\nafter discharge',764,349,430,88,31,C.navy,true);
  text(s,'2005 study of 2,644 discharges\nat two academic hospitals.\nA historical finding, not a current\nglobal prevalence estimate.',764,467,430,135,22,C.muted);
  footer(s,2);
  notes(s,'Source: Roy CL et al. Patient safety concerns arising from test results that return after hospital discharge. Ann Intern Med. 2005. https://pubmed.ncbi.nlm.nih.gov/16027454/ . The study covers discharges in 2004 at two academic hospitals. 41% refers to patients with results returning after discharge. Do not describe this as today\'s global rate. The 2025 SAFER Guides include a dedicated Test Results Reporting and Follow-Up guide: https://healthit.gov/resources/2025-safer-guide-test-results-reporting-and-follow-up/ . This context supports studying the workflow, not an endorsement or claim of Looplight benefit. Anita and Maya are synthetic demonstration characters.');
}

// 3: A real product capture, with native editable callouts.
{
  const s=slide();
  title(s,'A plan with the source still attached');
  const screenshot=process.env.LOOPLIGHT_SCREENSHOT || path.join(ROOT,'assets','product.png');
  const imageBytes=await fs.readFile(screenshot);
  // Preserve the original PNG. This native crop removes only the blank page area.
  const product = s.images.add({blob:new Uint8Array(imageBytes),contentType:'image/png',alt:'Actual Looplight care board. Anita and Maya are fictional. Source text remains visible below the follow-up tasks.',fit:'cover',position:{left:72,top:166,width:626,height:500}});
  product.crop = {left:0,top:0,right:0.5,bottom:0.56};
  text(s,'Each task keeps its source',765,208,440,85,29,C.navy,true);
  text(s,'Open the supporting sentence and review the original wording.',765,306,440,106,25,C.muted);
  text(s,'A person tracks the next step',765,450,440,85,29,C.navy,true);
  text(s,'Confirm the details before following through.',765,548,440,80,25,C.muted);
  text(s,'Actual app. Fictional data.',765,640,440,30,18,C.muted);
  notes(s,'Verified application screenshot supplied by the build owner, captured from the running Looplight care board with fictional Anita/Maya data. The original image remains embedded and the slide crop removes blank right and bottom space. Product UI: Add discharge notes > Anita’s discharge > Find the open loops; Needs review; Check details > Who will keep track of this? > Confirm this follow-up. Engine hybrid-1.2. The app supports pasted text/text-based PDFs, whole-source sentence review, human-confirmed tasks, sign-in and saved plans, Visit brief printing, Calendar file export, and JSON export in the account. Source PDF bytes are not retained; extracted text is saved. Browser/API QA was still in progress when the screenshot was supplied.');
}

// 4: The key product distinction as three factual states.
{
  const s=slide(C.navy);
  title(s,'A result can arrive\nbefore anyone reviews it',true);
  const entries=[
    ['01   RESULT RECEIVED','The family has the result.'],
    ['02   CLINICIAN REVIEW REPORTED','A user records who reviewed it.'],
    ['03   OUTCOME RECORDED','The ledger retains the reported ending.'],
  ];
  entries.forEach((a,i)=>{
    text(s,a[0],72,234+i*114,1100,34,21,C.lime,true);
    text(s,a[1],72,276+i*114,1100,55,34,C.white);
  });
  text(s,'These states record user reports. They do not verify clinical outcomes.',72,607,1120,38,21,C.pale);
  footer(s,4,true);
  notes(s,'The app separates receipt of a result from the user\'s report that a clinician reviewed it. A named tracker is the person following up, not proof that a clinician accepted treatment responsibility. Closing a task is an administrative record of the reported outcome, not medical clearance or independently verified clinical evidence. The source text, changes, and reported outcome remain inspectable. Original uploaded PDF bytes are not retained. Show the actual transition and history in the application.');
}

// 5: Small measured experiment, with limitations prominent.
{
  const s=slide();
  title(s,'Small model, visible limits');
  text(s,'82%',72,221,330,128,101,C.blue,true);
  text(s,'raw five-category\naccuracy',76,354,310,78,29,C.navy,true);
  text(s,'0.816',472,221,340,128,91,C.blue,true);
  text(s,'macro F1',478,354,310,78,29,C.navy,true);
  text(s,'44/50',873,221,335,128,88,C.blue,true);
  text(s,'abstained at the\nconfigured threshold',879,354,325,90,27,C.navy,true);
  text(s,'225 synthetic training examples. 50 separately authored challenge examples.',72,496,1120,44,24,C.muted);
  text(s,'Synthetic classification evidence. Clinical validation remains outstanding.',72,555,1120,74,28,C.navy,true);
  footer(s,5);
  notes(s,'Project evaluation supplied during development: 225 original synthetic training examples; 50 separate synthetic challenge examples; raw 5-way accuracy 0.82; macro F1 approximately 0.816; configured threshold abstains on 44/50. Raw accuracy is the argmax classification score before abstention and does not describe autonomous clinical performance. This is not a real patient test set, not a document-level missed-obligation evaluation, and not a health-outcome study. All sentences remain available for human review. The build owner reconfirmed these unchanged metrics alongside engine hybrid-1.2. The model needs no paid inference API.');
}

// 6: Commercial hypothesis and legible, auditable arithmetic.
{
  const s=slide(C.lime);
  title(s,'A narrow first customer');
  text(s,'A primary-care or transitions coordinator\nalready chasing discharge follow-up.',72,203,1110,115,39,C.navy,true);
  text(s,'$149',72,374,490,124,91,C.navy,true);
  text(s,'per month / 100 care episodes\nSingle-coordinator pricing hypothesis',78,505,575,92,25,C.navy);
  text(s,'The value to measure',704,380,500,53,29,C.navy,true);
  text(s,'Preparation time and correction burden.\nFive minutes saved × 100 episodes\nat $35/hour = about $292/month.',704,447,500,139,25,C.navy);
  text(s,'Illustrative inputs, before review and implementation costs. No observed ROI.',72,625,1136,32,19,C.navy);
  footer(s,6);
  notes(s,'Business hypotheses, not customer research: $149 per coordinator account/month for 100 care episodes, with a proposed $1 extra episode price. Initial buyer hypothesis: a primary-care or transitions coordinator. The current MVP uses a single coordinator account. Shared team workflows would be future work. Patients and caregivers would use the plan free. Staff-time arithmetic: 100 × 5/60 × $35 = $291.67 per month. No measured savings or willingness to pay exists. The model inference API fee is zero in the local-classifier approach, but hosting, database, support, clinical/security review, and governance costs remain. Competitors overlap: https://www.seamless.md/ , https://www.memorahealth.com/ , https://www.eonhealth.com/platform , https://welkinhealth.com/ . Do not claim exclusive features or a demonstrated moat. Proposed narrow position: an upload-first, source-reviewable follow-up ledger without initial EHR integration.');
}

// 7: A credible next experiment rather than an unsupported health claim.
{
  const s=slide(C.navy);
  title(s,'The next proof is a supervised pilot',true);
  text(s,'Can staff prepare a reliable plan faster?',72,228,1128,80,42,C.white,true);
  text(s,'Measure missed actions, corrections, and preparation time.\nThen track follow-up resolution under supervision.',72,346,1115,110,31,C.white);
  text(s,'MVP for synthetic demonstration.\nNo clinical validation, EHR integration, or proven health benefit.',72,505,1120,86,24,C.pale);
  const repo=text(s,'github.com/shi1720/UnivaBio',72,630,850,40,24,C.lime,true);
  notes(s,'Proposed next work: interviews and retrospective review under appropriate data governance, clinician-annotated documents, then supervised prospective evaluation. Primary process measures: missed obligations and misleading extra tasks at document level, staff preparation time, review burden, named tracker/date completeness, and time to reported resolution. A small pilot cannot establish a causal reduction in readmissions. The app cannot recover care obligations absent from source records. It does not diagnose, interpret results, prescribe treatment, or determine patient safety. The code repository is the stable handoff link. The hosted app is private pending access verification, so this slide does not claim public availability. Credit: Shivam Gupta, founder and builder, with AI-assisted development.');
}

const candidate=path.join(BUILD,'candidate.pptx');
await(await PresentationFile.exportPptx(p)).save(candidate);
const cropResult = spawnSync(PYTHON,[path.join(path.dirname(fileURLToPath(import.meta.url)),'apply-native-crop.py'),candidate],{encoding:'utf8'});
if(cropResult.status !== 0) throw new Error(cropResult.stderr || 'Native screenshot crop failed.');
console.log(cropResult.stdout.trim());
// Render the checked final PPTX through bundled LibreOffice for visual review.
const finalPath=path.join(ROOT,'output',`looplight-pitch-${version}.pptx`);
const receipt=await finalizePresentation({
  workspaceDir:ROOT,candidatePath:candidate,finalPath,pythonExecutable:PYTHON,
  integrityValidatorPath:path.join(SKILL,'container_tools/inspect_presentation_package_integrity.py'),
  layoutValidatorPath:path.join(SKILL,'container_tools/inspect_presentation_layout_geometry.py'),
  layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit'],
  explicitTotalSlideCount:7, requiredNativeTableOwnerSlides:[], requiredNativeChartOwnerSlides:[],
  fontPolicy:{basis:'design',families:[font]},verifyArtifactToolImport:true,
  receiptPath:path.join(BUILD,'validation.json'),
});
console.log(JSON.stringify({finalPath,receipt},null,2));
