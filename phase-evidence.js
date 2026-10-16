// Contrôle de provenance : une citation exacte ne démontre pas qu'un fait s'est produit.
export const normalize = x => String(x || '').normalize('NFKC').replace(/\s+/g,' ').trim().toLocaleLowerCase('fr');
const hypothesis = /(supposons que|imaginons que|si j'avais|si je faisais|j'aurais|on aurait|dans l'hypothèse|je pourrais|je voudrais|je vais essayer|pas encore fait|je ne l'ai pas fait)/iu;
const action = /(j'ai (testé|essayé|fait|rencontré|observé|parlé|visité|travaillé|vu|constaté)|nous avons (testé|essayé|rencontré|observé)|je suis allé|je suis allée)/iu;
const observation = /(j'ai (vu|constaté|observé|remarqué|trouvé|ressenti|compris)|c'était|ça m'a|cela m'a|j'étais|les horaires|les tâches|le quotidien)/iu;
const learning = /(j'en retiens|j'ai compris|j'ai appris|je réalise|je constate|je comprends|je préfère|ça me montre|je me rends compte)/iu;
const abandoned = /(j'abandonne|je renonce|je ne ferai pas|je laisse tomber)/iu;
function hasQuote(userText,quote) {
 const q=normalize(quote),t=normalize(userText);
 return q.length>=20 && q.split(' ').length>=4 && t.includes(q);
}
function context(userText,quote){
 const t=normalize(userText),q=normalize(quote),i=t.indexOf(q);
 return i<0?'':t.slice(Math.max(0,i-60),i+q.length);
}
export function isRealLearning(userText,quote){
 return hasQuote(userText,quote) && !hypothesis.test(context(userText,quote)) && learning.test(normalize(quote));
}
export function verifiedEvidence(userText,event){
 const kind=event?.type,q=event?.evidence_quote;
 if(kind==='learning_reported')return isRealLearning(userText,q);
 if(!hasQuote(userText,q) || hypothesis.test(context(userText,q)))return false;
 if(kind==='abandoned')return abandoned.test(normalize(q));
 return kind==='result_reported' && action.test(normalize(q)) && observation.test(normalize(q));
}
