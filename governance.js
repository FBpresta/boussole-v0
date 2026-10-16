export function blankState() {
  return {
    phase: "brouillard",
    situation: "",
    facts: [],
    observations: [],
    feelings_reported: [],
    interpretations: [],
    hypotheses: [],
    tensions: [],
    unknowns: [],
    questions_attempted: [],
    pending_experiment: null,
    experiments: [],
    learnings: [],
    directions: [],
    next_action: null,
    last_mode: "understand",
    withdrawal_ready: false,
    decisive_unknown: null,
    tipping_point: null,
    map_items: []
  };
}

export function schema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      mode: { type: "string", enum: ["understand","reflect","synthesize","answer","ask","research","challenge","propose_experiment","prepare_experiment","learn_from_experiment","direction","withdraw"] },
      message: { type: "string", maxLength: 3500 },
      phase: { type: "string", enum: ["brouillard","clarte","experience","apprentissage","direction"] },
      target_unknown: { type: ["string","null"] },
      knowledge_source: { type: "string", enum: ["introspection","memory","recognition","external","third_party","real_world_experiment","none"] },
      question_needed: { type: "boolean" },
      question_reason: { type: "string", maxLength: 700 },
      research_query: { type: ["string","null"] },
      stop_reason: { type: ["string","null"] },
      route: { type: "string", enum: ["QUESTIONNER","COMPRENDRE","RECHERCHER","EXPERIMENTER","STOP"] },
      experiment_event: {
        type: "object", additionalProperties: false,
        properties: {
          type: {type:"string",enum:["none","proposed","result_reported","learning_reported","abandoned"]},
          evidence_quote: {type:["string","null"],maxLength:700},
          learning_quote: {type:["string","null"],maxLength:700}
        },
        required:["type","evidence_quote","learning_quote"]
      },
      state: {
        type: "object",
        additionalProperties: false,
        properties: {
          phase: { type: "string" },
          situation: { type: "string" },
          facts: { type: "array", items: { type: "string", maxLength: 700 }, maxItems: 10 },
          observations: { type: "array", items: { type: "string", maxLength: 700 }, maxItems: 10 },
          feelings_reported: { type: "array", items: { type: "string", maxLength: 700 }, maxItems: 10 },
          interpretations: { type: "array", items: { type: "string", maxLength: 700 }, maxItems: 10 },
          hypotheses: { type: "array", items: { type: "string", maxLength: 700 }, maxItems: 10 },
          tensions: { type: "array", items: { type: "string", maxLength: 700 }, maxItems: 10 },
          unknowns: { type: "array", items: { type: "string", maxLength: 700 }, maxItems: 10 },
          questions_attempted: { type: "array", items: { type: "string", maxLength: 700 }, maxItems: 10 },
          pending_experiment: { type: ["string","null"] },
          experiments: { type: "array", items: { type: "string", maxLength: 700 }, maxItems: 10 },
          learnings: { type: "array", items: { type: "string", maxLength: 700 }, maxItems: 10 },
          directions: { type: "array", items: { type: "string", maxLength: 700 }, maxItems: 10 },
          next_action: { type: ["string","null"] },
          last_mode: { type: "string" },
          withdrawal_ready: { type: "boolean" },
          decisive_unknown: { type: ["string","null"] },
          tipping_point: { type: ["string","null"] },
          map_items: {
            type: "array",
            maxItems: 14,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                kind: { type: "string", enum: ["etabli","hypothese","inconnu","test","apprentissage","direction"] },
                text: { type: "string", maxLength: 500 },
                source: { type: "string", enum: ["utilisateur","recherche","experience","boussole"] }
              },
              required: ["kind","text","source"]
            }
          }
        },
        required: ["phase","situation","facts","observations","feelings_reported","interpretations","hypotheses","tensions","unknowns","questions_attempted","pending_experiment","experiments","learnings","directions","next_action","last_mode","withdrawal_ready","decisive_unknown","tipping_point","map_items"]
      }
    },
    required: ["mode","message","phase","target_unknown","knowledge_source","question_needed","question_reason","research_query","stop_reason","route","experiment_event","state"]
  };
}

export function sanitizeState(state = {}) {
  const base = blankState();
  const out = { ...base, ...state };
  const arrays = ["facts","observations","feelings_reported","interpretations","hypotheses","tensions","unknowns","questions_attempted","experiments","learnings","directions"];
  out.map_items = Array.isArray(out.map_items) ? out.map_items.slice(-14) : [];
  for (const key of arrays) out[key] = Array.isArray(out[key]) ? out[key].slice(-12) : [];
  return out;
}

export function governPhase(previousState = blankState(), proposedState = blankState(), proposedPhase = "brouillard") {
  const previousExperiments = Array.isArray(previousState.experiments) ? previousState.experiments.length : 0;
  const previousLearnings = Array.isArray(previousState.learnings) ? previousState.learnings.length : 0;
  const experiments = Array.isArray(proposedState.experiments) ? proposedState.experiments.length : 0;
  const learnings = Array.isArray(proposedState.learnings) ? proposedState.learnings.length : 0;
  const hasPendingExperiment = Boolean(proposedState.pending_experiment);
  const experimentJustCompleted = experiments > previousExperiments;
  const learningJustAdded = learnings > previousLearnings;

  // Une expérience seulement proposée/préparée n'est ni un apprentissage ni une direction.
  if (hasPendingExperiment && !experimentJustCompleted && !learningJustAdded) return "experience";

  // Le premier retour du réel doit être traité comme un apprentissage avant d'être converti en direction.
  if (experimentJustCompleted || learningJustAdded) return "apprentissage";

  // Une direction après expérimentation exige au moins un apprentissage déjà acquis.
  // Sans expérience en jeu, une direction reste possible pour les situations résolubles sans test réel.
  if (proposedPhase === "direction" && experiments > 0 && learnings === 0) return "apprentissage";

  return proposedPhase;
}
