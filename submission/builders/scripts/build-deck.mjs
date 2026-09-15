import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const ROOT=path.resolve(process.env.LOOPLIGHT_SUBMISSION_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)),'..'));
const source=process.env.LOOPLIGHT_CONTENT || path.join(ROOT,'content.json');
const raw=await fs.readFile(source,'utf8');
if(raw.includes('\u2014')) throw new Error('Em dashes are not allowed.');
const data=JSON.parse(raw);
if(data.slides.length!==7) throw new Error('Exactly seven slides are required.');
const ready=data.release.status==='ready';
if(ready && (data.release.qa_status!=='reported' || !data.release.qa_summary.trim())) throw new Error('Record the supplied final QA evidence before final export.');
for(const [key,asset] of Object.entries(data.assets)){
  if(ready && asset.status!=='verified') throw new Error(`Replace and verify the ${key} screenshot before final export.`);
  await fs.access(path.resolve(ROOT,asset.path));
}
if(process.argv.includes('--validate-content')){
 console.log(JSON.stringify({slides:7,status:data.release.status,qa:data.release.qa_status,assets:Object.keys(data.assets),exported:false}));
 process.exit(0);
}
const modules=process.env.RUNTIME_NODE_MODULES;
const SKILL=process.env.PRESENTATIONS_SKILL_DIR;
const PYTHON=process.env.RUNTIME_PYTHON;
if(!modules || !SKILL || !PYTHON) throw new Error('Set RUNTIME_NODE_MODULES, PRESENTATIONS_SKILL_DIR, and RUNTIME_PYTHON.');
const runtimeRequire=createRequire(path.join(path.resolve(modules),'package.json'));
const {Presentation,PresentationFile}=await import(pathToFileURL(runtimeRequire.resolve('@oai/artifact-tool')).href);
const {finalizePresentation,resolvePresentationFont}=await import(pathToFileURL(path.join(SKILL,'container_tools/artifact_tool_utils.mjs')).href);
const font=resolvePresentationFont({fontFamily:process.env.PRESENTATION_FONT || 'Noto Sans'});
const version=process.argv[2] || 'firebase-1';
if(!/^[a-zA-Z0-9_-]+$/.test(version)) throw new Error('Use a short alphanumeric revision name.');
const BUILD=path.join(ROOT,'.build',version);
await fs.mkdir(BUILD,{recursive:true});
await fs.mkdir(path.join(ROOT,'output'),{recursive:true});
const p=Presentation.create({slideSize:{width:1280,height:720}});
const C={navy:'#102238',blue:'#315bdb',lime:'#c7f578',white:'#ffffff',muted:'#5a687c',pale:'#dce4ef'};
let objectCount=0;
const cropPlan=[];
function text(s,value,x,y,w,h,size=28,color=C.navy,bold=false){
 const box=s.shapes.add({geometry:'textbox',name:`text-${++objectCount}`,position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 box.text=value;
 box.text.style={typeface:font,fontSize:size,bold,color,autoFit:'none',wrap:'square',insets:{top:0,bottom:0,left:0,right:0},verticalAlignment:'top'};
 return box;
}
function title(s,value,dark=false){text(s,value,72,60,1136,116,49,dark?C.white:C.navy,true);}
function footer(s,n,dark=false){
 text(s,`Looplight / ${String(n).padStart(2,'0')}`,72,670,800,26,16,dark?C.pale:C.muted);
 if(!ready) text(s,'DRAFT / FINAL FIREBASE QA PENDING',819,673,389,23,13,dark?C.lime:C.blue);
}
function notes(s,value){s.speakerNotes.textFrame.setText(`${value}\n\nRelease status: ${data.release.status}. ${data.release.qa_summary}`);}
async function assetImage(s,key,slideNumber,imageIndex,box){
 const asset=data.assets[key];
 const bytes=await fs.readFile(path.resolve(ROOT,asset.path));
 const metadataCall=spawnSync(PYTHON,[path.join(ROOT,'scripts','inspect-capture.py'),path.resolve(ROOT,asset.path)],{encoding:'utf8'});
 if(metadataCall.status!==0) throw new Error(metadataCall.stderr || 'Cannot inspect capture.');
 const metadata=JSON.parse(metadataCall.stdout);
 const iw=metadata.width,ih=metadata.height;
 const [cx,cy,cw,ch]=asset.crop_px || [0,0,iw,ih];
 if(cx<0 || cy<0 || cw<=0 || ch<=0 || cx+cw>iw || cy+ch>ih) throw new Error(`Invalid native crop for ${key}.`);
 const [x,y,w,h]=box;
 const scale=Math.min(w/cw,h/ch);
 const frame=[x+(w-cw*scale)/2,y+(h-ch*scale)/2,cw*scale,ch*scale];
 const crop=[cx/iw,cy/ih,(iw-cx-cw)/iw,(ih-cy-ch)/ih];
 const picture=s.images.add({blob:new Uint8Array(bytes),contentType:metadata.content_type,alt:`Looplight ${key}: ${asset.description}`,fit:'contain',position:{left:frame[0],top:frame[1],width:frame[2],height:frame[3]}});
 picture.crop={left:crop[0],top:crop[1],right:crop[2],bottom:crop[3]};
 cropPlan.push({slide:slideNumber,image_index:imageIndex,crop,frame});
 if(asset.status!=='verified') text(s,'LAYOUT PLACEHOLDER / REPLACE FINAL CAPTURE',x,y+h-30,w,25,12,C.blue,true);
}
for(const item of data.slides){
 const dark=['cover','result','next'].includes(item.layout);
 const s=p.slides.add();
 s.background.fill=item.layout==='business'?C.lime:dark?C.navy:C.white;
 switch(item.layout){
  case 'cover':
   text(s,data.project.toUpperCase(),72,58,900,46,29,C.lime,true);
   text(s,data.tagline,68,190,1136,217,84,C.white,true);
   text(s,data.subtitle,72,453,1060,76,35,C.white);
   text(s,data.app_label,72,548,1040,41,27,C.lime,true);
   text(s,data.creator,72,619,700,32,23,C.white,true);
   text(s,data.credit,72,654,1100,28,18,C.pale);
   if(!ready) text(s,'DRAFT / FINAL FIREBASE QA PENDING',790,68,420,30,15,C.lime);
   break;
  case 'problem':
   title(s,item.title);
   text(s,item.story,72,232,592,210,39,C.navy,true);
   text(s,item.story_note,72,491,555,85,26,C.muted);
   text(s,item.stat,760,203,440,135,111,C.blue,true);
   text(s,item.stat_label,764,349,430,88,31,C.navy,true);
   text(s,item.stat_note,764,467,430,135,22,C.muted);
   footer(s,item.id);break;
  case 'product':
   title(s,item.title);
   text(s,item.labels[0],72,165,820,42,24,C.navy,true);
   text(s,item.labels[1],972,165,270,62,22,C.navy,true);
   await assetImage(s,'desktop',3,0,[72,220,840,390]);
   await assetImage(s,'mobile',3,1,[990,215,206,395]);
   text(s,item.footer,72,626,1120,37,25,C.navy,true);
   footer(s,item.id);break;
  case 'result':
   title(s,item.title,true);
   item.states.forEach((entry,i)=>{
    text(s,entry[0],72,250+i*108,687,34,20,C.lime,true);
    text(s,entry[1],72,286+i*108,672,62,28,C.white);
   });
   await assetImage(s,'source',4,0,[795,218,413,372]);
   text(s,item.caveat,72,625,1136,35,22,C.pale);
   footer(s,item.id,true);break;
  case 'evidence':
   title(s,item.title);
   item.metrics.forEach((metric,i)=>{
    const x=72+i*580;
    text(s,metric[0],x,218,515,127,100,C.blue,true);
    text(s,metric[1],x+4,357,520,92,29,C.navy,true);
   });
   text(s,item.context,72,481,1128,45,26,C.muted);
   text(s,item.caveat,72,543,1128,55,29,C.navy,true);
   text(s,item.next,72,613,1128,36,23,C.muted);
   footer(s,item.id);break;
  case 'business':
   title(s,item.title);
   text(s,item.buyer,72,203,1110,115,39,C.navy,true);
   text(s,item.price,72,374,490,124,91,C.navy,true);
   text(s,item.price_note,78,505,575,92,25,C.navy);
   text(s,item.value_title,704,380,500,53,29,C.navy,true);
   text(s,item.value,704,447,500,139,25,C.navy);
   text(s,item.caveat,72,625,1136,32,19,C.navy);
   footer(s,item.id);break;
  case 'next':
   title(s,item.title,true);
   text(s,item.left_title,72,223,540,76,31,C.lime,true);
   text(s,item.left,72,317,540,174,27,C.white);
   text(s,item.right_title,688,223,520,76,31,C.lime,true);
   text(s,item.right,688,317,520,174,27,C.white);
   text(s,item.caveat,72,513,1136,76,23,C.pale);
   text(s,data.app_label,72,608,1050,37,28,C.lime,true);
   text(s,data.repo_label,72,652,1050,29,20,C.pale);
   if(!ready) text(s,'DRAFT / FINAL QA PENDING',913,672,295,22,13,C.lime);
   break;
  default:throw new Error(`Unknown layout: ${item.layout}`);
 }
 notes(s,item.notes);
}
const candidate=path.join(BUILD,'candidate.pptx');
await(await PresentationFile.exportPptx(p)).save(candidate);
const planFile=path.join(BUILD,'native-crops.json');
await fs.writeFile(planFile,JSON.stringify(cropPlan,null,2));
const crop=spawnSync(PYTHON,[path.join(ROOT,'scripts','apply-native-crops.py'),candidate,planFile],{encoding:'utf8'});
if(crop.status!==0) throw new Error(crop.stderr || 'Screenshot crop failed.');
console.log(crop.stdout.trim());
const finalPath=path.join(ROOT,'output',`looplight-pitch-${ready?'':'draft-'}${version}.pptx`);
const receipt=await finalizePresentation({workspaceDir:ROOT,candidatePath:candidate,finalPath,pythonExecutable:PYTHON,
 integrityValidatorPath:path.join(SKILL,'container_tools/inspect_presentation_package_integrity.py'),
 layoutValidatorPath:path.join(SKILL,'container_tools/inspect_presentation_layout_geometry.py'),
 layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit'],
 explicitTotalSlideCount:7,requiredNativeTableOwnerSlides:[],requiredNativeChartOwnerSlides:[],
 fontPolicy:{basis:'design',families:[font]},verifyArtifactToolImport:true,
 receiptPath:path.join(BUILD,'validation.json')});
console.log(JSON.stringify({finalPath,receipt},null,2));
