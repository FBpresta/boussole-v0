import express from "express";
import fs from "node:fs";
import crypto from "node:crypto";
import OpenAI from "openai";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const MODEL = process.env.OPENAI_MODEL || "gpt-6-sol";
const APP_VERSION = "0.4.1";
const API_KEY = process.env.OPENAI_API_KEY || "";
const client = API_KEY ? new OpenAI({ apiKey: API_KEY }) : null;
const SYSTEM = fs.readFileSync(new URL("./system-prompt.txt", import.meta.url), "utf8");
const sessions = new Map();

function normalizeMessages(messages = []) {
  if (!Array.isArray(messages)) return [];
  return messages.slice(-24).map(m => ({
    role: m?.role === "assistant" ? "assistant" : "user",
    text: String(m?.text || "").slice(0, 6000),
    ...(m?.diagnostic ? { diagnostic: m.diagnostic } : {})
  })).filter(m => m.text.trim());
}

app.use(express.json({ limit: "1mb" }));
app.get("/", (_req, res) => res.sendFile(new URL("./index.html", import.meta.url).pathname));

function blankState() {
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

function schema() {
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
    required: ["mode","message","phase","target_unknown","knowledge_source","question_needed","question_reason","research_query","stop_reason","route","state"]
  };
}

function sanitizeState(state = {}) {
  const base = blankState();
  const out = { ...base, ...state };
  const arrays = ["facts","observations","feelings_reported","interpretations","hypotheses","tensions","unknowns","questions_attempted","experiments","learnings","directions"];
  out.map_items = Array.isArray(out.map_items) ? out.map_items.slice(-14) : [];
  for (const key of arrays) out[key] = Array.isArray(out[key]) ? out[key].slice(-12) : [];
  return out;
}

async function structuredTurn(context) {
  const makeRequest = (extraInstruction = "", maxTokens = 4200) => client.responses.create({
    model: MODEL,
    instructions: SYSTEM + extraInstruction,
    input: JSON.stringify(context),
    text: { format: { type: "json_schema", name: "boussole_turn", strict: true, schema: schema() } },
    max_output_tokens: maxTokens
  });

  let response = await makeRequest();
  try {
    return JSON.parse(response.output_text);
  } catch (firstError) {
    console.warn("BOUSSOLE_JSON_RETRY", firstError?.message || firstError);
    response = await makeRequest("\nIMPORTANT TECHNIQUE : la réponse précédente a été tronquée ou invalide. Retourne un JSON COMPLET et CONCIS. Réduis fortement la carte : seulement les éléments indispensables, sans répétition.", 6500);
    return JSON.parse(response.output_text);
  }
}

async function runModel(session, userText) {
  const context = {
    state: session.state,
    recent_messages: session.messages.slice(-18),
    current_user_message: userText
  };

  const totalStart = Date.now();
  const routerStart = Date.now();
  let result = await structuredTurn(context);
  const routerMs = Date.now() - routerStart;

  // La route est l'autorité de gouvernance. Une incohérence "route=RECHERCHER"
  // mais "mode!=research" ne doit plus empêcher la recherche réelle.
  const shouldResearch =
    result.route === "RECHERCHER" ||
    result.mode === "research" ||
    result.knowledge_source === "external";

  let researchMs = 0;
  let synthesisMs = 0;
  let researchTriggered = false;

  if (shouldResearch) {
    researchTriggered = true;
    const query = String(
      result.research_query ||
      result.target_unknown ||
      `${userText} — recherche factuelle utile pour départager la prochaine étape`
    ).trim();

    const researchStart = Date.now();
    const research = await client.responses.create({
      model: MODEL,
      instructions: "Fais une recherche factuelle courte pour Boussole. Réponds en français. Utilise le web. Donne les sources ou organismes identifiables et les liens lorsqu'ils sont disponibles. Distingue les faits des incertitudes. Ne prends aucune décision personnelle à la place de l'utilisateur.",
      input: query,
      tools: [{ type: "web_search" }],
      max_output_tokens: 1200
    });
    researchMs = Date.now() - researchStart;

    const synthesisStart = Date.now();
    result = await structuredTurn({
      ...context,
      first_router_result: result,
      research_query_used: query,
      research_result: research.output_text
    });
    synthesisMs = Date.now() - synthesisStart;
  }

  const totalMs = Date.now() - totalStart;
  console.log("BOUSSOLE_PERF", JSON.stringify({
    route: result.route,
    mode: result.mode,
    researchTriggered,
    routerMs,
    researchMs,
    synthesisMs,
    totalMs
  }));

  return result;
}

app.get("/api/health", (_req, res) => res.json({ ok: true, configured: Boolean(client), model: MODEL, version: APP_VERSION }));

app.post("/api/session", (req, res) => {
  const id = crypto.randomUUID();
  const resume = req.body?.resume || {};
  const session = {
    id,
    state: sanitizeState(resume.state || blankState()),
    messages: normalizeMessages(resume.messages || [])
  };
  sessions.set(id, session);
  res.json(session);
});

app.get("/api/session/:id", (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: "Session introuvable" });
  res.json(session);
});

app.delete("/api/session/:id", (req, res) => {
  sessions.delete(req.params.id);
  res.json({ ok: true });
});

app.post("/api/session/:id/message", async (req, res) => {
  try {
    if (!client) return res.status(503).json({ error: "La clé OpenAI n'est pas encore configurée sur le serveur." });
    const text = String(req.body?.message || "").trim();
    if (!text) return res.status(400).json({ error: "Message vide" });

    let session = sessions.get(req.params.id);
    if (!session) {
      const resume = req.body?.resume || {};
      session = {
        id: req.params.id,
        state: sanitizeState(resume.state || blankState()),
        messages: normalizeMessages(resume.messages || [])
      };
      sessions.set(req.params.id, session);
      console.log("Session restaurée automatiquement après redémarrage Render");
    }

    session.messages.push({ role: "user", text });
    const result = await runModel(session, text);
    session.state = sanitizeState(result.state);
    session.state.phase = result.phase;
    session.state.last_mode = result.mode;

    const diagnostic = {
      mode: result.mode,
      target_unknown: result.target_unknown,
      knowledge_source: result.knowledge_source,
      question_needed: result.question_needed,
      question_reason: result.question_reason,
      stop_reason: result.stop_reason,
      research_query: result.research_query,
      route: result.route,
      decisive_unknown: session.state.decisive_unknown,
      tipping_point: session.state.tipping_point
    };

    session.messages.push({ role: "assistant", text: result.message, diagnostic });
    res.json({ message: result.message, state: session.state, diagnostic });
  } catch (error) {
    console.error("BOUSSOLE_ENGINE_ERROR", error?.status || "", error?.code || "", error?.message || error);
    res.status(500).json({ error: "Le moteur n'a pas pu répondre." });
  }
});

app.listen(PORT, "0.0.0.0", () => console.log(`Boussole V${APP_VERSION} sur le port ${PORT}`));
