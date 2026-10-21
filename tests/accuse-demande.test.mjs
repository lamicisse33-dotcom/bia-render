import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';
const cache=new Map();function load(name){if(cache.has(name))return cache.get(name);const m={exports:{}};const js=ts.transpileModule(fs.readFileSync('lib/'+name+'.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','module','exports',js)(id=>load(id.slice(2)),m,m.exports);cache.set(name,m.exports);return m.exports;}
const {accuseDemandePertinent}=load('accuse-demande');
test('a concrete question or search can acknowledge verification',()=>{
 for(const q of ['Cherche une pharmacie à Dakar','Peux-tu vérifier cette information ?','Quel est le prix du riz ?','Combien coûte un billet ?','Pourquoi le ciel est bleu ?','Comment fonctionne une batterie ?','Explique les règles du football','Où se trouve la mairie ?','Lan mooy inflation ?'])assert.equal(accuseDemandePertinent(q),true,q);
});
test('name, greetings, emotional conversation and follow-ups cannot become waiting phrases',()=>{
 for(const q of ["Comment tu t'appelles ?",'Bonjour, quel est ton nom ?','Noo tudd ?','Sa tur mooy lan ?','Bonjour','Nanga def ?','Oui','Non','D’accord','Et ensuite ?','Pourquoi ?','Comment va ta journée ?','Qu’est-ce que tu en penses ?','Tu es là ?','Je suis triste','Ma copine ne répond pas','Pourquoi tu me réponds comme ça ?'])assert.equal(accuseDemandePertinent(q),false,q);
});
test('the actual acknowledgement stops an active MMM and invalidates a delayed MMM before playback',async()=>{
 const source=fs.readFileSync('app/page.tsx','utf8'),ast=ts.createSourceFile('page.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let arrow;
 function visit(n){if(ts.isCallExpression(n)&&n.expression.getText(ast)==='programmerReactionCourante'){const p=n.arguments[0].properties.find(p=>p.name?.getText(ast)==='jouer');arrow=p.initializer.getText(ast);}ts.forEachChild(n,visit);}visit(ast);assert(arrow);
 for(const actif of [true,false]){
  const token={},events=[],env={cacheSons:{current:new Map([['clip',new ArrayBuffer(2000)]])},reaction:{adresse:'clip'},attenteRef:{current:token},taireLeSouffle:()=>events.push('stop_mmm'),performance,fetch:async()=>({ok:true}),setMode(){},setFace(){},jouerEtAnimer:async()=>{assert.equal(env.attenteRef.current,null);assert.deepEqual(events,['stop_mmm']);events.push('verification');}};
  const js=ts.transpileModule('const play='+arrow,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  const play=new Function('env',`with(env){${js};return play;}`)(env);await play(()=>actif);
  assert.deepEqual(events,actif?['stop_mmm','verification']:[]);assert.equal(env.attenteRef.current===token,!actif);
 }
});
