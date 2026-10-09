import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { test } from "node:test";
import ts from "typescript";
const source = readFileSync(new URL("../app/api/ecouter/route.ts", import.meta.url), "utf8");
const helper = source.slice(source.indexOf("function transcriptionEnBoucle"), source.indexOf("export async function POST"));
const js = ts.transpileModule(helper, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const detect = new Function(js + ";return transcriptionEnBoucle;")();
test("reject the screenshot's mechanical loop", () => {
  assert.equal(detect("Donn a fa doon a doon a fa doon a fa doon a fa doon a fa doon a fa doon a fa doon a fa doon a fa doon a fa doon a fa doon a fa doon a fa doon a fa doon"), true);
});
test("preserve normal mixed Wolof/French and short repetitions", () => {
  assert.equal(detect("Bu fekkee dégg nga bu baax li ma wax, dama bëgg nga koy répété benn par benn, pour ñu mën a déggoo bu baax, komme ça nga comprendre exactement li ma lay wax."), false);
  assert.equal(detect("oui oui oui oui"), false);
  assert.equal(detect("Je voudrais apprendre cette phrase. Je voudrais aussi entendre sa prononciation. Ensuite nous allons faire un exercice pour vérifier les mots et les accents."), false);
});
test("support accented loop detection", () => {
  assert.equal(detect("ñëw ñëw ñëw ".repeat(12)), true);
});
test("reject before corpus capture with an empty transcription", () => {
  assert.ok(source.indexOf("if (transcriptionEnBoucle") < source.indexOf("const depot = garderLaVoix"));
  assert.match(source, /texte: "", transcription_rejetee: true/);
});
