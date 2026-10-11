import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import crypto from 'node:crypto';
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function load(path,deps={},env={}){const module={exports:{}};new Function('require','module','exports',...Object.keys(env),compile(fs.readFileSync(path,'utf8')))(n=>{assert(n in deps,`Unexpected import ${n}`);return deps[n];},module,module.exports,...Object.values(env));return module.exports;}
const dialogue=load('lib/dialogue-devoirs-core.ts'),lecture=load('lib/lecture-devoirs-core.ts');
const core=load('lib/correction-devoir-core.ts',{'./dialogue-devoirs-core':dialogue});
const flow=load('lib/correction-devoir-conversation.ts',{'./instructions':load('lib/instructions.ts',{'@/lib/repertoire':load('lib/normaliser.ts')}),'./correction-devoir-core':core,'./correction-maitre':load('lib/correction-maitre.ts'),'./mode-apprentissage':load('lib/mode-apprentissage.ts')});
const revisionDevoir=t=>crypto.createHash('sha256').update(t).digest('hex');
const texte='DEVOIR 1\nWolof : BIA : Naka nga def ?\nFrançais : BIA : Comment vas-tu ?\nWolof : BIA : Naka nga def ?\nFrançais : BIA : Naka nga def ?';
const d={id:'fixture',texte,revision:revisionDevoir(texte),date:'2026-10-11',langue:'wo',valide:true};
const origin=core.origineReplique(d,'1','wo');
function database({conflict=false,readFail=false,split=false}={}){
 const parts=split?[texte.slice(0,origin.debut+3),texte.slice(origin.debut+3)]:[texte];
 let rows=parts.map((t,i)=>({id:i+1,proposee:JSON.stringify({version:2,type:'devoir',id:d.id,index:i,total:parts.length,texte:t,date:d.date,statut:'validé',date_validation:d.date})}));
 let writes=0,invalidations=0,readAfter=false;
 const fetch=async(url,opts={})=>{
  const u=new URL(url);
  if(opts.method==='PATCH'){
   writes++;if(conflict)return Response.json([]);
   const row=rows.find(r=>'eq.'+r.id===u.searchParams.get('id')&&'eq.'+r.proposee===u.searchParams.get('proposee'));
   assert(row,'CAS must exactly match old stored payload');
   Object.assign(row,JSON.parse(opts.body));readAfter=true;return Response.json([row]);
  }
  if(readAfter&&readFail)return new Response('',{status:503});
  return Response.json(u.searchParams.has('id')?rows.filter(r=>'eq.'+r.id===u.searchParams.get('id')):rows);
 };
 const mod=load('lib/correction-devoir.ts',{'node:crypto':crypto,'./lexique':{lexiqueConfig:{actif:true,url:'https://fixture.invalid',table:'lexique',cle:'test'}},'./lexique-apprentissage-core':{APP_LECONS:'bia-apprentissage-v1'},'./lecture-devoirs-core':lecture,'./devoirs-apprentissage':{invaliderDevoirs(){invalidations++},revisionDevoir},'./correction-devoir-core':core},{fetch,globalThis:{}});
 return {mod,rows,get writes(){return writes},get invalidations(){return invalidations}};
}
test('exact provenance distinguishes duplicate utterance and French counterpart',()=>{
 assert(origin);assert.equal(origin.debut,texte.lastIndexOf('Wolof : BIA : ')+'Wolof : BIA : '.length);
 assert.equal(core.origineReplique(d,'1','fr').debut,texte.lastIndexOf('Naka nga def ?'));
});
test('validated correction changes original payload and normal reading/dialogue, with audit',async()=>{
 const db=database(),corrected='Nanga def ?';const next=await db.mod.corrigerDevoir(origin,corrected);
 const b=JSON.parse(db.rows[0].proposee);assert.equal(db.rows[0].corrigee,b.texte);
 const reloaded=lecture.assemblerDevoirs([b]).devoirs[0];const p=dialogue.analyserDevoir(reloaded).repliques;
 assert.equal(p[0].wo,'Naka nga def ?');assert.equal(p[1].wo,corrected);assert.equal(p[1].fr,'Naka nga def ?');
 assert.equal(b.corrections[0].avant,origin.texte);assert.equal(next.revision,revisionDevoir(b.texte));assert.equal(db.invalidations,1);
 await assert.rejects(db.mod.corrigerDevoir(origin,'old client'),/changé/);assert.equal(db.writes,1);
 await db.mod.corrigerDevoir(next,'Nanga def, sama xarit ?');assert.equal(db.writes,2);
});
test('stale, invalid, concurrent, cross-block and unconfirmed corrections never report success',async()=>{
 for(const o of [{...origin,debut:0},{...origin,revision:'0'.repeat(64)},{...origin,devoir_id:'another'}]){
  const db=database();await assert.rejects(db.mod.corrigerDevoir(o,'new'));assert.equal(db.writes,0);
 }
 for(const [opts,message] of [[{conflict:true},/changé/],[{readFail:true},/confirmation/],[{split:true},/deux blocs/]]){
  const db=database(opts);await assert.rejects(db.mod.corrigerDevoir(origin,'new'),message);assert.equal(db.mod.resumeCorrectionsDevoir().confirmees,0);
 }
});
test('conversation correction repeats before saving, exits after success and preserves exact wording',async()=>{
 let writes=0;let input={question:'Il faut dire : Nanga def ?',maitre:true,origine:origin};
 const save=async(o,t)=>{writes++;assert.deepEqual(o,origin);return {...o,texte:t}};
 let r=await flow.corrigerDevoirConversation(input,save);assert.equal(writes,0);assert.equal(r.aRepeter,'Nanga def ?');assert.deepEqual(r.correction_devoir,origin);
 input={...input,active:r.correction_devoir,phrase:r.aRepeter,question:'Mémorise'};
 r=await flow.corrigerDevoirConversation(input,save);assert.equal(writes,1);assert.equal(r.devoir_corrige,true);assert.equal(r.apprend,false);assert.equal(r.correction_devoir,null);
});
test('cancel, authentication, save failure and repeated corrections preserve safety and retry state',async()=>{
 const forbidden=async()=>{throw Error('must not save')};
 assert.equal(await flow.corrigerDevoirConversation({question:'Il faut dire : test',maitre:false,origine:origin},forbidden),null);
 assert.equal(await flow.corrigerDevoirConversation({question:'Mémorise',maitre:true,origine:origin},forbidden),null);
 const active={maitre:true,active:origin,phrase:'Jërëjëf.'};
 const cancel=await flow.corrigerDevoirConversation({...active,question:'Annule'},forbidden);assert.equal(cancel.correction_devoir,null);
 const repeat=await flow.corrigerDevoirConversation({...active,question:'Il faut dire : Jërëjëf, sama xarit.'},forbidden);assert.equal(repeat.aRepeter,'Jërëjëf, sama xarit.');
 const fail=await flow.corrigerDevoirConversation({...active,question:'Mémorise'},async()=>{throw Error('Supabase indisponible')});assert.equal(fail.retenu,undefined);assert.deepEqual(fail.correction_devoir,origin);assert.match(fail.reply,/indisponible/);
});
test('real save button endpoint requires master, saves full source correction, and never inserts standalone fallback',async()=>{
 let master=false,writes=0;const long='Jërëjëf. '.repeat(70);
 const route=load('app/api/retenir/route.ts',{
  '@/lib/correction-devoir':{corrigerDevoir:async(o,t)=>{writes++;assert.deepEqual(o,origin);assert.equal(t,long.trim());return {...o,texte:t};}},
  '@/lib/correction-devoir-core':core,'next/server':{NextResponse:{json:(body,opt)=>({body,...opt})}},
  '@/lib/codes':{verifierCode:()=>({ok:master,maitre:master})},'@/lib/lexique':{ajouterCorrection:async()=>{throw Error('standalone insert forbidden')}},
  '@/lib/lecons-vues':{},'@/lib/repertoire':{},'@/lib/panne':{},'@/lib/corpus':{},
 });
 const req={headers:{get:()=>null},json:async()=>({texte:long,correctionDevoir:origin})};
 assert.equal((await route.POST(req)).status,401);assert.equal(writes,0);master=true;
 const r=await route.POST(req);assert.equal(r.body.devoir_corrige,true);assert.equal(writes,1);
});
test('actual chat handler runs correction and validation before learned selection or generic response',async()=>{
 const source=fs.readFileSync('app/api/chat/route.ts','utf8'),ast=ts.createSourceFile('route.ts',source,ts.ScriptTarget.Latest,true);let fn;
 ast.forEachChild(n=>{if(ts.isFunctionDeclaration(n)&&n.name?.text==='repondre')fn=n.getText(ast);});
 let writes=0;const env={verifierCode:()=>({ok:true,maitre:true}),noterPassage(){},parleDeMemoire:()=>false,corrigerDevoirConversation:flow.corrigerDevoirConversation,corrigerDevoir:async(o,t)=>{writes++;return {...o,texte:t};}};
 const run=new Function('env',`with(env){${compile(fn)}return repondre;}`)(env);
 const first=await run({message:'Il faut dire : Nanga def ?',origineDevoir:origin},'master',null);
 assert.equal(first.corps.aRepeter,'Nanga def ?');assert.equal(writes,0);
 const next=await run({message:'Mémorise',correctionDevoir:first.corps.correction_devoir,aRepeter:first.corps.aRepeter},'master',null);
 assert.equal(next.corps.devoir_corrige,true);assert.equal(writes,1);
});

test('established spoken validation and cancellation commands keep their meaning in a root correction',async()=>{
 for(const question of ["C’est bon, mémorise ça", "garde garde", "voilà, mémorise ça"]){
  let writes=0;const r=await flow.corrigerDevoirConversation({question,maitre:true,active:origin,phrase:'Nanga def ?'},async(o,t)=>{writes++;assert.equal(t,'Nanga def ?');return {...o,texte:t}});
  assert.equal(writes,1);assert.equal(r.devoir_corrige,true);
 }
 for(const question of ['Ne retiens pas ça','annule ça']){
  const r=await flow.corrigerDevoirConversation({question,maitre:true,active:origin,phrase:'Nanga def ?'},async()=>{throw Error('must not save')});assert.equal(r.correction_devoir,null);
 }
});
