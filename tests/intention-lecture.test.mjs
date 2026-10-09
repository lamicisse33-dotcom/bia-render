import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";import ts from "typescript";
async function load(path){const js=ts.transpileModule(fs.readFileSync(path,"utf8"),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;return import("data:text/javascript;base64,"+Buffer.from(js).toString("base64"));}
const {demandeLecture}=await load("lib/intention-lecture.ts");
const {LectureContinue,segmentsLecture}=await load("lib/lecture-continue.ts");
test("natural commands and technical prefixes extract supplied text",()=>{
 for(const command of ["lis ce texte","lis à haute voix","commence la lecture","exercice de lecture","MODE_APPRENTISSAGE","DÉMARRER APPRENTISSAGE","Lis-moi le message"]){
  const text="Le taxi arrive. Lis-moi le texte. Ñu ngi fi.";
  assert.deepEqual(demandeLecture(command+":\n"+text),{texte:text,auto:true});
 }
 assert.equal(demandeLecture("MODE_APPRENTISSAGE Bonjour papa.").texte,"Bonjour papa.");
 assert.equal(demandeLecture("Lis à haute voix le texte suivant :\nBonjour." ).texte,"Bonjour.");
 assert.equal(demandeLecture("Bia, s'il te plaît, lis ce texte : Bonjour.").texte,"Bonjour.");
});
test("an already supplied text is reused; missing content opens reader rather than chat",()=>{
 assert.deepEqual(demandeLecture("commence la lecture","Contenu déjà fourni."),{texte:"Contenu déjà fourni.",auto:true});
 assert.deepEqual(demandeLecture("lis ce texte"),{texte:"",auto:false});
 for(const text of ["Ne lis pas ce texte","Pourquoi ne peux-tu pas lire à haute voix ?","Explique cet exercice de lecture","taxi et texte"])assert.equal(demandeLecture(text),null);
});
async function read(text,failIndex=-1){
 const parsed=demandeLecture("lis à haute voix:\n"+text);const expected=segmentsLecture(text);const requested=[],played=[];let failures=0;
 let complete;const done=new Promise(r=>complete=r);const timer=setTimeout(()=>complete("timeout"),10000);
 const reader=new LectureContinue(async(t)=>{requested.push(t);if(t===expected[failIndex]&&failures++===0)throw Error("temporary TTS failure");return t;},async(t)=>played.push(t),{pause(){},reprendre(){},stop(){}},p=>{if(p.etat==="terminé")complete(p);});
 reader.demarrer(parsed.texte);const result=await done;clearTimeout(timer);assert.notEqual(result,"timeout");assert.deepEqual(played,[...expected,"Exercice terminé"]);assert.equal(played.slice(0,-1).join(""),text);return requested;
}
test("short phrase goes to TTS exactly without a language model",async()=>{await read("Le taxi arrive. Lis-moi le texte.");});
test("long >60-word text is complete, retries a failed block and announces completion once",async()=>{
 const text=Array.from({length:120},(_,i)=>`Phrase ${i} : tu peux lire ce texte avec tous ses accents, sans résumer ni ajouter de contenu. Ñu ngi fi.\n`).join("");
 await read(text,4);
});
test("page routes before chat and retains the streaming / lexicon pipeline",()=>{
 const page=fs.readFileSync("app/page.tsx","utf8");
 const ask=page.slice(page.indexOf("const askBia ="));assert.ok(ask.indexOf("const lectureDemandee=demandeLecture")<ask.indexOf("busyRef.current = true"));
 assert.match(ask,/setLectureContinue\(\{texte:lecture.texte/);
 const panel=fs.readFileSync("app/LectureApprentissage.tsx","utf8");assert.match(panel,/\/api\/chatterbox-test\/bia\/stream/);assert.match(panel,/lecture:true/);
 const route=fs.readFileSync("app/api/chatterbox-test/bia/stream/route.ts","utf8");assert.match(route,/prononciationsApprises/);assert.match(route,/segmentsLecture/);
 const aliases=fs.readFileSync("data/prononciation.txt","utf8");for(const line of ["taxi = taksi","texte = tè-kst","lis-moi = li-moi"])assert.ok(aliases.includes(line));
});
