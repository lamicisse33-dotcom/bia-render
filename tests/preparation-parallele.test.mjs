import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
// Execute the actual preparation statements in route order with controlled I/O.
const source=fs.readFileSync('app/api/chat/route.ts','utf8');
const ast=ts.createSourceFile('route.ts',source,ts.ScriptTarget.Latest,true);
const names=new Set(['laMemoire','contexteEnCours','motsEnCours','souvenirsDuTour','contextePret','motsPrets']);
const statements=[];
function visit(node){
 if(ts.isVariableStatement(node)&&node.declarationList.declarations.some(d=>names.has(d.name.getText(ast))||d.initializer?.getText(ast)==='contextePret.valeurs'||d.initializer?.getText(ast)==='motsPrets.valeurs'))statements.push(node.getText(ast));
 if(ts.isIfStatement(node)&&['!contextePret.ok','!motsPrets.ok'].includes(node.expression.getText(ast)))statements.push(node.getText(ast));
 ts.forEachChild(node,visit);
}
visit(ast);
assert.equal(statements.length,10);
const body=ts.transpileModule(statements.join('\n')+'\nreturn {souvenirsDuTour,savoir,cosmetiques,aMontrer,referencesDuTour,mots};',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
function scenario(){
 const pending={},calls=[];
 const io=name=>()=>{calls.push(name);return (pending[name]??=deferred()).promise;};
 const env={chrono:(_nom,fn)=>fn(),souvenirsActifs:()=>true,quiParle:'owner',question:'question',body:{history:[]},maitre:{ok:true,maitre:true},utiliserChoix:true,
 retrouver:io('memory'),savoirKhalam:io('knowledge'),savoirProduits:io('products'),catalogue:io('catalogue'),contexteDevoirs:io('lessons'),contexteInstructions:io('instructions'),contexteMaitrises:io('mastery'),fichesPourConversation:io('cards'),choixDuTour:io('choice'),motsCorriges:io('words'),consigneDesSouvenirs:x=>x,noterPanne:()=>{}};
 const result=new AsyncFunction(...Object.keys(env),body)(...Object.values(env));
 return {pending,calls,result};
}
test('all independent reads start before personal memory finishes, preserving exact results',async()=>{
 const s=scenario();assert.equal(s.calls.length,10);assert.equal(new Set(s.calls).size,10);
 let done=false;s.result.then(()=>done=true);
 for(const [name,p] of Object.entries(s.pending))if(name!=='memory')p.resolve(name);
 await new Promise(r=>setImmediate(r));assert.equal(done,false);
 s.pending.memory.resolve('private memory');
 assert.deepEqual(await s.result,{souvenirsDuTour:'private memory',savoir:'knowledge',cosmetiques:'products',aMontrer:'catalogue',referencesDuTour:['lessons','instructions','mastery','cards','choice',''],mots:'words'});
});
test('early rejection is held until consumption and existing optional fallbacks survive',async()=>{
 const s=scenario();const error=Error('unavailable');
 s.pending.knowledge.reject(error);s.pending.lessons.reject(Error('optional'));
 await new Promise(r=>setImmediate(r));
 const check=assert.rejects(s.result,e=>e===error);
 for(const [name,p] of Object.entries(s.pending))if(!['knowledge','lessons'].includes(name))p.resolve(name);
 await check;
});
