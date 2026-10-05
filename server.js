
import "dotenv/config";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import OpenAI from "openai";

const app=express();
const PORT=Number(process.env.PORT||3000);
const MODEL=process.env.OPENAI_MODEL||"gpt-5.6";
const client=process.env.OPENAI_API_KEY ? new OpenAI({apiKey:process.env.OPENAI_API_KEY}) : null;
const SYSTEM=fs.readFileSync(new URL("./system-prompt.txt",import.meta.url),"utf8");
const DB=new URL("./data/sessions.json",import.meta.url);

app.use(express.json({limit:"1mb"}));
app.use(express.static(new URL("./public",import.meta.url).pathname));

function blankState(){
 return {phase:"brouillard",situation:"",facts:[],observations:[],feelings_reported:[],
 interpretations:[],hypotheses:[],tensions:[],unknowns:[],questions_attempted:[],
 pending_experiment:null,experiments:[],learnings:[],directions:[],next_action:null,
 last_mode:"understand",withdrawal_ready:false};
}
function load(){
 try{return JSON.parse(fs.readFileSync(DB,"utf8"))}catch{return {}}
}
function save(db){fs.writeFileSync(DB,JSON.stringify(db,null,2))}
function clampArray(x,n=12){return Array.isArray(x)?x.slice(-n):[]}
function sanitizeState(s={}){
 const b=blankState(); const out={...b,...s};
 for(const k of ["facts","observations","feelings_reported","interpretations","hypotheses","tensions","unknowns","questions_attempted","experiments","learnings","directions"]) out[k]=clampArray(out[k]);
 return out;
}
function schema(){
 return {
  type:"object",additionalProperties:false,
  properties:{
   mode:{type:"string",enum:["understand","reflect","synthesize","answer","ask","research","challenge","propose_experiment","prepare_experiment","learn_from_experiment","direction","withdraw"]},
   message:{type:"string"},
   phase:{type:"string",enum:["brouillard","clarte","experience","apprentissage","direction"]},
   target_unknown:{type:["string","null"]},
   knowledge_source:{type:"string",enum:["introspection","memory","recognition","external","third_party","real_world_experiment","none"]},
   question_needed:{type:"boolean"},
   question_reason:{type:"string"},
   research_query:{type:["string","null"]},
   stop_reason:{type:["string","null"]},
   state:{type:"object",additionalProperties:false,properties:{
    phase:{type:"string"},situation:{type:"string"},
    facts:{type:"array",items:{type:"string"}},observations:{type:"array",items:{type:"string"}},
    feelings_reported:{type:"array",items:{type:"string"}},interpretations:{type:"array",items:{type:"string"}},
    hypotheses:{type:"array",items:{type:"string"}},tensions:{type:"array",items:{type:"string"}},
    unknowns:{type:"array",items:{type:"string"}},questions_attempted:{type:"array",items:{type:"string"}},
    pending_experiment:{type:["object","null"],additionalProperties:true},
    experiments:{type:"array",items:{type:"string"}},learnings:{type:"array",items:{type:"string"}},
    directions:{type:"array",items:{type:"string"}},next_action:{type:["string","null"]},
    last_mode:{type:"string"},withdrawal_ready:{type:"boolean"}
   },required:["phase","situation","facts","observations","feelings_reported","interpretations","hypotheses","tensions","unknowns","questions_attempted","pending_experiment","experiments","learnings","directions","next_action","last_mode","withdrawal_ready"]}
  },
  required:["mode","message","phase","target_unknown","knowledge_source","question_needed","question_reason","research_query","stop_reason","state"]
 };
}
async function runModel(session,userText){
 const context={
  state:session.state,
  recent_messages:session.messages.slice(-18),
  current_user_message:userText
 };
 const response=await client.responses.create({
  model:MODEL,
  instructions:SYSTEM,
  input:JSON.stringify(context),
  text:{format:{type:"json_schema",name:"boussole_turn",strict:true,schema:schema()}},
  max_output_tokens:1800
 });
 let result=JSON.parse(response.output_text);
 // Optional second pass with web search when the router says the missing knowledge is external.
 if(result.mode==="research" && result.research_query){
   const research=await client.responses.create({
    model:MODEL,
    instructions:`Tu fais une recherche factuelle courte pour Boussole. Réponds en français, distingue les faits des incertitudes et ne prends aucune décision personnelle à la place de l'utilisateur.`,
    input:result.research_query,
    tools:[{type:"web_search"}],
    max_output_tokens:1200
   });
   const researchText=research.output_text;
   const second=await client.responses.create({
    model:MODEL,
    instructions:SYSTEM,
    input:JSON.stringify({...context,first_router_result:result,research_result:researchText}),
    text:{format:{type:"json_schema",name:"boussole_turn",strict:true,schema:schema()}},
    max_output_tokens:1800
   });
   result=JSON.parse(second.output_text);
   result.research_summary=researchText;
 }
 return result;
}
app.get("/api/health",(req,res)=>res.json({ok:true,model:MODEL,configured:Boolean(client)}));
app.post("/api/session",(req,res)=>{
 const db=load(); const id=crypto.randomUUID();
 db[id]={id,created_at:new Date().toISOString(),state:blankState(),messages:[]}; save(db);
 res.json(db[id]);
});
app.get("/api/session/:id",(req,res)=>{
 const s=load()[req.params.id]; if(!s)return res.status(404).json({error:"Session introuvable"}); res.json(s);
});
app.post("/api/session/:id/message",async(req,res)=>{
 try{
  if(!client)return res.status(503).json({error:"OPENAI_API_KEY n'est pas configurée sur le serveur."});
  const text=String(req.body?.message||"").trim();
  if(!text)return res.status(400).json({error:"Message vide"});
  const db=load(); const s=db[req.params.id]; if(!s)return res.status(404).json({error:"Session introuvable"});
  s.messages.push({role:"user",text,at:new Date().toISOString()});
  const result=await runModel(s,text);
  s.state=sanitizeState(result.state);
  s.state.phase=result.phase; s.state.last_mode=result.mode;
  s.messages.push({role:"assistant",text:result.message,at:new Date().toISOString(),diagnostic:{
   mode:result.mode,target_unknown:result.target_unknown,knowledge_source:result.knowledge_source,
   question_needed:result.question_needed,question_reason:result.question_reason,
   stop_reason:result.stop_reason,research_query:result.research_query
  }});
  db[s.id]=s; save(db);
  res.json({message:result.message,state:s.state,diagnostic:s.messages.at(-1).diagnostic,research_summary:result.research_summary||null});
 }catch(e){console.error(e);res.status(500).json({error:"Le moteur n'a pas pu répondre.",detail:process.env.NODE_ENV==="development"?String(e?.message||e):undefined})}
});
app.delete("/api/session/:id",(req,res)=>{const db=load();delete db[req.params.id];save(db);res.json({ok:true})});
app.listen(PORT,()=>console.log(`Boussole V0 : http://localhost:${PORT}`));
