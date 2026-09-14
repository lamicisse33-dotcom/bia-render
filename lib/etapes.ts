/* ── LES TROIS INSTANTS D'UN APPEL EXTÉRIEUR ─────────────────────────────────

   Lamine, le 15 septembre 2026, après avoir lu le premier tableau :

     « Il faut maintenant mesurer deux choses séparément dans les 3,8 s :
       TTFT = temps avant le premier token, génération = temps du premier au
       dernier token. […] Dans ce cas, il est absurde d'attendre 3,8 secondes :
       BIA pourrait commencer à préparer sa voix vers 0,8–1,2 seconde. […]
       Même chose pour les 4,9 secondes de voix. »

   Il a raison sur le principe, et c'est LA question qui décide de tout ce qui
   suit. Un appel extérieur qui met quatre secondes ne dit rien tant qu'on ne
   sait pas COMMENT il les met :

     — quatre secondes avant le premier octet, puis tout d'un coup : il n'y a
       rien à gagner, le service fabrique tout avant de répondre ;
     — un demi-seconde avant le premier octet, puis trois et demie à couler :
       alors on n'a aucune raison d'attendre la fin, et c'est trois secondes
       rendues à la conversation.

   La différence entre ces deux cas ne se devine pas. Elle se mesure, et elle
   se mesure ICI — côté serveur, au plus près du fil, là où « premier octet »
   veut encore dire quelque chose.

   ── CE QU'ON MESURE, ET CE QUE ÇA VEUT DIRE EXACTEMENT ─────────────────────

     depart    juste avant d'ouvrir la connexion
     premier   l'instant où fetch() rend la main : les en-têtes sont là, et
               avec elles le premier octet du corps. C'est le TTFT pour le
               modèle, et le premier octet audio pour la voix.
     fin       le dernier octet est arrivé et le corps est complet.

   POUR LE MODÈLE, `premier` est posé sur le premier morceau de TEXTE, pas sur
   les en-têtes : une réponse en flux ouvre sa connexion tout de suite et peut
   rester muette une seconde. C'est le premier mot qui compte, pas la poignée
   de main.

   ── ET ON NE CHANGE TOUJOURS RIEN ──────────────────────────────────────────

   Sa consigne du matin tient : on mesure, on ne décide pas encore. Ce fichier
   compte et range. Ce qu'on en fera — découper par phrase, lire l'audio au
   fil de l'eau — se décidera sur les chiffres, pas avant.                  */

export type Etape = {
  /** « ecoute », « modele » ou « voix ». */
  quoi: string;
  /** Départ → premier octet utile. C'est le chiffre qui décide. */
  premier_ms: number;
  /** Départ → dernier octet. */
  fin_ms: number;
  /** Ce que le premier octet a fait gagner, s'il y a quelque chose à gagner. */
  coulee_ms: number;
  /** Combien de signes on a envoyés (voix) ou reçus (modèle). */
  signes: number;
  quand: number;
};

const GARDEES = 60;
let etapes: Etape[] = [];

export function noterEtape(quoi: string, depart: number, premier: number, fin: number, signes = 0) {
  const entier = (n: number) => {
    const x = Math.round(n);
    return Number.isFinite(x) && x >= 0 && x < 600_000 ? x : 0;
  };
  /* Un premier octet après la fin n'existe pas : c'est un appel qui a échoué
     avant d'aboutir, ou une horloge qu'on a mal lue. On ne le range pas. */
  if (!depart || !fin || fin < depart) return;
  const premier_ms = premier && premier >= depart ? entier(premier - depart) : 0;
  const fin_ms = entier(fin - depart);
  if (!fin_ms) return;
  etapes = [...etapes, {
    quoi: String(quoi).slice(0, 20),
    premier_ms,
    fin_ms,
    /* CE QU'IL Y A À GAGNER, nommé pour qu'on n'ait pas à le calculer de
       tête. Si couler dure aussi longtemps qu'attendre, attendre la fin est
       un choix qu'on paie sans rien recevoir. */
    coulee_ms: premier_ms ? Math.max(0, fin_ms - premier_ms) : 0,
    signes: entier(signes),
    quand: Date.now(),
  }].slice(-GARDEES);
}

function mediane(nombres: number[]): number {
  if (!nombres.length) return 0;
  const tri = [...nombres].sort((a, b) => a - b);
  const m = Math.floor(tri.length / 2);
  return tri.length % 2 ? tri[m] : Math.round((tri[m - 1] + tri[m]) / 2);
}

export function resumeEtapes() {
  if (!etapes.length) return null;
  const par = (quoi: string) => {
    const l = etapes.filter((e) => e.quoi === quoi);
    if (!l.length) return null;
    const premier = mediane(l.map((e) => e.premier_ms));
    const fin = mediane(l.map((e) => e.fin_ms));
    return {
      appels: l.length,
      premier_octet_ms: premier,
      complet_ms: fin,
      coulee_ms: mediane(l.map((e) => e.coulee_ms)),
      /* LA PHRASE QUI RÉPOND À SA QUESTION, écrite une fois pour toutes ici
         plutôt que relue à chaque fois dans les chiffres. */
      verdict: !premier
        ? "pas de premier octet mesuré"
        : fin - premier < Math.max(300, fin * 0.25)
          ? "tout arrive d'un coup : rien à gagner à ne pas attendre la fin"
          : `il y a ${fin - premier} ms à reprendre : le reste coule après le premier octet`,
      signes_median: mediane(l.map((e) => e.signes)),
      derniers: l.slice(-5),
    };
  };
  return { ecoute: par("ecoute"), modele: par("modele"), voix: par("voix") };
}

export function oublierEtapes() { etapes = []; }

/* ── L'ESSAI DE SOYNADE, GARDÉ POUR QU'ON LE RELISE ─────────────────────────

   Lamine, le 15 septembre 2026 : « c'est, à mon avis, le test le plus
   important à faire maintenant. » Il l'est — et il décide de tout le chantier
   suivant. Il ne doit donc pas défiler dans une réponse qu'on perd : il se
   range ici et /api/etat le rend, jusqu'au prochain essai. */
export type MesureVoix = { signes: number; premier_ms?: number; fin_ms: number;
  octets: number; ms_par_signe: number; prises?: number; motif?: string };
export type MoteurEssaye = {
  nom: string; absent: boolean; motif?: string;
  resultats?: MesureVoix[];
  plancher_ms?: number; ms_par_signe?: number; premier_octet_ms?: number;
  une_phrase_ms?: number; coule?: boolean; verdict?: string;
};
export type EssaiVoix = {
  quand: string;
  /* Tous les moteurs dont la clé est présente, cote à cote. Sa liste du
     15 septembre 2026 : Soynade, OpenAI, Oolel auto-hébergé. */
  moteurs?: MoteurEssaye[];
  /* SON CRITÈRE N°1 : « temps avant le premier audio, pas seulement le temps
     total ». Nommé ici pour qu'il n'ait pas à comparer cinq colonnes. */
  meilleur_avant_le_premier_audio?: string;
  /* Le moteur qui parle AUJOURD'HUI, à plat — la page les lit déjà. */
  resultats: MesureVoix[];
  plancher_ms: number;
  ms_par_signe: number;
  verdict: string;
};

let essaiVoix: EssaiVoix | null = null;
export function noterEssaiVoix(e: EssaiVoix) { essaiVoix = e; }
export function dernierEssaiVoix() { return essaiVoix; }
