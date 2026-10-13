import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import crypto from 'node:crypto';
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function load(path,deps={},env={}){const module={exports:{}};new Function('require','module','exports',...Object.keys(env),compile(fs.readFileSync(path,'utf8')))(n=>{assert(n in deps,`Unexpected import ${n}`);return deps[n];},module,module.exports,...Object.values(env));return module.exports;}
const core=load('lib/dialogue-devoirs-core.ts'),langue=load('lib/langue.ts');
const produits=load('lib/contexte-produits.ts');
const horloge=load('lib/horloge.ts'),recherche=load('lib/recherche.ts',{'./nombre-env':load('lib/nombre-env.ts')});
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
const enfants={...saved(`DEVOIR 33 — L’ENFANT AU QUOTIDIEN
BIA-ENF-001
Wolof : Xale bi fan la nekk ?
Français : Où est l’enfant ?
BIA-ENF-002 Wolof : Xale bi dafay nelaw.
Français : L’enfant dort.
BIA-ENF-003
Wolof : Bul yee xale bi.
Français : Ne réveille pas l’enfant.
BIA-ENF-004 : Wolof : Xale bi dafay jooy.
Français : L’enfant pleure.
BIA-ENF-005
Wolof : Lan moo tax xale bi di jooy ?
Français : Pourquoi l’enfant pleure-t-il ?
BIA-ENF-006
Wolof : Xoolal xale bi bu baax.
Français : Surveille bien l’enfant.`),id:'enfants'};
test('lesson source identifiers are metadata; all complete bilingual pairs stay exact',()=>{
 const d=core.analyserDevoir(enfants);
 assert.equal(d.repliques.length,6);
 assert.equal(d.repliques[0].fr,'Où est l’enfant ?');
 assert.equal(d.repliques[1].wo,'Xale bi dafay nelaw.');
 assert.equal(d.repliques[4].fr,'Pourquoi l’enfant pleure-t-il ?');
 assert.equal(d.repliques[5].fr,'Surveille bien l’enfant.');
 assert(d.repliques.every(p=>!p.fr.includes('BIA-ENF')&&!p.wo.includes('BIA-ENF')));
});
test('singular, plural, Wolof accents and dictated kh select the same lesson',()=>{
 const idx=core.indexerDevoirs([fixture,enfants]);
 for(const q of ['Parlons des enfants.','Parlons de mon enfant.','Xale bi.','Xalé bi.','Khalé bi.']){
  const choix=core.choixConversation(idx,q,[],'wo');
  assert.equal(choix.candidats[0]?.d.id,'enfants',q);
  assert(choix.paquet[0].repliques.some(p=>p.wo==='Xoolal xale bi bu baax.'),q);
 }
});
test('corrected newest lesson is selected immediately; withdrawn revision is never resurrected',()=>{
 const nouvelle={...enfants,id:'corrige',date:'2026-10-13',texte:enfants.texte.replace('Xale bi dafay nelaw.','Xale bi dafay jooy.')};
 const idx=core.indexerDevoirs([enfants,nouvelle]);
 assert.equal(core.chercherDialogues(idx,'Parlons des enfants.',[])[0]?.d.id,'corrige');
 assert.equal(core.chercherDialogues(core.indexerDevoirs([enfants,{...nouvelle,valide:false}]),'Parlons des enfants.',[]).length,0);
});
test('single-call choices resolve only permitted exact source IDs, including refusals',()=>{
 const choix=core.choixConversation(index,'Ma copine ne répond plus à mes appels.',[],'wo');
 assert.equal(core.repliqueChoisie('[[replique:0:0]]',choix),null);
 assert.equal(core.repliqueChoisie('[[replique:0:999]]',choix),null);
 assert.equal(core.repliqueChoisie('[[replique:0:3]] texte inventé',choix),null);
 const r=core.repliqueChoisie('[[replique:0:3]]',choix);
 assert.equal(r.reply,'Lan nga ko wax ?');assert.equal(r.lecon_id,'fixture');
 const parle=core.choixConversation(index,'Non.',[{role:'bia',text:'Lan nga ko wax ?'}],'wo');
 assert.equal(core.repliqueChoisie('[[replique:0:3]]',parle),null);
});
test('cache-only routing never invokes a selector model on a miss',async()=>{
 const srv=service();
 assert.equal(await srv.dialoguerAvecDevoirs('Ma copine ne répond plus à mes appels.',[],{index,cacheSeulement:true}),null);
 assert.equal(srv.resumeDialogueDevoirs().appels_modele,0);
 const t=await srv.choixDuTour('Ma copine ne répond plus à mes appels.',[]);
 assert(t.consigne.includes('[[replique:identifiant]]'));
 const r=srv.resoudreChoixDuTour('[[replique:0:3]]',t);
 assert.equal(r.reply,'Que lui as-tu dit ?');
 assert.equal(srv.resumeDialogueDevoirs().dernier_statut,'selection_appel_unique');
});
test('explicit debate avoids the selector while ordinary learned dialogue keeps its route',async()=>{
 const srv=service();
 assert.equal(await srv.dialoguerAvecDevoirs('Je ne suis pas d’accord avec ton avis sur les appels.',[],{index}),null);
 assert.equal(srv.resumeDialogueDevoirs().appels_modele,0);
 assert.equal(srv.resumeDialogueDevoirs().dernier_statut,'argumentation_directe');
 assert.equal(core.demandeArgumentation('Répète mot pour mot tes arguments.'),false);
 assert.equal(core.demandeArgumentation('Ma copine ne répond plus à mes appels.'),false);
});
function service(fetch=async()=>{throw Error('Unexpected network');},devoirs=async()=>({devoirs:[fixture]}),config={}){
 const rapide=load('lib/dialogue-rapide.ts',{'./salutations-dialogue':salutations,'node:crypto':crypto,'./audio-memoire-stockage':{lireObjetMemoire:async()=>null,ecrireObjetMemoire:async()=>{}}},{globalThis:{},setTimeout:()=>({unref(){}})});
 return load('lib/dialogue-devoirs.ts',{'./lexique-partage':{indexLexiquePartage:async()=>[],resumeLexiquePartage:()=>({})},'./dialogue-rapide':rapide,...{'./cerveau-anthropic':load('lib/cerveau-anthropic.ts',{}, {fetch,globalThis:{},process:{env:{}}}),'./cerveau-cerebras':{appelerCerebras:(url,init)=>fetch(url,init)},'./salutations-dialogue':salutations,'./dialogue-devoirs-core':core,'./langue':langue,'./devoirs-apprentissage':{devoirsALire:devoirs}}}, {fetch,globalThis:{},process:{env:{BIA_LLM_PROVIDER:'cerebras',CEREBRAS_API_KEY:'test-only',...config}}});
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
test('invalid or repeated selection releases normal conversation; provider failures release chat and remain visible in counters',async()=>{
 const api=service();const history=[{role:'bia',text:'Vous vous êtes disputés ?'}];
 const r=await api.dialoguerAvecDevoirs('Non.',history,{index,choisir:async()=>({statut:'selection',id:'0:1'})});assert.equal(r,null);
 const err=await api.dialoguerAvecDevoirs('Non.',history,{index,choisir:async()=>{throw Error('timeout');}});assert.equal(err,null);assert.equal(api.resumeDialogueDevoirs().erreurs,1);assert.equal(api.resumeDialogueDevoirs().relais_erreur,1);assert.equal(api.resumeDialogueDevoirs().dernier_motif,'consultation_ou_selection_impossible');
});
test('real chat route gives the authenticated learned dialogue priority over generic repertoire',async()=>{
 const source=fs.readFileSync('app/api/chat/route.ts','utf8'),ast=ts.createSourceFile('route.ts',source,ts.ScriptTarget.Latest,true);let fn;
 ast.forEachChild(n=>{if(ts.isFunctionDeclaration(n)&&n.name?.text==='repondre')fn=n.getText(ast);});assert(fn);
 let calls=0;const expected={reply:'Question apprise ?',dialogue_memorise:true};
 const env={...produits,...horloge,...recherche,reponseIdentite:()=>null,reponseSalutation:async()=>null,audioPourReponse:async()=>null,corrigerDevoirConversation:async()=>null,corrigerDevoir:async()=>{throw Error('Unexpected write')},devoirsALire:async()=>({devoirs:[]}),verifierCode:()=>({ok:true,maitre:true}),noterPassage(){},parleDeMemoire:()=>false,executerLecon:async()=>null,correctionDuMaitre:()=>null,lireLOrdre:()=>null,repetitionExacteDuMaitre:()=>null,estUnSecours:()=>false,intentionMedia:()=>null,demandeDeNombre:()=>null,dialoguerAvecDevoirs:async(q,h)=>{calls++;assert.equal(q,'Non.');assert.equal(h[0].text,'Question précédente ?');return expected;}};
 env.sansRelanceAutomatique=core.sansRelanceAutomatique;
 const run=new Function('env',`with(env){${compile(fn)}return repondre;}`)(env);
 const r=await run({message:'Non.',history:[{role:'bia',text:'Question précédente ?'}]},'valid-test-code',null);assert.deepEqual(r,{corps:{...expected,origine_devoir:null,audio_memorise:null}});assert.equal(calls,1);
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
 const route=load('app/api/apprentissage/verification/route.ts',{'@/lib/essai-administration':{verifierAdministration:async()=>{evaluations++;}},'@/lib/essai-business':{verifierBusiness:async()=>{evaluations++;}},'@/lib/essai-soxla':{verifierSoxla:async()=>{evaluations++;}},'@/lib/essai-lan-lool':{verifierLanLool:async()=>{evaluations++;}},'@/lib/essai-fin-bi':{verifierFinBi:async()=>{evaluations++;}},'@/lib/essai-mar013':{verifierMar013:async()=>{evaluations++;}},'@/lib/identite-bia':{verifierIdentite:async()=>{evaluations++;}},'@/lib/essai-prises-voix':{verifierPrisesVoix:async()=>{evaluations++;}},'@/lib/essai-latence-salutation':{verifierLatenceSalutation:async()=>{evaluations++;}},'@/lib/reponse-salutation':{verifierSalutations:async()=>{evaluations++;}},'@/lib/lexique-partage':{integrerLexiquePartage:async()=>{evaluations++;}},'@/lib/essai-lecture-bilingue':{lancerEssaiLectureBilingue:async()=>{evaluations++;}},'@/lib/essai-integrite-audio':{verifierIntegriteAudio:async()=>{evaluations++;}},'@/lib/prechauffage-dialogue':{lancerPrechauffageDialogue:()=>{}},'@/lib/essai-sonnet':{verifierSonnet:async()=>{evaluations++;}},'@/lib/essai-secours-modele':{verifierSecoursModele:async()=>{evaluations++;}},'@/lib/audio-memoire':{lancerAudioMemoire:async()=>{evaluations++;}},'@/lib/corrections-sons-courants':{verifierStockageCorrectionsCourantes:async()=>{evaluations++;}},'@/lib/sons-courants':{genererSonsCourants:async()=>{evaluations++;}},'@/lib/essai-continuite-voix':{verifierContinuiteVoix:async()=>{evaluations++;}},'@/lib/correction-devoir':{verifierCorrectionDevoir:async()=>{evaluations++;}},'node:crypto':{timingSafeEqual:()=>false},'next/server':{NextResponse:{json:(body,opt)=>({body,...opt})}},'@/lib/codes':{verifierCode:()=>({ok:false})},'@/lib/lexique':{lexiqueConfig:{actif:true}},'@/lib/lexique-apprentissage-core':{APP_LECONS:'test'},'@/lib/essai-dialogue-devoirs':{verifierDialoguesAppris:async()=>{evaluations++;}}},{process:{env:{CHATTERBOX_TEST_KEY:'test'}},Buffer});
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
 const env={...produits,...horloge,...recherche,reponseIdentite:()=>null,...repertoire,...services,correctionCourantePour:async()=>undefined,sansRelanceAutomatique:core.sansRelanceAutomatique,dialoguerAvecDevoirs:api.dialoguerAvecDevoirs,
  corrigerDevoirConversation:async()=>null,corrigerDevoir:async()=>{throw Error('Unexpected write')},verifierCode:()=>({ok:true,maitre:true}),noterPassage(){},parleDeMemoire:()=>false,executerLecon:async()=>null,correctionDuMaitre:()=>null,lireLOrdre:()=>null,repetitionExacteDuMaitre:()=>null,estUnSecours:()=>false,intentionMedia:()=>null,demandeDeNombre:()=>null,
  repertoireActif:()=>true,RELU_BLAGUES:false,noterRate(){},SONS_QUI_DISENT_AUTRE_CHOSE:new Set(),gesteDe:()=>null};
 env.reponseSalutation=q=>load('lib/reponse-salutation.ts',{'./salutations-dialogue':salutations,'./repertoire':repertoire,'./sons-courants':{lireCatalogueCourant:async()=>{const e=salutations.salutationReconnue(q),langue=repertoire.langueDe(q),p=await env.correctionCourantePour();return p?[{...p,cle:e.cle,langue,audio:{...p.audio,texte:p.texte}}]:[];}}}).reponseSalutation(q);
 const run=new Function('env',`with(env){${compile(fn)}return repondre;}`)(env);
 for(const message of ['Salaamaleekum','Nanga def ?','Naka waa kër ga ?']){
  const r=await run({message,history:[{role:'bia',text:'Vous vous êtes disputés ?'},{role:'user',text:'Nanga def ?'},{role:'bia',text:obsolete},{role:'bia',text:obsolete}]},'valid-test-code',null);
  assert.equal(r.corps.source,'salutation mémorisée',message);assert.equal(r.corps.salutation,true);
  assert.equal(r.corps.reply,repertoire.trouverDansRepertoire(message).wolof);
  env.correctionCourantePour=async()=>({texte:'Réponse corrigée.',audio:{adresse:'https://test/corrige.mp3'}});
  const corrige=await run({message,history:[]},'valid-test-code',null);
  assert.equal(corrige.corps.reply,'Réponse corrigée.');assert.equal(corrige.corps.son_courant.adresse,'https://test/corrige.mp3');
  env.correctionCourantePour=async()=>undefined;
 }
});


test('Anthropic combines coherence and selection in one call and returns only the exact source reply',async()=>{
 const bodies=[];
 const api=service(async(url,init)=>{
  assert.equal(url,'https://api.anthropic.com/v1/messages');assert.equal(init.headers['x-api-key'],'test-anthropic');
  const b=JSON.parse(init.body);bodies.push(b);assert.equal(b.model,'claude-sonnet-5-5');assert.deepEqual(b.thinking,{type:'between_tools'});assert.equal(b.temperature,undefined);
  return Response.json({content:[{type:'text',text:'{"statut":"selection","id":"0:1","reply":"inventé"}'}],stop_reason:'end_turn',usage:{input_tokens:100,output_tokens:20}});
 },undefined,{BIA_LLM_PROVIDER:'anthropic',ANTHROPIC_API_KEY:'test-anthropic'});
 const r=await api.dialoguerAvecDevoirs('Ma copine ne répond plus à mes appels.',[]);
 assert.equal(bodies.length,1);assert.match(bodies[0].system[0].text,/CONTRÔLE AVANT DE RÉPONDRE/);assert.match(bodies[0].system[0].text,/une question dont la réponse est DÉJÀ donnée/);assert.equal(JSON.parse(bodies[0].messages[0].content).devoirs[0].repliques[0].wo,undefined);assert.equal(r.reply,'Vous vous êtes disputés ?');assert.equal(r.dialogue_memorise,true);assert.equal(api.resumeDialogueDevoirs().jetons_entree,100);
});


test('a timed-out Anthropic selection releases conversation instead of speaking an outage',async()=>{
 const api=service(async()=>{throw new DOMException('test timeout','TimeoutError');},undefined,{BIA_LLM_PROVIDER:'anthropic',ANTHROPIC_API_KEY:'test-only'});
 assert.equal(await api.dialoguerAvecDevoirs('Ma copine ne répond plus à mes appels.',[]),null);
 assert.equal(api.resumeDialogueDevoirs().dernier_motif,'delai_depasse');
 assert.equal(api.resumeDialogueDevoirs().relais_erreur,1);
});
test('old outage answers cannot contaminate the next selection, but user reports remain',()=>{
 const text='Le moteur qui m’aide à choisir une réponse est indisponible pour le moment. Réessaie.';
 const h=[{role:'user',text:'Réponds en wolof.'},{role:'bia',text},{role:'user',text}];
 assert.deepEqual(core.sansRelanceAutomatique(h),[h[0],h[2]]);
});
test('Anthropic still rejects invalid, person, repeated and multi-question source IDs',async()=>{
 for(const id of ['0:0','0:1','0:6','99:99']){
  const api=service(async()=>Response.json({content:[{type:'text',text:JSON.stringify({statut:'selection',id})}]}),undefined,{BIA_LLM_PROVIDER:'anthropic',ANTHROPIC_API_KEY:'test-only'});
  assert.equal(await api.dialoguerAvecDevoirs('Non.',[{role:'bia',text:'Vous vous êtes disputés ?'}]),null);
 }
});


test('a valid Sonnet reply arriving after the old 2.5 s deadline is not cut off while performing the combined coherence check',async()=>{
 let calls=0;
 const api=service(async(url,init)=>{
  calls++;
  await new Promise((resolve,reject)=>{const timer=setTimeout(resolve,calls===1?2700:100);init.signal.addEventListener('abort',()=>{clearTimeout(timer);reject(init.signal.reason);},{once:true});});
  return Response.json({content:[{type:'text',text:'{"statut":"selection","id":"0:1"}'}]});
 },undefined,{BIA_LLM_PROVIDER:'anthropic',ANTHROPIC_API_KEY:'test-only'});
 const r=await api.dialoguerAvecDevoirs('Ma copine ne répond plus à mes appels.',[]);
 assert.equal(r?.reply,'Vous vous êtes disputés ?');assert.equal(calls,1);assert.equal(api.resumeDialogueDevoirs().erreurs,0);
});


test('a verified choice is reused without another model call, but a changed fact or lesson is not',async()=>{
 let calls=0;
 const api=service(async()=>{calls++;return Response.json({content:[{type:'text',text:'{"statut":"selection","id":"0:1"}'}]});},undefined,{BIA_LLM_PROVIDER:'anthropic',ANTHROPIC_API_KEY:'test'});
 const q='Ma copine ne répond plus à mes appels.';
 const a=await api.dialoguerAvecDevoirs(q,[],{index});assert.equal(calls,1);
 const b=await api.dialoguerAvecDevoirs('Bia, '+q+' Réponds en wolof.',[],{index});
 assert.equal(calls,1);assert.equal(b.acces_direct,true);assert.equal(b.reply,index[0].repliques[1].wo);
 const enriched=[...index,{id:'astronomie',titre:'Astronomie',date:'2026-10-13',repliques:[{id:'0',fr:'Les étoiles brillent.',wo:'Astronomie.',role:'bia'}]}];
 const same=await api.dialoguerAvecDevoirs(q,[],{index:enriched});assert.equal(same.acces_direct,true);assert.equal(calls,1);
 await api.dialoguerAvecDevoirs(q,[{role:'user',text:'Nous ne nous sommes pas disputés.'}],{index});assert.equal(calls,2);
 const changed=structuredClone(index);changed[0].repliques[1].wo='Source corrigée.';
 const c=await api.dialoguerAvecDevoirs(q,[],{index:changed});assert.equal(calls,3);assert.notEqual(c.acces_direct,true);
});

test('known greeting pairs do not delay a prepared topic; unknown facts are kept',()=>{
 const e=textes.REPERTOIRE.find(e=>e.cle==='salut');
 const h=[{role:'user',text:e.formes[0]},{role:'bia',text:e.wolof}];
 assert.deepEqual(salutations.sansSalutationsInitiales(h),[]);
 assert.deepEqual(salutations.sansSalutationsInitiales([...h,{role:'user',text:'Je suis malade.'}]),[{role:'user',text:'Je suis malade.'}]);
 const personal=[{role:'user',text:e.formes[0]},{role:'bia',text:'Tu m’as dit avoir perdu ton travail.'}];assert.deepEqual(salutations.sansSalutationsInitiales(personal),personal);
});

test('mastered topics exclude drafts and never revive a superseded validated version',async()=>{
 const draft={...fixture,id:'draft',valide:false,date:'2026-10-12'};
 assert.deepEqual(core.indexerDevoirs([fixture,draft]),[]);
 const api=service(undefined,async()=>({devoirs:[draft]}));
 assert.deepEqual(await api.indexDialogue(),[]);
 const carte=JSON.parse((await api.contexteMaitrises('Choisis un sujet.',[])).split('DOMAINES VALIDÉS DISPONIBLES\n')[1]);
 assert.deepEqual(carte.domaines,[]);
});
test('open conversation exposes available learned angles, never the other speaker or exhausted replies',()=>{
 const carte=core.maitrisesPourConversation(index,'Choisis un sujet.',[]);
 assert.equal(carte.initiative,'proposer_un_sujet');assert.equal(carte.domaines.length,1);
 assert(carte.domaines[0].formulations.every(p=>p.fr!==index[0].repliques[0].fr));
 const history=index[0].repliques.map(p=>({role:'bia',text:p.fr}));
 assert.equal(core.maitrisesPourConversation(index,'Je veux discuter.',history).domaines.length,0);
 assert.equal(core.maitrisesPourConversation(index,'Quelle est la capitale du Japon ?',[]).domaines.length,0);
 for(const q of ['Je veux parler de mon commerce.','Ne choisis pas un sujet.','Je ne veux pas discuter.'])assert.equal(core.invitationAConverser(q),false);
});
test('accepting a conversational proposal retrieves its lesson, while a new topic is not treated as agreement',async()=>{
 const history=[{role:'user',text:'Choisis un sujet.'},{role:'bia',text:'On peut parler de la communication dans le couple et des messages, ça te dit ?'}];
 assert.equal(core.chercherDialogues(index,'Oui.',history)[0].d.id,'fixture');
 assert.equal(core.chercherDialogues(index,'Quelle est la capitale du Japon ?',history).length,0);
 const r=await service().dialoguerAvecDevoirs('Oui.',history,{index,choisir:async p=>{assert.equal(p.historique.at(-1).text,history[1].text);return {statut:'selection',id:'0:5'};}});
 assert.equal(r.reply,'Laisse-lui un peu de temps.');
});
test('refusing the current topic excludes it from new proposals and exposes another validated topic',()=>{
 const autre=core.analyserDevoir({...saved('DEVOIR 22 — Études\nWolof : BIA : Naka ?\nFrançais : BIA : Comment organises-tu tes études ?'),id:'etudes'});
 const carte=core.maitrisesPourConversation([...index,autre],'Changeons de sujet.',[{role:'user',text:'Ma copine ne répond plus à mes messages.'},{role:'bia',text:'Vous vous êtes disputés ?'}]);
 assert.equal(carte.initiative,'nouveau_sujet');assert.deepEqual(carte.domaines.map(d=>d.titre),[autre.titre]);
});

test('explicit invitation to lead bypasses irrelevant learned clarifications without a model or database call',async()=>{
 const api=service(async()=>{throw Error('No selection call');},async()=>{throw Error('No read before conversational proposal');});
 for(const q of ['Choisis un sujet.','Je veux discuter.','De quoi veux-tu parler ?','Nanu waxtaan.']){
  assert.equal(await api.dialoguerAvecDevoirs(q,[]),null,q);
  assert.equal(api.resumeDialogueDevoirs().dernier_statut,'initiative_conversation');
 }
});


test('the services diagnostic alias rejects unauthenticated requests before reading or evaluating a test',async()=>{
 let read=0;
 const route=load('app/api/services-verification/route.ts',{
  'node:crypto':{timingSafeEqual:()=>false},'next/server':{NextResponse:{json:(body,opt)=>({body,...opt})}},
  '@/lib/codes':{verifierCode:()=>({ok:false})},'@/lib/lexique':{lexiqueConfig:{}},'@/lib/lexique-apprentissage-core':{APP_LECONS:'test'},
 },{process:{env:{CHATTERBOX_TEST_KEY:'test'}},Buffer});
 const r=await route.POST({headers:{get:()=>null},json:async()=>{read++;return {administration:true};}});
 assert.equal(r.status,401);assert.equal(read,0);
});
test('real chat route uses context memorisation before model and preserves master authorization',async()=>{
 const source=fs.readFileSync('app/api/chat/route.ts','utf8'),ast=ts.createSourceFile('route.ts',source,ts.ScriptTarget.Latest,true);let fn;
 ast.forEachChild(n=>{if(ts.isFunctionDeclaration(n)&&n.name?.text==='repondre')fn=n.getText(ast);});assert(fn);
 const lesson=load('lib/mode-apprentissage.ts');let master=true;const writes=[];
 const env={...produits,...horloge,...recherche,...lesson,reponseIdentite:()=>null,reponseSalutation:async()=>null,audioPourReponse:async()=>null,corrigerDevoirConversation:async()=>null,corrigerDevoir:async()=>{throw Error('Unexpected source edit')},verifierCode:()=>({ok:true,maitre:master}),noterPassage(){},parleDeMemoire:()=>true,noterTentative(){},lexiqueConfig:{actif:true},langueDe:()=> 'wo',enregistrerPhraseMaitre:async p=>{writes.push(p)},dialoguerAvecDevoirs:async()=>({reply:'No master write'}),noterPanne(){},estUnSecours:()=>false,intentionMedia:()=>null,demandeDeNombre:()=>null};
 const run=new Function('env',`with(env){${compile(fn)}return repondre;}`)(env);
 env.sansRelanceAutomatique=core.sansRelanceAutomatique;
 const body={message:'Mémorise ça',history:[{role:'user',text:'Ñu ngi fi.'},{role:'bia',text:'Je ne peux pas mémoriser.'}]};
 const r=await run(body,'valid-test-code',null);assert.deepEqual(writes,['Ñu ngi fi.']);assert.equal(r.corps.retenu,'Ñu ngi fi.');assert.equal(r.corps.apprend,false);
 master=false;await run(body,'non-master-test-code',null);assert.equal(writes.length,1);
});

test('a late learned passage about profit survives the combined selection budget',()=>{const d={id:'business',titre:'Business du petit commerçant',date:'2026-10-13',repliques:Array.from({length:80},(_,i)=>({id:String(i),fr:i===75?'Note tes bénéfices chaque soir.':'Conseil commercial numéro '+i+' : '+('Range tes produits. '.repeat(5)),wo:i===75?'Bénéfices yi bind leen.':'Formulation '+i,role:'bia'}))};const choix=core.choixConversation([d],'Je veux connaître les bénéfices de mon business.',[],'wo',1200);assert(choix.paquet.flatMap(x=>x.repliques).some(p=>p.id==='0:75'));assert(core.repliqueChoisie('[[replique:0:75]]',choix)?.reply==='Bénéfices yi bind leen.');});

test('a new explicit subject outranks follow-ups from the previous learned dialogue',()=>{const old=core.analyserDevoir(fixture),sport={id:'sport',titre:'Sport et football',date:'2026-10-13',repliques:[{id:'0',wo:'Ndax dangay jouer football ?',fr:'Joues-tu au football ?',role:'bia'}]};const history=[{role:'user',text:'Ma copine ne répond pas.'},{role:'bia',text:old.repliques[1].fr}];const choix=core.choixConversation([old,sport],'Parlons du football.',history,'wo',250);assert.equal(choix.candidats[0].d.id,'sport');assert(choix.paquet.some(d=>d.titre===sport.titre));});

test('lesson profit numbers never become user facts through BIA history or an unrelated budget',()=>{const bad='Ton bénéfice est de 2 000 francs.';for(const history of [[],[{role:'bia',text:bad}],[{role:'user',text:'Mon budget est de 2000 francs.'}]])assert.equal(core.montantDeLeconNonConfirme(bad,'Bénéfice bi 2000 francs la.','Ce business peut-il marcher à Dakar ?',history),true);assert.equal(core.montantDeLeconNonConfirme(bad,'Bénéfice bi 2000 francs la.','Mon bénéfice est de 2000 francs.',[]),false)});
test('unknown Dakar business selects only questions identifying the actual project',()=>{const d={id:'commerce',titre:'Business et commerce',date:'2026-10-13',repliques:[{id:'0',fr:'Ton bénéfice est de 2 000 francs.',wo:'Bénéfice bi 2000 francs la.',role:'bia'},{id:'1',fr:'Quel genre de business veux-tu faire ?',wo:'Business ban nga bëgg def ?',role:'bia'},{id:'2',fr:'Note tes dépenses chaque soir.',wo:'Bindal sa dépenses.',role:'bia'}]};const q='Est-ce que ce business peut marcher à Dakar ?';const choix=core.choixConversation([d],q,[{role:'bia',text:d.repliques[0].fr}],'wo');assert(choix.paquet.flatMap(x=>x.repliques).every(p=>p.id==='0:1'));assert.equal(core.repliqueChoisie('[[replique:0:0]]',choix),null);assert.equal(core.projetCommercialAPreciser(q,[{role:'user',text:'Je vends, mais je ne sais pas combien je gagne.'}]),true);assert.equal(core.projetCommercialAPreciser(q,[{role:'user',text:'Je veux vendre des chaussures.'}]),false);assert.equal(core.projetCommercialAPreciser(q,[{role:'user',text:'Je veux ouvrir un restaurant.'}]),false)});

test('project clarification survives an active profit example and an oversized lesson',()=>{const d={id:'business',titre:'Business commerce',date:'2026-10-13',repliques:[{id:'0',fr:'Quel business veux-tu faire ?',wo:'Ban business nga bëgg def ?',role:'bia'},...Array.from({length:90},(_,i)=>({id:String(i+1),fr:i===70?'Ton bénéfice est de 2 000 francs.':'Exemple de commerce : '+('Calcule les prix et les bénéfices. '.repeat(7)),wo:'Exemple de business.',role:'bia'}))]};const h=[{role:'bia',text:'Ton bénéfice est de 2 000 francs.'}];const c=core.choixConversation([d],'Est-ce que ce business peut marcher à Dakar ?',h,'wo');assert(c.paquet.flatMap(x=>x.repliques).some(p=>p.id==='0:0'));assert.equal(core.repliqueChoisie('[[replique:0:71]]',c),null)});

test('an explicitly described product prevents asking its business type again, while questions about price remain usable',()=>{const faits=core.faitsExplicites('Je veux vendre des chaussures à Dakar.',[]);assert.equal(core.questionDejaResolue('Quel genre de business veux-tu faire ?',faits),true);assert.equal(core.questionDejaResolue('Quel prix envisages-tu pour ces produits ?',faits),false);});

test('reporting BIA invented a profit is not an affirmation of that profit',()=>assert.equal(core.montantDeLeconNonConfirme('Ton bénéfice est de 2000 francs.','Bénéfice bi 2000 francs la.','Tu dis que mon bénéfice est de 2000 francs, mais je ne t’ai pas donné ces chiffres.',[]),true));
