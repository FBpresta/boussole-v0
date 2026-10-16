export function normalizeRestoredState(state){
 if(!state||!state.pending_experiment)return state;
 if(['direction','apprentissage'].includes(state.phase))return {...state,phase:'experience',map_items:(state.map_items||[]).filter(x=>!['direction','apprentissage'].includes(x.kind))};
 return state;
}
export function governMessage(message,proposedPhase,governed,event){
 if(governed.resultReported&&!governed.learningVerified)return "Une observation est rapportée. Que permet-elle réellement de conclure ?";
 if(proposedPhase===governed.phase)return message;
 if(governed.phase==='experience')return "Le test reste à effectuer avant de conclure.";
 if(governed.phase==='apprentissage')return "Un retour d'expérience demande encore une clarification avant de décider.";
 return message;
}
