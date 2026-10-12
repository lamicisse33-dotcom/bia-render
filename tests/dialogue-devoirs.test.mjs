import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function load(path,deps={},env={}){const module={exports:{}};new Function('require','module','exports',...Object.keys(env),compile(fs.readFileSync(path,'utf8')))(n=>{assert(n in deps,`Unexpected import ${n}`);return deps[n];},module,module.exports,...Object.values(env));return module.exports;}
const core=load('lib/dialogue-devoirs-core.ts'),langue=load('lib/langue.ts');
const normalisation=load('lib/normaliser.ts'),textes=load('lib/repertoire-textes.ts'),services=load('lib/services-textes.ts');
const salutations=load('lib/salutations-dialogue.ts',{'./normaliser':normalisation,'./repertoire-textes':textes,'./services-textes':services});
const saved=texte=>({id:'fixture',texte,langue:'wo',valide:true,date:'2026-10-11'});
// Test-only wording; production never uses this fixture as a lesson.
const fixture=saved(`DEVOIR 15 — Couple, messages et incompréhension
1. Wolof : Personne : Bia, sama copine tontuwul sama message yi depuis démb.
Français : Personne : Bia, ma copine ne répond plus à mes messages depuis hier.
2. Wolof : BIA : Ndax am na problème ?
Français : BIA : Vous vous êtes disputés ?
3. Wolof : Personne : Waaw.
Français : Personne : Oui.
4. Wolof : BIA : Lan nga ko wax ?
Français : BIA : Que lui as-tu dit ?
5. Wolof : Personne : Déedéet.
Français : Personne : Non.
6. Wolof : BIA : Bul gaaw.
Français : BIA : Laisse-lui un peu de temps.
7. Wolof : BIA : Naka ? Lan ?
Français : BIA : Comment ? Pourquoi ?`);
const index=core.indexerDevoirs([fixture]);
function service(fetch=async()=>{throw Error('Unexpected network');},devoirs=async()=>({devoirs:[fixture]})){
 return load('lib/dialogue-devoirs.ts',{'./salutations-dialogue':salutations,'./dialogue-devoirs-core':core,'./langue':langue,'./devoirs-apprentissage':{devoirsALire:devoirs}}, {fetch,globalThis:{},process:{env:{BIA_LLM_PROVIDER:'cerebras',CEREBRAS_API_KEY:'test-only'}}});
}
test('explicit bilingual pairs preserve text and roles without guessing missing translations',()=>{
 assert.equal(core.analyserDevoir(saved('Wolof : 20 minutes.\nFrançais : 20 minutes.')).repliques[0].fr,'20 minutes.');
 assert.equal(index[0].repliques.length,7);assert.equal(index[0].repliques[0].role,'personne');assert.equal(index[0].repliques[1].wo,'Ndax am na problème ?');
 const d=core.analyserDevoir(saved('Wolof\n1. Naka ?\n2. Waaw.\nFrançais\n1. Comment ?\n2. Oui.'));
 assert.deepEqual(d.repliques.map(x=>x.fr),['Comment ?','Oui.']);
 const table=core.analyserDevoir(saved('| Wolof | Français |\n| --- | --- |\n| Naka ? | Comment ? |'));
 assert.equal(table.repliques.length,1);assert.equal(table.repliques[0].wo,'Naka ?');
 assert.equal(core.analyserDevoir(saved('Wolof : Naka ?')).repliques.length,0);
 assert.equal(core.analyserDevoir(saved('- **Wolof :** Naka ?\n- **Français :** Comment ?')).repliques.length,1);
});
test('newest complete version of a numbered lesson wins',()=>{
 const d=core.indexerDevoirs([{...fixture,id:'old',date:'2020'},fixture]);assert.equal(d.length,1);assert.equal(d[0].id,'fixture');
 assert.equal(core.indexerDevoirs([fixture,{...fixture,id:'another',texte:fixture.texte.replace('Couple, messages et incompréhension','Autre sujet')}]).length,2);
});
test('calls retrieve the messages lesson; a short answer retains the active dialogue',()=>{
 assert.equal(core.chercherDialogues(index,'Ma copine ne répond plus à mes appels.',[]).length,1);
 assert.equal(core.chercherDialogues(index,'Non.',[{role:'bia',text:'Vous vous êtes disputés ?'}])[0].actif,true);
 assert.equal(core.chercherDialogues(index,'Quelle est la capitale du Japon ?',[]).length,0);
});
test('only a selectable, unspoken, single-question source string can be returned',()=>{
 const packet=core.paquetSelection(core.chercherDialogues(index,'ma copine mes appels',[]),[],'wo');
 assert.equal(core.resoudreSelection({statut:'selection',id:'0:1',reply:'invented'},packet,'wo').reply,'Ndax am na problème ?');
 for(const id of ['0:0','0:2','0:6','0:999','999:1'])assert.equal(core.resoudreSelection({statut:'selection',id},packet,'fr').statut,'clarifier');
 const again=core.paquetSelection(core.chercherDialogues(index,'oui',[{role:'bia',text:'Vous vous êtes disputés ?'}]),[{role:'bia',text:'Vous vous êtes disputés ?'}],'wo');
 assert.equal(core.resoudreSelection({statut:'selection',id:'0:1'},again,'wo').statut,'clarifier');
});
test('large lessons are bounded while retaining follow-up neighbours and exact original IDs',()=>{
 const lines=Array.from({length:300},(_,i)=>({id:String(i),wo:`W${i} `+'a'.repeat(150),fr:`F${i} `+'b'.repeat(150),role:'bia'}));
 const packet=core.paquetSelection([{d:{...index[0],repliques:lines},actif:true,score:10,accords:0}],[{role:'bia',text:lines[240].fr}],'fr');
 assert(JSON.stringify(packet).length<8500);assert(packet[0].repliques.some(p=>p.id==='0:241'));assert(packet[0].repliques.length<30);
});
test('short yes/no retains the last spoken language; explicit language switches win',()=>{
 const {langueDuDialogue}=service();const h=[{role:'bia',text:'Ndax am na problème ?'}];
 assert.equal(langueDuDialogue('Oui.',h),'wo');assert.equal(langueDuDialogue('Non.',h),'wo');assert.equal(langueDuDialogue('Réponds en français.',h),'fr');
});
test('actual selector request is bounded and final response is read from memory, never generated content',async()=>{
 let body,signal;const bodies=[];const api=service(async(url,opt)=>{assert.equal(url,'https://api.cerebras.ai/v1/chat/completions');body=JSON.parse(opt.body);bodies.push(body);signal=opt.signal;return {ok:true,json:async()=>({choices:[{message:{content:'{"statut":"selection","id":"0:1","reply":"inventé"}'},finish_reason:'stop'}]})};});
 const r=await api.dialoguerAvecDevoirs('Ma copine ne répond plus à mes appels.',[]);
 assert.equal(r.reply,'Vous vous êtes disputés ?');assert.equal(r.dialogue_memorise,true);assert.equal(r.apprend,undefined);assert.equal(body.max_completion_tokens,1536);assert.equal(signal.aborted,false);
 assert.equal(JSON.parse(bodies[0].messages[1].content).devoirs[0].repliques[0].selectionnable,false);
});
test('yes and no can select different learned branches; off-topic returns to ordinary chat',async()=>{
 const api=service();const history=[{role:'user',text:'ma copine mes appels'},{role:'bia',text:'Vous vous êtes disputés ?'}];
 const choisir=async p=>({statut:'selection',id:p.question==='Oui.'?'0:3':'0:5'});
 const yes=await api.dialoguerAvecDevoirs('Oui.',history,{index,choisir});const no=await api.dialoguerAvecDevoirs('Non.',history,{index,choisir});
 assert.equal(yes.reply,'Que lui as-tu dit ?');assert.equal(no.reply,'Laisse-lui un peu de temps.');
 assert.equal(await api.dialoguerAvecDevoirs('Parlons du Japon.',history,{index,choisir:async()=>({statut:'hors_sujet'})}),null);
});
test('invalid or repeated selection releases normal conversation; provider failures remain explicit',async()=>{
 const api=service();const history=[{role:'bia',text:'Vous vous êtes disputés ?'}];
 const r=await api.dialoguerAvecDevoirs('Non.',history,{index,choisir:async()=>({statut:'selection',id:'0:1'})});assert.equal(r,null);
 const err=await api.dialoguerAvecDevoirs('Non.',history,{index,choisir:async()=>{throw Error('timeout');}});assert.equal(err.dialogue_memorise,false);assert.match(err.reply,/Réessaie/);
});
test('real chat route gives the authenticated learned dialogue priority over generic repertoire',async()=>{
 const source=fs.readFileSync('app/api/chat/route.ts','utf8'),ast=ts.createSourceFile('route.ts',source,ts.ScriptTarget.Latest,true);let fn;
 ast.forEachChild(n=>{if(ts.isFunctionDeclaration(n)&&n.name?.text==='repondre')fn=n.getText(ast);});assert(fn);
 let calls=0;const expected={reply:'Question apprise ?',dialogue_memorise:true};
 const env={corrigerDevoirConversation:async()=>null,corrigerDevoir:async()=>{throw Error('Unexpected write')},devoirsALire:async()=>({devoirs:[]}),verifierCode:()=>({ok:true,maitre:true}),noterPassage(){},parleDeMemoire:()=>false,executerLecon:async()=>null,correctionDuMaitre:()=>null,lireLOrdre:()=>null,repetitionExacteDuMaitre:()=>null,estUnSecours:()=>false,intentionMedia:()=>null,demandeDeNombre:()=>null,dialoguerAvecDevoirs:async(q,h)=>{calls++;assert.equal(q,'Non.');assert.equal(h[0].text,'Question précédente ?');return expected;}};
 env.sansRelanceAutomatique=core.sansRelanceAutomatique;
 const run=new Function('env',`with(env){${compile(fn)}return repondre;}`)(env);
 const r=await run({message:'Non.',history:[{role:'bia',text:'Question précédente ?'}]},'valid-test-code',null);assert.deepEqual(r,{corps:{...expected,origine_devoir:null}});assert.equal(calls,1);
});

test('an older learned reply is not repeated after four subsequent exchanges',()=>{
 const old=index[0].repliques[1].fr;const history=core.contexteDialogue([{role:'bia',text:old},...Array.from({length:12},(_,i)=>({role:i%2?'bia':'user',text:'Autre échange '+i})),{role:'bia',text:index[0].repliques[5].fr}]);
 const candidates=core.chercherDialogues(index,'Non.',history),packet=core.paquetSelection(candidates,history,'fr');
 assert.equal(core.resoudreSelection({statut:'selection',id:'0:1'},packet,'fr').statut,'clarifier');
});
test('public production diagnostic rejects before any private lesson reaches the selector',async()=>{
 const source=fs.readFileSync('app/api/etat/route.ts','utf8'),ast=ts.createSourceFile('route.ts',source,ts.ScriptTarget.Latest,true);let fn;
 ast.forEachChild(n=>{if(ts.isFunctionDeclaration(n)&&n.name?.text==='GET')fn=n.getText(ast).replace('export ','');});assert(fn);let calls=0;
 const env={URL,verifierCode:()=>({ok:false}),NextResponse:{json:(body,opt)=>({body,...opt})},essayerDialogueDevoirs:async()=>{calls++;}};
 const get=new Function('env',`with(env){${compile(fn)}return GET;}`)(env);
 const r=await get({url:'https://app.khalam.app/api/etat?essai_dialogue=1',headers:{get:()=>null}});assert.equal(r.status,401);assert.equal(calls,0);
});

test('the declared situation retrieves its lesson despite common synonyms and unrelated detail',()=>{
 const lessons=[
  core.analyserDevoir(saved('DEVOIR 21 — Le petit commerçant\nWolof : BIA : Ndax am na problème ?\nFrançais : BIA : Quel est ton problème ?')),
  core.analyserDevoir({...saved('DEVOIR 22 — Jeune étudiant\nWolof : BIA : Naka ?\nFrançais : BIA : Comment se passent tes études ?'),id:'student'}),
  core.analyserDevoir({...saved('DEVOIR 23 — Mariage refusé\nWolof : BIA : Lan nga bëgg ?\nFrançais : BIA : Que souhaites-tu ?'),id:'marriage'}),
 ];
 for(const [question,expected] of [['Je suis vendeur.','fixture'],['Je suis une élève.','student'],['Ma famille veut me marier.','marriage']]){
  const found=core.chercherDialogues(lessons,question,[]);assert.equal(found[0]?.d.id,expected,question);
 }
});
test('a follow-up request retains the lesson and may choose a learned suggestion',async()=>{
 const api=service(),history=[{role:'user',text:'Ma copine ne répond plus à mes appels.'},{role:'bia',text:'Vous vous êtes disputés ?'},{role:'user',text:'Non.'},{role:'bia',text:'Laisse-lui un peu de temps.'}];
 let packet;const r=await api.dialoguerAvecDevoirs('Et ensuite, que me proposes-tu ?',history,{index,choisir:async p=>{packet=p;return {statut:'selection',id:'0:3'};}});
 assert.equal(packet.devoirs[0].actif,true);assert.equal(r.reply,'Que lui as-tu dit ?');assert.equal(r.dialogue_memorise,true);
});
test('lesson verification rejects anonymous access before any private evaluation',async()=>{
 let evaluations=0;
 const route=load('app/api/apprentissage/verification/route.ts',{'@/lib/audio-memoire':{lancerAudioMemoire:async()=>{evaluations++;}},'@/lib/corrections-sons-courants':{verifierStockageCorrectionsCourantes:async()=>{evaluations++;}},'@/lib/sons-courants':{genererSonsCourants:async()=>{evaluations++;}},'@/lib/essai-continuite-voix':{verifierContinuiteVoix:async()=>{evaluations++;}},'@/lib/correction-devoir':{verifierCorrectionDevoir:async()=>{evaluations++;}},'node:crypto':{timingSafeEqual:()=>false},'next/server':{NextResponse:{json:(body,opt)=>({body,...opt})}},'@/lib/codes':{verifierCode:()=>({ok:false})},'@/lib/lexique':{lexiqueConfig:{actif:true}},'@/lib/lexique-apprentissage-core':{APP_LECONS:'test'},'@/lib/essai-dialogue-devoirs':{verifierDialoguesAppris:async()=>{evaluations++;}}},{process:{env:{CHATTERBOX_TEST_KEY:'test'}},Buffer});
 const r=await route.POST({headers:{get:()=>null}});assert.equal(r.status,401);assert.equal(evaluations,0);
});

test('explicit topic refusal returns to normal chat without sending lessons to the model',async()=>{
 const api=service();let calls=0;
 const r=await api.dialoguerAvecDevoirs('Je ne veux plus parler de ma copine. Arrêtons ce sujet.',[{role:'bia',text:'Vous vous êtes disputés ?'}],{index,choisir:async()=>{calls++;throw Error('must not run');}});
 assert.equal(r,null);assert.equal(calls,0);assert.equal(core.finDuSujet('Ne changeons pas de sujet.'),false);assert.equal(core.finDuSujet('Ma copine me dit : laisse tomber.'),false);
});
test('the speaker complaint is never selectable as BIA reply in either language',()=>{
 const d=core.analyserDevoir(saved('Wolof : Dañu bëgg ma def lu ma bëggul.\nFrançais : Ils veulent que je fasse quelque chose que je ne veux pas.'));
 const packet=core.paquetSelection([{d,actif:true,score:5,accords:1}],[],'wo','Ils veulent que je fasse quelque chose que je ne veux pas.');
 assert.equal(core.resoudreSelection({statut:'selection',id:'0:0'},packet,'wo').statut,'clarifier');
});
test('compact coherence check can choose a valid alternative but cannot introduce another reply',async()=>{
 for(const selected of ['0:5','0:999']){
  let calls=0;const api=service(async(_url,opt)=>{calls++;const packet=JSON.parse(JSON.parse(opt.body).messages[1].content);
   if(calls===2){assert.deepEqual(packet.options.map(p=>p.id),['0:1','0:5']);assert.equal(packet.devoirs,undefined);}
   return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(calls===1?{statut:'selection',id:'0:1',alternatives:['0:5','0:0']}:{statut:'selection',id:selected})},finish_reason:'stop'}]})};
  });
  const r=await api.dialoguerAvecDevoirs('Ma copine ne répond plus à mes appels.',[]);
  assert.equal(calls,2);if(selected==='0:5')assert.equal(r.reply,'Laisse-lui un peu de temps.');else assert.equal(r,null);
 }
});
test('an explicit Wolof preference survives French follow-up answers until explicitly changed',()=>{
 const {langueDuDialogue}=service();const h=[{role:'user',text:'Réponds en wolof.'},{role:'bia',text:'Naka ?'}];
 assert.equal(langueDuDialogue('Je suis en terminale.',h),'wo');assert.equal(langueDuDialogue('Réponds en français.',h),'fr');
});

test('facts stated by the speaker exclude redundant or inapplicable learned questions',()=>{
 const facts=core.faitsExplicites('Ma copine ne répond plus à mes appels.',[]);
 assert(core.questionDejaResolue('Est-ce que tu l’as appelée ?',facts));
 assert(!core.questionDejaResolue('Est-ce que vous aviez un problème avant ça ?',facts));
 assert(!core.questionDejaResolue('Est-ce que tu l’as appelée ?',core.faitsExplicites('Je voudrais l’appeler.',[])));
 assert(core.questionDejaResolue('Quel budget as-tu pour commencer ?',core.faitsExplicites('Je suis un petit commerçant.',[])));
 assert(!core.questionDejaResolue('Quel budget as-tu pour commencer ?',core.faitsExplicites('Je suis commerçant et je veux ouvrir une nouvelle boutique.',[])));
 assert(core.questionDejaResolue('Sur quoi te mettent-ils la pression ?',core.faitsExplicites('Ma famille veut me marier.',[])));
 assert(core.questionDejaResolue('Quel est ton niveau d’études actuellement ?',core.faitsExplicites('Je suis en terminale.',[])));
 assert(core.questionDejaResolue('Quelles matières préfères-tu ?',core.faitsExplicites('J’aime l’informatique et l’anglais.',[])));
});

test('implicit first-person lesson questions belong to the person, with explicit assistant offers preserved',()=>{
 for(const fr of ['Qu’est-ce que je peux écrire ?','Quels domaines puis-je regarder ?','Et si mes parents refusent ?','Je suis en terminale.','Ils veulent que je fasse quelque chose que je ne veux pas.']){
  assert(core.paroleDeLaPersonne(fr),fr);
  const d=core.analyserDevoir(saved('Wolof : Texte test.\nFrançais : '+fr));const packet=core.paquetSelection([{d,actif:true,score:5,accords:1}],[],'wo');
  assert.equal(core.resoudreSelection({statut:'selection',id:'0:0'},packet,'wo').statut,'clarifier');
 }
 for(const fr of ['Comment puis-je t’aider ?','Je comprends.','Tu peux écrire : « Comment vas-tu ? Je veux savoir si tout va bien.','Est-ce que tu leur as parlé ?'])assert.equal(core.paroleDeLaPersonne(fr),false,fr);
 const d=core.analyserDevoir(saved('Wolof : BIA : Ndax ?\nFrançais : BIA : Puis-je te poser une question ?'));
 assert.equal(core.paquetSelection([{d,actif:true,score:5,accords:1}],[],'fr')[0].repliques[0].selectionnable,true);
 assert(core.questionDejaResolue('Quel genre de business veux-tu faire ?',core.faitsExplicites('Je suis un petit commerçant.',[])));
});

test('Wolof first-person questions stay in the learner role even when French uses an infinitive',()=>{
 const d=core.analyserDevoir(saved('Wolof : Naka laay mettreé ay limites ?\nFrançais : Comment poser des limites ?'));
 assert.equal(core.paroleDeLaPersonne(d.repliques[0].fr,d.repliques[0].wo),true);
 assert.equal(core.paquetSelection([{d,actif:true,score:5,accords:1}],[],'wo')[0].repliques[0].selectionnable,false);
 assert.equal(core.paroleDeLaPersonne('Comment puis-je t’aider ?','Naka laa la mën a dimbali ?'),false);
});

const obsolete='Peux-tu préciser ce qui te préoccupe le plus dans cette situation ?';
test('greetings release even an active lesson before any Supabase or model request',async()=>{
 let reads=0,calls=0;
 const api=service(async()=>{calls++;throw Error('No model for greetings');},async()=>{reads++;throw Error('No database for greetings');});
 for(const history of [[],[{role:'bia',text:'Vous vous êtes disputés ?'}],[{role:'user',text:'Réponds en wolof.'},{role:'bia',text:obsolete},{role:'user',text:'Nanga def ?'},{role:'bia',text:obsolete}]]){
  for(const question of ['Salaamaleekum','Nanga def ?','Bia, naka nga def ?','Naka waa kër ga ?','Bonjour','Bonsoir']){
   assert.equal(await api.dialoguerAvecDevoirs(question,history),null,question);
  }
 }
 assert.equal(reads,0);assert.equal(calls,0);
 for(const question of ['Oui.','Non.','Waaw.','Déedéet.','Bonjour, ma copine ne répond plus à mes appels.','Salut, je suis commerçant.'])assert.equal(salutations.salutationAutonome(question),false,question);
});
test('obsolete clarifications never become model examples or change the requested language',async()=>{
 const h=[{role:'user',text:'Réponds en wolof.'},{role:'bia',text:obsolete},{role:'user',text:'Nanga def ?'},{role:'bia',text:obsolete}];
 assert.equal(core.contexteDialogue(h).filter(t=>t.role==='bia').length,0);
 assert.deepEqual(core.sansRelanceAutomatique([{role:'user',text:obsolete}]),[{role:'user',text:obsolete}]);
 const api=service();let calls=0;
 for(let i=0;i<2;i++)assert.equal(await api.dialoguerAvecDevoirs('Ma copine ne répond plus à mes appels.',h,{index,choisir:async p=>{calls++;assert.equal(p.langue,'wo');assert(!p.historique.some(t=>t.text===obsolete));return {statut:'clarifier'};}}),null);
 assert.equal(calls,2);
 const r=await api.dialoguerAvecDevoirs('Ma copine ne répond plus à mes appels.',h,{index,choisir:async()=>({statut:'selection',id:'0:1'})});
 assert.equal(r.reply,index[0].repliques[1].wo);assert.equal(r.dialogue_memorise,true);
});
test('authenticated chat with the stuck history reaches the actual greeting repertoire',async()=>{
 const repertoire=load('lib/repertoire.ts',{'./lexique':{lexiqueConfig:{actif:false}},'./normaliser':normalisation,'./empreinte':load('lib/empreinte.ts'),'./nombres':{pourLaVoix:s=>s},'./repertoire-textes':textes,'./base-textes':load('lib/base-textes.ts'),'./services-textes':services,'./formes-neuves':load('lib/formes-neuves.ts',{'./formes-de-plus':load('lib/formes-de-plus.ts')}),'./a-refaire':load('lib/a-refaire.ts')});
 const source=fs.readFileSync('app/api/chat/route.ts','utf8'),ast=ts.createSourceFile('route.ts',source,ts.ScriptTarget.Latest,true);let fn;
 ast.forEachChild(n=>{if(ts.isFunctionDeclaration(n)&&n.name?.text==='repondre')fn=n.getText(ast);});
 const api=service(async()=>{throw Error('No selector call');},async()=>{throw Error('No lesson read');});
 const env={...repertoire,...services,correctionCourantePour:async()=>undefined,sansRelanceAutomatique:core.sansRelanceAutomatique,dialoguerAvecDevoirs:api.dialoguerAvecDevoirs,
  corrigerDevoirConversation:async()=>null,corrigerDevoir:async()=>{throw Error('Unexpected write')},verifierCode:()=>({ok:true,maitre:true}),noterPassage(){},parleDeMemoire:()=>false,executerLecon:async()=>null,correctionDuMaitre:()=>null,lireLOrdre:()=>null,repetitionExacteDuMaitre:()=>null,estUnSecours:()=>false,intentionMedia:()=>null,demandeDeNombre:()=>null,
  repertoireActif:()=>true,RELU_BLAGUES:false,noterRate(){},SONS_QUI_DISENT_AUTRE_CHOSE:new Set(),gesteDe:()=>null};
 const run=new Function('env',`with(env){${compile(fn)}return repondre;}`)(env);
 for(const message of ['Salaamaleekum','Nanga def ?','Naka waa kër ga ?']){
  const r=await run({message,history:[{role:'bia',text:'Vous vous êtes disputés ?'},{role:'user',text:'Nanga def ?'},{role:'bia',text:obsolete},{role:'bia',text:obsolete}]},'valid-test-code',null);
  assert.equal(r.corps.source,'répertoire (gratuit)',message);assert.equal(r.corps.salutation,true);
  assert.equal(r.corps.reply,repertoire.trouverDansRepertoire(message).wolof);
  env.correctionCourantePour=async()=>({texte:'Réponse corrigée.',audio:{adresse:'https://test/corrige.mp3'}});
  const corrige=await run({message,history:[]},'valid-test-code',null);
  assert.equal(corrige.corps.reply,'Réponse corrigée.');assert.equal(corrige.corps.son,'https://test/corrige.mp3');
  env.correctionCourantePour=async()=>undefined;
 }
});
