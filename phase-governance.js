import {verifiedEvidence,isRealLearning,normalize} from './phase-evidence.js';
export {verifiedEvidence} from './phase-evidence.js';
export {governMessage,normalizeRestoredState} from './phase-governance-message.js';
const phases=new Set(['brouillard','clarte','experience','apprentissage','direction']);
function mapGrounded(items,state,allowLearning,previousState,verifiedResult) {
 if(!Array.isArray(items))return [];
 const learnings=new Set((state.learnings||[]).map(normalize));
 const oldExperience=new Set((previousState?.map_items||[]).filter(x=>x?.source==='experience').map(x=>normalize(x.text)));
 return items.filter(item=>{
  if(item?.source==='experience'&&!verifiedResult&&!oldExperience.has(normalize(item.text)))return false;
  if(item?.kind==='direction'&&state.phase!=='direction')return false;
  if(item?.kind==='apprentissage')return allowLearning&&learnings.has(normalize(item.text));
  return true;
 });
}
export function governTurn(previousState,proposedState,proposedPhase,event,userText) {
 const prev=previousState||{},next={...(proposedState||{})};
 const previousExperiments=Array.isArray(prev.experiments)?prev.experiments:[];
 const previousLearnings=Array.isArray(prev.learnings)?prev.learnings:[];
 const previousObservations=Array.isArray(prev.observations)?prev.observations:[];
 const evidenceVerified=verifiedEvidence(userText,event);
 const resultReported=evidenceVerified&&event?.type==='result_reported';
 const learningReported=evidenceVerified&&event?.type==='learning_reported'&&previousExperiments.length>0;
 const abandoned=evidenceVerified&&event?.type==='abandoned';
 const proposed=event?.type==='proposed';
 const evidenceQuote=String(event?.evidence_quote||'').trim();
 const learningQuote=String(event?.learning_quote||'').trim();
 const explicitLearning=resultReported&&isRealLearning(userText,learningQuote);
 let phase=phases.has(proposedPhase)?proposedPhase:'clarte',reason=null;
 if(resultReported){
  next.experiments=[...previousExperiments,evidenceQuote].slice(-12);
  next.observations=[...previousObservations,evidenceQuote].slice(-12);
  next.learnings=explicitLearning?[...new Set([...previousLearnings,learningQuote])].slice(-12):[...previousLearnings];
  next.directions=[...(Array.isArray(prev.directions)?prev.directions:[])];
  next.pending_experiment=null;
  next.next_action=explicitLearning?'Distinguer ce que ce retour permet de décider de ce qui reste à vérifier.':'Formuler ce que ce résultat apprend, sans en déduire trop vite une direction.';
  phase='apprentissage';reason='Résultat observé et cité ; apprentissage distinct de la direction.';
 }else if(learningReported){
  next.experiments=[...previousExperiments];next.observations=[...previousObservations];
  next.learnings=[...new Set([...previousLearnings,evidenceQuote])].slice(-12);
  next.directions=[...(Array.isArray(prev.directions)?prev.directions:[])];
  next.pending_experiment=null;phase='apprentissage';
  reason='Apprentissage formulé par la personne et relié à une expérience antérieure.';
 }else{
  next.experiments=[...previousExperiments];next.observations=[...previousObservations];next.learnings=[...previousLearnings];
  if(abandoned){
   next.pending_experiment=null;next.directions=[...(Array.isArray(prev.directions)?prev.directions:[])];
   phase='clarte';reason='Test abandonné explicitement, sans apprentissage fabriqué.';
  }else{
   if(prev.pending_experiment&&!proposed)next.pending_experiment=prev.pending_experiment;
   if(next.pending_experiment){
    next.directions=[...(Array.isArray(prev.directions)?prev.directions:[])];
    next.next_action=`Réaliser ou réévaluer le test en attente : ${next.pending_experiment}`;
    phase='experience';reason='Test non réalisé ou résultat insuffisamment établi.';
   }else if(phase==='apprentissage'&&!previousExperiments.length){
    phase='clarte';reason="Aucun résultat d'expérience n'a été établi.";
   }else if(phase==='direction'&&previousExperiments.length&&!previousLearnings.length){
    phase='apprentissage';reason="Une observation existe, mais aucun apprentissage n'a été formulé.";
   }
  }
 }
 next.phase=phase;
 next.map_items=mapGrounded(next.map_items,next,explicitLearning||learningReported||previousLearnings.length>0,prev,resultReported);
 if(resultReported&&!next.map_items.some(item=>item?.kind==='etabli'&&item?.source==='experience')){
  next.map_items=[{kind:'etabli',text:evidenceQuote,source:'experience'},...next.map_items].slice(0,14);
 }
 return {state:next,phase,reason,evidenceVerified,resultReported,learningVerified:explicitLearning||learningReported};
}
