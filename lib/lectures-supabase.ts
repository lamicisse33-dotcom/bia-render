/* ── PROUVER QUE BIA LIT SUPABASE, SOURCE PAR SOURCE, TOUR PAR TOUR ────────

   Demandé par Lamine le 24 octobre 2026 : « prouver par des appels réels,
   visibles dans /api/etat, que BIA lit Supabase — devoirs, lexique, mots
   corrigés, corrections exactes, instructions apprises, souvenirs — avec le
   nombre de lignes lues par source à chaque tour. »

   CE QUI EXISTAIT NE SUFFISAIT PAS. `memoire_transmise` donne les SIGNES
   transmis au modèle ; `souvenirs` donne des totaux depuis le réveil. Aucun
   des deux ne dit, pour UN tour : combien de LIGNES chaque source a rendues,
   et sur quel moteur. On pouvait donc voir « devoirs_signes 0 » sans savoir
   si la lecture avait échoué, rendu zéro ligne, ou rendu des lignes qu'un
   budget avait coupées. Trois causes, un seul zéro.

   CE QUI EST PUBLIÉ : des noms de source, des comptes de lignes, des signes
   et le moteur. AUCUN texte, aucune transcription, aucun souvenir, aucun
   mot wolof. Un nombre de lignes n'est pas un contenu. */

type Source = 'devoirs'|'lexique'|'mots_corriges'|'corrections_exactes'|'instructions'|'souvenirs'|'fiches'|'lexique_partage'|'maitrises';
type Tour = {moteur:string;lignes:Partial<Record<Source,number>>;signes:Partial<Record<Source,number>>;quand:string};
type Etat = {tours:Tour[];encours:Map<string,Tour>};
const g = globalThis as typeof globalThis & {biaLecturesSupabase?:Etat};
const etat:Etat = (g.biaLecturesSupabase ??= {tours:[],encours:new Map()});

const SOURCES = new Set<string>(['devoirs','lexique','mots_corriges','corrections_exactes','instructions','souvenirs','fiches','lexique_partage','maitrises']);

/** Un tour commence : on ouvre son relevé. Le moteur est dit, jamais deviné. */
export function ouvrirLecture(tour:string, moteur:'khalam'|'khalam_rapide'){
  const cle=String(tour||'').slice(0,80)||'sans-tour';
  etat.encours.set(cle,{moteur,lignes:{},signes:{},quand:new Date().toISOString()});
  /* Un tour abandonné ne doit pas faire grossir la table indéfiniment. */
  while(etat.encours.size>24)etat.encours.delete(etat.encours.keys().next().value as string);
  return cle;
}

/** Une source vient de rendre `lignes` lignes et `signes` signes, pour ce tour. */
export function noterLectureSource(tour:string, source:Source, lignes:number, signes=0){
  if(!SOURCES.has(source))return;
  const cle=String(tour||'').slice(0,80)||'sans-tour';
  /* Un tour qui n'a pas été ouvert ouvre le sien : une lecture ne doit
     jamais être perdue parce que l'appelant a oublié de l'annoncer. */
  if(!etat.encours.has(cle))ouvrirLecture(cle,'khalam');
  const t=etat.encours.get(cle);
  if(!t)return;
  const n=Number(lignes),s=Number(signes);
  t.lignes[source]=(t.lignes[source]||0)+(Number.isFinite(n)&&n>=0&&n<=200000?Math.round(n):0);
  t.signes[source]=(t.signes[source]||0)+(Number.isFinite(s)&&s>=0&&s<=2000000?Math.round(s):0);
}

/** Le tour est fini : son relevé rejoint les vingt derniers. */
export function fermerLecture(tour:string){
  const cle=String(tour||'').slice(0,80)||'sans-tour';
  const t=etat.encours.get(cle);
  if(!t)return;
  etat.encours.delete(cle);
  if(!Object.keys(t.lignes).length)return;
  etat.tours=[...etat.tours.slice(-19),t];
}

const mediane=(v:number[])=>{const a=[...v].sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length?(a[m]+a[(a.length-1)>>1])/2:null;};

function parMoteur(moteur:string){
  const tours=etat.tours.filter(t=>t.moteur===moteur);
  if(!tours.length)return null;
  const resume:Record<string,unknown>={tours:tours.length};
  for(const source of SOURCES){
    const lignes=tours.map(t=>t.lignes[source as Source]).filter((x):x is number=>typeof x==='number');
    if(!lignes.length){resume[source]={tours_avec_lecture:0,lignes_medianes:null,signes_medians:null};continue;}
    resume[source]={
      tours_avec_lecture:lignes.length,
      tours_a_zero_ligne:lignes.filter(n=>n===0).length,
      lignes_medianes:mediane(lignes),
      signes_medians:mediane(tours.map(t=>t.signes[source as Source]).filter((x):x is number=>typeof x==='number')),
    };
  }
  return resume;
}

export function resumeLecturesSupabase(){
  return {
    revision:'lectures-par-source-v1',
    khalam:parMoteur('khalam'),
    khalam_rapide:parMoteur('khalam_rapide'),
    derniers_tours:etat.tours.slice(-8).map(t=>({moteur:t.moteur,lignes:t.lignes,quand:t.quand})),
    limite:'Noms de source, comptes de lignes, signes et moteur. Aucun texte, aucune transcription, aucun souvenir, aucun mot wolof. `tours_a_zero_ligne` distingue une source qui a répondu zéro ligne d’une source qui n’a pas été lue du tout.',
  };
}
