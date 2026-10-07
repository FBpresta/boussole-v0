
import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";
const prompt=fs.readFileSync(new URL("./system-prompt.txt",import.meta.url),"utf8");
test("interdit le questionnaire",()=>assert.match(prompt,/Aucun questionnaire/));
test("traite je ne sais pas",()=>assert.match(prompt,/Après « je ne sais pas »/));
test("permet le retrait",()=>assert.match(prompt,/RETRAIT/));
test("impose une seule question utile",()=>assert.match(prompt,/Une seule question utile/));
test("sépare observation et apprentissage",()=>assert.match(prompt,/Prédiction → observation → écart → apprentissage/));

test("sépare test proposé, test réalisé et apprentissage",()=>assert.match(prompt,/Nous savons quoi tester.*nous avons testé.*nous avons appris/s));
test("interdit direction directe depuis expérience en attente",()=>assert.match(prompt,/Ne passe pas directement d.une expérience en attente à direction/));
