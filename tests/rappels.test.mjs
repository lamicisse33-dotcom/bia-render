import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createRequire} from 'node:module';
import crypto from 'node:crypto';

const require_=createRequire(import.meta.url);
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function charger(chemin,permis){
 const m={exports:{}};
 new Function('require','module','exports','process',compile(fs.readFileSync(chemin,'utf8')))(
  id=>{if(!permis.includes(id))assert.fail(chemin+' ne doit pas importer : '+id);return require_(id);},
  m,m.exports,process);
 return m.exports;
}
/* lib/rappels.ts ne doit RIEN importer : une épreuve le charge seul, et il ne
   doit pas pouvoir toucher Supabase par accident. */
const R=charger('lib/rappels.ts',[]);
const P=charger('lib/push-web.ts',['node:crypto']);

const MIDI=Date.UTC(2026,9,24,12,0,0);

/* ── CE QU'IL DIT, ET CE QU'ELLE EN COMPREND ───────────────────────────── */
test('« rappelle-moi mon médicament à 8 h et 20 h » donne deux heures et le bon nom',()=>{
 const i=R.intentionRappel('rappelle-moi mon médicament à 8 h et 20 h',MIDI);
 assert.equal(i.action,'ajoute');
 assert.deepEqual(i.heures,['08:00','20:00']);
 assert.equal(i.quoi,'médicament');
});

test('les heures dites en lettres et les moments de la journée',()=>{
 assert.deepEqual(R.heuresDites('à huit heures et à vingt heures'),['08:00','20:00']);
 assert.deepEqual(R.heuresDites('à 8h30'),['08:30']);
 assert.deepEqual(R.heuresDites('à 8 heures et demie'),['08:30']);
 assert.deepEqual(R.heuresDites('le matin et le soir'),['08:00','20:00']);
 assert.deepEqual(R.heuresDites('à midi'),['12:00']);
 assert.deepEqual(R.heuresDites('ci suba'),['08:00']);
});

/* RÈGLE 2 : un motif qui attrape trop est pire qu'un motif qui n'attrape
   rien. « 3 cachets de 500 mg » ne contient AUCUNE heure. */
test('un dosage n’est pas une heure, et une phrase ordinaire n’est pas un rappel',()=>{
 assert.deepEqual(R.heuresDites('il me faut 3 cachets de 500 mg'),[]);
 for(const phrase of [
  'il me faut 3 cachets de 500 mg',
  'naka nga def ?',
  'parle-moi de DD SKIN',
  'j’ai pris mon médicament ce matin',
 ]) assert.equal(R.intentionRappel(phrase,MIDI).action,null,'ne doit rien déclencher : '+phrase);
});

test('« dans deux minutes » est lu comme un délai, pas comme deux heures',()=>{
 const i=R.intentionRappel('rappelle-moi mon médicament dans 2 minutes',MIDI);
 assert.equal(i.action,'ajoute');
 assert.deepEqual(i.heures,['12:02']);
 const h=R.intentionRappel('rappelle-moi mon médicament dans deux heures',MIDI);
 assert.deepEqual(h.heures,['14:00'],'« dans deux heures » ne doit pas devenir 2 h du matin');
});

test('demander la liste et demander une suppression se distinguent',()=>{
 assert.equal(R.intentionRappel('quels sont mes rappels',MIDI).action,'liste');
 assert.equal(R.intentionRappel('dis-moi mes rappels',MIDI).action,'liste');
 assert.equal(R.intentionRappel('supprime mes rappels',MIDI).action,'supprime');
 assert.equal(R.intentionRappel('annule le rappel de 20 h',MIDI).action,'supprime');
});

test('une demande sans heure ne pose rien : elle doit reposer la question',()=>{
 const i=R.intentionRappel('rappelle-moi mon médicament',MIDI);
 assert.equal(i.action,null);
 assert.equal(R.construireRappel(i,MIDI),null);
});

/* ── ON N’EFFACE JAMAIS SUR UN DOUTE ───────────────────────────────────── */
test('une suppression ambiguë ne vise rien tant que deux rappels existent',()=>{
 const a={id:'a',quoi:'médicament',heures:['08:00'],cree:'',sonne:{}};
 const b={id:'b',quoi:'gouttes',heures:['20:00'],cree:'',sonne:{}};
 assert.deepEqual(R.rappelsVises([a,b],{action:'supprime',quoi:'',heures:[]}),[],
  'sans désignation et avec deux rappels, on ne devine pas');
 assert.deepEqual(R.rappelsVises([a],{action:'supprime',quoi:'',heures:[]}),[a],
  'un seul rappel : aucune ambiguïté possible');
 assert.deepEqual(R.rappelsVises([a,b],{action:'supprime',quoi:'gouttes',heures:[]}),[b]);
 assert.deepEqual(R.rappelsVises([a,b],{action:'supprime',quoi:'',heures:['20:00']}),[b]);
});

/* ── L’HEURE QUI SONNE, ET CELLE QU’ON A LAISSÉE PASSER ────────────────── */
test('un créneau sonne une fois par jour, et un retard de plus d’une heure est perdu, pas oublié',()=>{
 const r={id:'a',quoi:'ton médicament',heures:['08:00','20:00'],cree:'',sonne:{}};
 const a8h05=Date.UTC(2026,9,24,8,5);
 let v=R.sonneriesDues([r],a8h05);
 assert.equal(v.dues.length,1);
 assert.equal(v.dues[0].heure,'08:00');
 assert.equal(v.dues[0].retard_min,5);

 /* Déjà sonné aujourd’hui : plus rien, et surtout pas une seconde sonnerie
    à chaque passage de l’horloge. */
 r.sonne['08:00']=R.jourLocal(a8h05);
 assert.equal(R.sonneriesDues([r],a8h05).dues.length,0);

 /* Le serveur a dormi : à 9 h 30, le créneau de 8 h est PERDU, et il est
    compté comme perdu — un rappel manqué en silence serait le pire. */
 const r2={id:'b',quoi:'x',heures:['08:00'],cree:'',sonne:{}};
 const v2=R.sonneriesDues([r2],Date.UTC(2026,9,24,9,30));
 assert.equal(v2.dues.length,0);
 assert.equal(v2.perdues.length,1);
 assert.equal(v2.perdues[0].heure,'08:00');

 /* Et un créneau à venir ne sonne pas d’avance. */
 assert.equal(R.sonneriesDues([{id:'c',quoi:'x',heures:['20:00'],cree:'',sonne:{}}],a8h05).dues.length,0);
});

test('la prochaine sonnerie passe au lendemain quand la journée est finie',()=>{
 const r={id:'a',quoi:'x',heures:['08:00'],cree:'',sonne:{}};
 const quand=R.prochaineSonnerie(r,Date.UTC(2026,9,24,20,0));
 assert.equal(new Date(quand).toISOString(),'2026-10-25T08:00:00.000Z');
});

/* ── CE QU’ELLE DIT À VOIX HAUTE ───────────────────────────────────────── */
test('la liste est une phrase prononçable, jamais « 08:00 »',()=>{
 const p=R.phraseDesRappels([{id:'a',quoi:'ton médicament',heures:['08:00','20:00'],cree:'',sonne:{}}]);
 assert.match(p,/8 heures et 20 heures/);
 assert.doesNotMatch(p,/\d\d:\d\d/,'une heure écrite « 08:00 » serait lue « zéro huit deux points »');
 assert.match(R.phraseDesRappels([]),/aucun rappel/i);
});

test('la notification ne porte que l’heure et ses mots',()=>{
 const t=R.texteSonnerie({id:'a',quoi:'ton médicament',heures:['08:00'],cree:'',sonne:{}},'08:00');
 assert.match(t.titre,/8 heures/);
 assert.match(t.corps,/ton médicament/);
});

/* ── LES CLÉS VAPID, DÉRIVÉES ET NON POSÉES À LA MAIN ─────────────────── */
test('la même BIA_SECRET donne toujours la même paire VAPID, une autre en donne une autre',()=>{
 process.env.BIA_SECRET='un-secret-de-test-assez-long';
 const A=charger('lib/push-web.ts',['node:crypto']);
 const a1=A.clePubliquePush();
 assert.equal(a1,A.clePubliquePush(),'stable d’un appel à l’autre');
 assert.equal(Buffer.from(a1,'base64url').length,65,'un point P-256 non compressé fait 65 octets');
 assert.equal(Buffer.from(a1,'base64url')[0],4);
 process.env.BIA_SECRET='un-autre-secret-de-test';
 const B=charger('lib/push-web.ts',['node:crypto']);
 assert.notEqual(B.clePubliquePush(),a1,'un secret différent doit donner une clé différente');
 /* Sans secret, pas de clé — et surtout pas une clé par défaut que tout le
    monde partagerait. */
 process.env.BIA_SECRET='';
 assert.equal(charger('lib/push-web.ts',['node:crypto']).clePubliquePush(),'');
 process.env.BIA_SECRET='un-secret-de-test-assez-long';
});

/* ── LE CHIFFREMENT, PROUVÉ EN LE DÉCHIFFRANT ─────────────────────────────
   Un bloc chiffré qui « part » ne prouve rien : le service de push ne nous
   dira jamais qu’il était illisible, il le livrera et le téléphone l’ignorera
   en silence. On le déchiffre donc ICI, avec la clé de l’abonné, exactement
   comme le navigateur le fera. */
test('un message chiffré pour un abonné se déchiffre avec sa clé (RFC 8291)',()=>{
 const abonne=crypto.generateKeyPairSync('ec',{namedCurve:'prime256v1'});
 const jwk=abonne.publicKey.export({format:'jwk'});
 const p256dh=Buffer.concat([Buffer.from([4]),Buffer.from(jwk.x,'base64url'),Buffer.from(jwk.y,'base64url')]).toString('base64url');
 const auth=crypto.randomBytes(16).toString('base64url');
 const clair=JSON.stringify({titre:'BIA — 8 heures',corps:"C'est l'heure de ton médicament."});

 const bloc=P.chiffrerPourPush(Buffer.from(clair),p256dh,auth);

 /* On refait le chemin du navigateur. */
 const sel=bloc.subarray(0,16);
 const taille=bloc.readUInt32BE(16);
 const longueurCle=bloc[20];
 const pointServeur=bloc.subarray(21,21+longueurCle);
 const chiffre=bloc.subarray(21+longueurCle);
 assert.equal(taille,4096);
 assert.equal(longueurCle,65);

 const pubServeur=crypto.createPublicKey({key:{kty:'EC',crv:'P-256',
  x:pointServeur.subarray(1,33).toString('base64url'),
  y:pointServeur.subarray(33,65).toString('base64url')},format:'jwk'});
 const partage=crypto.diffieHellman({privateKey:abonne.privateKey,publicKey:pubServeur});
 const hkdf=(s,ikm,info,n)=>{
  const prk=crypto.createHmac('sha256',s).update(ikm).digest();
  return crypto.createHmac('sha256',prk).update(Buffer.concat([info,Buffer.from([1])])).digest().subarray(0,n);
 };
 const prk=hkdf(Buffer.from(auth,'base64url'),partage,
  Buffer.concat([Buffer.from('WebPush: info\0'),Buffer.from(p256dh,'base64url'),pointServeur]),32);
 const cle=hkdf(sel,prk,Buffer.from('Content-Encoding: aes128gcm\0'),16);
 const nonce=hkdf(sel,prk,Buffer.from('Content-Encoding: nonce\0'),12);
 const d=crypto.createDecipheriv('aes-128-gcm',cle,nonce);
 d.setAuthTag(chiffre.subarray(chiffre.length-16));
 const ouvert=Buffer.concat([d.update(chiffre.subarray(0,chiffre.length-16)),d.final()]);
 assert.equal(ouvert[ouvert.length-1],2,'le dernier octet doit marquer le dernier enregistrement');
 assert.equal(ouvert.subarray(0,ouvert.length-1).toString(),clair);
});

/* ── L’ADRESSE DE PUSH ILLISIBLE N’EST PAS UNE PANNE ────────────────────── */
test('une adresse de push illisible est déclarée disparue, pas réessayée indéfiniment',async()=>{
 const v=await P.envoyerPush({endpoint:'pas-une-adresse',cles:{p256dh:'x',auth:'y'}},{a:1});
 assert.equal(v.ok,false);
 assert.equal(v.disparu,true);
});

/* ── LE RANGEMENT NE PEUT PAS MÉLANGER DEUX PERSONNES ─────────────────── */
test('un identifiant vide ne range rien : un rappel sans propriétaire serait lu par tous',()=>{
 /* On lui donne un lexique muet : l'épreuve porte sur l'isolement des
    identifiants, pas sur Supabase, et aucun appel réseau ne doit partir. */
 const m={exports:{}};
 new Function('require','module','exports','process',compile(fs.readFileSync('lib/rappels-depot.ts','utf8')))(
  id=>{
   if(id==='./lexique')return {lexiqueConfig:{url:'',cle:'',application:'bia',actif:false}};
   if(id==='./rappels')return R;
   return assert.fail('lib/rappels-depot.ts ne doit pas importer : '+id);
  },m,m.exports,process);
 const D=m.exports;
 assert.equal(D.cleDe(''),'');
 assert.equal(D.cleDe('   '),'');
 assert.equal(D.cleDe('Maitre'),'maitre');
 assert.equal(D.cleDe('../autre'),'autre','aucun chemin ne doit pouvoir sortir de sa clé');
});

/* ══════════════════════════════════════════════════════════════════════════
   LES ROUTES, DE BOUT EN BOUT, SANS SUPABASE

   Lamine : « ne dis JAMAIS "fait" sans un test réel ». Ici on exécute les
   vraies routes avec le vrai dépôt — qui, sans SUPABASE_URL, range en
   mémoire vive et le DIT. C'est exactement ce qui se passera sur le serveur
   tant que data/rappels.sql n'est pas collé, donc c'est le chemin qu'il faut
   éprouver. On ne simule pas le dépôt : on le laisse faire.
   ══════════════════════════════════════════════════════════════════════════ */

function chargerRoute(chemin){
 const m={exports:{}};
 const deps={
  'next/server':{NextResponse:{json:(body,opt)=>({statut:opt?.status||200,corps:body})}},
  '@/lib/codes':{verifierCode:c=>c==='MASTER'?{ok:true,maitre:true}:c==='VISITEUR'?{ok:true,maitre:false}:{ok:false}},
  '@/lib/rappels':R,
  '@/lib/rappels-depot':depot,
  '@/lib/rappels-horloge':{armerHorloge(){},balayerLesRappels:async()=>{}},
  '@/lib/push-web':{clePubliquePush:()=>'une-cle'},
 };
 new Function('require','module','exports','process',compile(fs.readFileSync(chemin,'utf8')))(
  id=>{assert(id in deps,chemin+' importe '+id+' : ajoute-le au décor');return deps[id];},m,m.exports,process);
 return m.exports;
}
/* Un dépôt neuf par bloc d'épreuves : les rappels d'un essai ne doivent pas
   fuir dans le suivant — c'est précisément ce qu'on vérifie du produit. */
let depot;
function neuf(){
 delete globalThis.biaRappelsDepot;
 depot=charger('lib/rappels-depot.ts',['./lexique','./rappels']);
 return chargerRoute('app/api/rappels/route.ts');
}
/* Le dépôt a besoin d'un lexique : sans URL ni clé, il range en mémoire. */
const vraiCharger=charger;
charger=(chemin,permis)=>{
 if(chemin!=='lib/rappels-depot.ts')return vraiCharger(chemin,permis);
 const m={exports:{}};
 new Function('require','module','exports','process',compile(fs.readFileSync(chemin,'utf8')))(
  id=>id==='./lexique'?{lexiqueConfig:{url:'',cle:'',application:'bia',actif:false}}:id==='./rappels'?R:assert.fail(id),
  m,m.exports,process);
 return m.exports;
};

const demande=(corps,code='MASTER')=>({
 headers:{get:n=>n==='x-bia-code'?code:null},
 json:async()=>corps,
});

test('poser un rappel à la voix, le relire, puis l’enlever — en vrai, par la route',async()=>{
 const route=neuf();
 const pose=await route.POST(demande({phrase:'rappelle-moi mon médicament à 8 h et 20 h'}));
 assert.equal(pose.statut,200);
 assert.equal(pose.corps.fait,true);
 assert.deepEqual(pose.corps.rappel.heures,['08:00','20:00']);
 assert.equal(pose.corps.rappel.quoi,'médicament');

 /* « Si le rappel ne peut pas sonner, BIA doit le dire clairement. » Aucun
    téléphone n'est abonné dans cette épreuve : la route doit le dire, et la
    phrase doit nommer l'installation sur l'écran d'accueil. */
 assert.equal(pose.corps.sonnera,false);
 assert.match(pose.corps.pourquoi_pas,/écran d'accueil/);
 assert.match(pose.corps.pourquoi_pas,/notifications/);

 const liste=await route.GET(demande({}));
 assert.equal(liste.corps.rappels.length,1);
 assert.match(liste.corps.phrase,/8 heures et 20 heures/);
 assert.doesNotMatch(liste.corps.phrase,/\d\d:\d\d/,'une heure prononçable, jamais « 08:00 »');

 const parLaVoix=await route.POST(demande({phrase:'quels sont mes rappels'}));
 assert.equal(parLaVoix.corps.action,'liste');
 assert.equal(parLaVoix.corps.rappels.length,1);

 const enleve=await route.POST(demande({phrase:'enlève le rappel de mon médicament'}));
 assert.equal(enleve.corps.fait,true);
 assert.equal(enleve.corps.rappels.length,0);
 assert.match(enleve.corps.phrase,/aucun rappel/i);
});

test('une suppression ambiguë ne supprime rien et redemande',async()=>{
 const route=neuf();
 await route.POST(demande({phrase:'rappelle-moi mon médicament à 8 h'}));
 await route.POST(demande({phrase:'rappelle-moi mes gouttes à 20 h'}));
 const flou=await route.POST(demande({phrase:'enlève mon rappel'}));
 assert.equal(flou.corps.fait,false);
 assert.equal(flou.corps.ambigu,true);
 assert.equal(flou.corps.rappels.length,2,'rien n’a été supprimé sur un doute');
 assert.match(flou.corps.raison,/lequel/i);
});

test('une demande sans heure ne pose rien : elle doit redemander l’heure',async()=>{
 const route=neuf();
 const v=await route.POST(demande({phrase:'rappelle-moi mon médicament'}));
 assert.equal(v.corps.fait,false);
 assert.match(v.corps.raison,/heure/i);
 assert.equal((await route.GET(demande({}))).corps.rappels.length,0);
});

/* ── LE POINT QU'IL A POSÉ EN PREMIER : « JAMAIS VISIBLES D'UN AUTRE » ──── */
test('les rappels du maître sont invisibles pour un visiteur, et réciproquement',async()=>{
 const route=neuf();
 await route.POST(demande({phrase:'rappelle-moi mon médicament à 8 h'},'MASTER'));
 const visiteur={headers:{get:n=>n==='x-bia-code'?'VISITEUR':n==='x-bia-appareil'?'telephone2':null},json:async()=>({})};
 const vu=await route.GET(visiteur);
 assert.equal(vu.corps.rappels.length,0,'un visiteur ne voit pas les rappels du maître');
 await route.POST({...visiteur,json:async()=>({phrase:'rappelle-moi mes gouttes à 7 h'})});
 assert.equal((await route.GET(visiteur)).corps.rappels.length,1);
 const duMaitre=await route.GET(demande({},'MASTER'));
 assert.equal(duMaitre.corps.rappels.length,1);
 assert.equal(duMaitre.corps.rappels[0].quoi,'médicament','et le maître ne voit pas les siens');
});

test('sans code, aucune route de rappel ne répond',async()=>{
 const route=neuf();
 assert.equal((await route.GET(demande({},'RIEN'))).statut,401);
 assert.equal((await route.POST(demande({phrase:'rappelle-moi mon médicament à 8 h'},'RIEN'))).statut,401);
});

/* Un visiteur sans profil ET sans jeton d'appareil n'a aucun rangement : on
   refuse plutôt que de tout mettre dans un tas commun où chacun entendrait
   l'ordonnance du voisin. */
test('un visiteur sans jeton d’appareil n’a aucun rangement, et on le refuse',async()=>{
 const route=neuf();
 const anonyme={headers:{get:n=>n==='x-bia-code'?'VISITEUR':null},json:async()=>({})};
 assert.equal((await route.GET(anonyme)).statut,401);
});

test('le dépôt dit toujours où les rappels sont rangés',async()=>{
 const route=neuf();
 await route.POST(demande({phrase:'rappelle-moi mon médicament à 8 h'}));
 const r=depot.resumeDepotRappels();
 /* Sans SUPABASE_URL, c'est la mémoire vive — et ça doit être DIT, pour
    qu'on ne confonde jamais « ça marche » avec « c'est gardé ». */
 assert.equal(r.rangement,'memoire');
 assert.equal(r.personnes_en_memoire,1);
});
