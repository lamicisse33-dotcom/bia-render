import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const cache=new Map();
function load(name){if(cache.has(name))return cache.get(name);const m={exports:{}};const source=fs.readFileSync('lib/'+name+'.ts','utf8');const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','module','exports',js)(id=>load(id.slice(2)),m,m.exports);cache.set(name,m.exports);return m.exports;}
const {identiteLocale}=load('identite-locale'),core=load('sons-courants-core');
const sons=core.PHRASES_COURANTES.filter(p=>p.cle==='ton-nom').map(p=>({...p,adresse:'/current/'+p.langue+'.mp3',secondes:1,octets:2000,version:core.VERSION_SONS_COURANTS}));
test('the exact name recording works on every turn and in either portrait without an acknowledgement',()=>{
 assert.equal(sons.length,2);
 for(const persona of ['bia','rara'])for(const ouverture of [true,false])for(const [q,langue] of [["Comment tu t'appelles ?",'fr'],['Noo tudd ?','wo'],['Bonjour Bia, quel est ton nom ?','fr']]){
  const r=identiteLocale(q,sons,{apprend:false,correction:false,persona,ouverture});assert(r);assert(r.identite);assert.equal(r.langue,langue);assert.equal(r.reply,r.son_courant.texte);assert.equal(r.son_courant.usage,'identite');assert(!/accord|voir ça/i.test(r.reply));
 }
});
test('learning, corrections, stale text and real additional requests cannot use the name shortcut',()=>{
 const opt={apprend:false,correction:false};
 for(const q of ['Lis : comment tu t’appelles ?','Comment tu t’appelles et que peux-tu faire ?','Mon amie s’appelle Rara'])assert.equal(identiteLocale(q,sons,opt),null);
 assert.equal(identiteLocale('Noo tudd ?',sons,{...opt,apprend:true}),null);
 assert.equal(identiteLocale('Noo tudd ?',sons,{...opt,correction:true}),null);
 assert.equal(identiteLocale('Noo tudd ?',sons.map(s=>({...s,texte:'Ancienne phrase'})),opt),null);
});
test('the actual ask callback cannot schedule a spoken waiting prefix',()=>{
 const source=fs.readFileSync('app/page.tsx','utf8'),ast=ts.createSourceFile('page.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let callback;
 function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='askBia')callback=n.initializer.arguments[0];ts.forEachChild(n,visit);}visit(ast);assert(callback);
 const calls=[];function collect(n){if(ts.isCallExpression(n))calls.push(n.expression.getText(ast));ts.forEachChild(n,collect);}collect(callback);
 assert(!calls.includes('programmerReactionCourante'));assert(!calls.includes('reactionDisponible'));assert(calls.includes('identiteLocale'));assert(calls.includes('salutationLocale'));
});
