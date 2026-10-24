/* ── COMBIEN DE FOIS L'OUTIL EST VRAIMENT APPELÉ ───────────────────────────

   Demandé par Lamine le 24 octobre 2026 : « compter dans /api/etat combien de
   fois chercher_connaissances est réellement appelé par tour. »

   La question est juste, et c'était le trou : avant ce jour, la mémoire de
   Khalam Rapide ne lui parvenait QUE par cet outil, et rien ne disait s'il
   était appelé. Zéro appel et une mémoire absente donnent exactement la même
   conversation — sans compteur, on ne pouvait pas les distinguer.

   Depuis ce jour, souvenirs, corrections exactes, devoirs et mots corrigés
   partent DÈS l'ouverture de session. Ce compteur dit donc deux choses : si
   l'outil sert encore à approfondir, et surtout s'il est appelé à la place
   d'une mémoire qui aurait dû être déjà là.

   Actions, comptes et durées. Aucune question, aucun texte, aucun résultat. */

type Etat = {appels:number;par_action:Record<string,number>;refus:number;vides:number;derniers:Array<{action:string;lignes:number;ms:number;quand:string}>};
const g = globalThis as typeof globalThis & {biaOutilConnaissances?:Etat};
const etat:Etat = (g.biaOutilConnaissances ??= {appels:0,par_action:{},refus:0,vides:0,derniers:[]});

const ACTIONS = new Set(['chercher','lister_devoirs','lire_devoir','lister_lexique']);

export function noterOutilConnaissances(d:{action?:string;lignes?:number;ms?:number;refus?:boolean}){
  if(d.refus){etat.refus+=1;return;}
  const action=ACTIONS.has(String(d.action))?String(d.action):'inconnue';
  const lignes=Number(d.lignes),ms=Number(d.ms);
  etat.appels+=1;
  etat.par_action[action]=(etat.par_action[action]||0)+1;
  const n=Number.isFinite(lignes)&&lignes>=0&&lignes<=100000?Math.round(lignes):0;
  if(!n)etat.vides+=1;
  etat.derniers=[...etat.derniers.slice(-19),{action,lignes:n,ms:Number.isFinite(ms)&&ms>=0&&ms<=120000?Math.round(ms):0,quand:new Date().toISOString()}];
}

export const resumeOutilConnaissances=()=>({
  revision:'outil-connaissances-v1',
  appels:etat.appels,
  par_action:{...etat.par_action},
  acces_refuses:etat.refus,
  reponses_sans_aucune_ligne:etat.vides,
  derniers:etat.derniers,
  limite:'Actions, comptes et durées. Aucune question, aucun texte, aucun résultat. Depuis le 24 octobre 2026 la mémoire part dès l’ouverture de session : un compteur élevé ici veut dire que l’outil sert à approfondir, pas que la mémoire manquait.',
});
