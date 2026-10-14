// Ce garde-fou n'autorise que des requêtes publiques, courtes et approuvées.
// Il n'est pas un détecteur exhaustif de données personnelles : la recherche
// reste désactivée par défaut et ne doit jamais reprendre le message brut.
export function assessResearch({ consent, query }) {
  if (consent !== true) return { allowed:false, reason:'consentement_absent' };
  if (typeof query !== 'string') return { allowed:false, reason:'requete_absente' };
  const text=query.trim().replace(/\s+/g,' ');
  if (!text || text.length > 220) return { allowed:false, reason:'requete_trop_longue_ou_vide' };
  const personal = [
    /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i,
    /(?:\+\d{1,3}[\s.-]?)?(?:0[1-9])(?:[\s.-]?\d{2}){4}/,
    /https?:\/\/\S+/i,
    /\b(?:je|j'|j’|moi|mon|ma|mes|notre|nos|j'habite|j’habite|chez moi|ma fille|mon fils|mon conjoint|ma compagne|mon mari|ma femme|mes enfants|mon médecin|mon dossier)\b/i,
    /\b(?:rue|avenue|boulevard|impasse|allée|chemin|adresse|numéro de sécurité sociale|iban|mot de passe|diagnostic personnel)\b/i,
    /\b(?:suicide|automutilation|violence conjugale|traumatisme personnel|dépression personnelle)\b/i,
  ];
  if (personal.some(rx=>rx.test(text))) return { allowed:false, reason:'details_personnels_possibles' };
  return { allowed:true, query:text };
}