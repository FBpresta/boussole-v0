export function normalizeRestoredState(state) {
 if (!state?.pending_experiment) return state;
 if (!['direction','apprentissage'].includes(state.phase)) return state;
 return {...state,phase:'experience',map_items:(state.map_items||[]).filter(x=>!['direction','apprentissage'].includes(x.kind))};
}
export function governMessage(message,proposedPhase,governed,event) {
 if(governed.resultReported&&!governed.learningVerified)
  return "Une observation concrète est rapportée. Qu'est-ce que ce résultat permet d'apprendre, sans conclure trop vite ?";
 if(governed.phase==='apprentissage'&&proposedPhase==='direction')
  return "Un retour d'expérience mérite d'être compris avant de choisir une direction.";
 if(proposedPhase===governed.phase)return message;
 if(governed.phase==='experience'&&governed.state.pending_experiment)
  return 'Le test reste à effectuer : '+governed.state.pending_experiment+'. Nous pourrons distinguer observation et hypothèse après son résultat.';
 if(governed.phase==='clarte'&&event?.type==='abandoned')
  return "Ce test ne sera pas poursuivi. Cela ne prouve rien sur la piste elle-même.";
 return message;
}
