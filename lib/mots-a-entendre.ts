/* ── LUI DONNER SES MOTS D'AVANCE, AU LIEU DE LE LAISSER DEVINER ────────────

   Lamine, le 12 septembre 2026 au soir : « attaque ça. Ensuite les mots
   corrigés doivent être prioritaires si leur équivalent n'existe pas sur les
   phrases enregistrées. »

   ── CE QU'ON A MESURÉ, ET QUI N'EST PAS UNE IMPRESSION ────────────────────

   Relevé sur son serveur, sur les douze dernières écoutes :

       fra: 8    eng: 1    ita: 1    pam: 1    tur: 1    wol: 0

   Pas UNE seule fois le wolof. Il parle wolof à Dakar, et le moteur croit
   entendre du français huit fois sur douze — puis de l'anglais, de l'italien,
   du pampangan, du turc. Le micro, lui, capte et envoie : ce n'est pas le
   micro, c'est l'oreille.

   ── POURQUOI, ET CE QU'ON PEUT Y FAIRE ────────────────────────────────────

   ElevenLabs classe le wolof dans son palier « moyen » : entre 25 et 50 % des
   mots reviennent faux. Ce n'est pas réparable par un réglage — mais Scribe
   accepte qu'on lui donne D'AVANCE une liste de mots à s'attendre à entendre,
   les `keyterms`. On ne lui demande plus de devenir le wolof : on lui donne le
   vocabulaire de Lamine.

   ── LA CONTRAINTE QUI COMMANDE TOUT LE RESTE ──────────────────────────────

   La documentation est nette, et c'est la facturation qui décide :

       « The number of keyterms cannot exceed 1000 »
       « each keyterm must be less than 50 characters »
       « at most 5 words (after normalisation) »
       « an additional 20% surcharge »
       et AU-DELÀ DE CENT TERMES : une durée facturable minimale de 20 s.

   Ce dernier point change tout. Une phrase de BIA dure deux à trois secondes.
   Passer de cent à cent un termes, ce n'est pas 1 % de plus : c'est facturer
   VINGT secondes chaque fois qu'on dit « Salaam ». On s'arrête donc à CENT, et
   comme il n'y a que cent places, l'ordre dans lequel on les remplit est la
   vraie question — celle à laquelle Lamine a répondu.

   ── SA RÈGLE DE PRIORITÉ ──────────────────────────────────────────────────

   « Les mots corrigés doivent être prioritaires si leur équivalent n'existe
   pas sur les phrases enregistrées. » C'est juste, et voici pourquoi : un mot
   qu'il a corrigé de sa main est un mot que le moteur avait déjà raté. Et si
   ce mot ne figure NULLE PART dans les phrases enregistrées, aucun répertoire
   ne le rattrapera — il n'y a que cette liste-ci pour le sauver. Ceux qui SONT
   dans les phrases enregistrées ont déjà un filet : la correspondance tolère
   jusqu'à un quart de mots faux.

   D'où l'ordre, du plus irremplaçable au moins :

     1. ses mots corrigés ABSENTS des phrases enregistrées — sa règle ;
     2. ses autres mots corrigés ;
     3. les mots d'ARGENT — dërëm, fukk, téeméer, junni, fan wer. Se tromper
        sur un prix coûte de l'argent à quelqu'un ; c'est la règle de nous deux
        depuis le 10 septembre ;
     4. les mots distinctifs de SES formulations à lui — celles qu'il a écrites
        pour déclencher les réponses, donc ce qu'il dit vraiment ;
     5. le reste, par fréquence.

   ON NE MET QUE CE QU'IL DIT, LUI. Pas ce que BIA répond : ces mots-là ne
   passent jamais par le micro. Une place dans la liste vaut trop cher pour la
   dépenser sur une phrase qu'il n'aura jamais à prononcer.                 */

import { REPERTOIRE } from "./repertoire-textes";
import { NOUVELLES } from "./base-textes";
import { FORMES_NEUVES, DE_LAMINE } from "./formes-neuves";
import { NOMBRES } from "./nombres-textes";
import { OUTILS } from "./lexique";
import type { MotCorrige } from "./lexique";

/** Cent, et pas cent un : au-delà, chaque écoute est facturée vingt secondes. */
export const MAX_TERMES = 100;
/** « less than 50 characters » — on garde une marge d'un signe. */
export const MAX_SIGNES = 48;
/** « at most 5 words (after normalisation) ». */
export const MAX_MOTS = 5;

export type Source = "corrigé-absent" | "corrigé" | "argent" | "sien" | "fréquent";
export type Terme = { terme: string; source: Source; fois?: number };

/** Les mots d'un texte, tels qu'ils s'écrivent — les lettres wolof comprises. */
export function motsDe(texte: string): string[] {
  return String(texte || "")
    .replace(/[.,;:!?«»"()[\]…/]/g, " ")
    .split(/\s+/)
    .map((m) => m.trim())
    .filter(Boolean);
}

const sansAccent = (m: string) =>
  m.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Entre deux orthographes du même mot, garder celle qui porte les accents :
    « bëgg » plutôt que « begg », « téeméer » plutôt que « teemeer ». C'est
    celle-là qu'on veut apprendre au moteur. */
/* On COMPTE les lettres accentuées, on ne compare pas des longueurs : « Yàlla »
   et « yalla » font cinq signes tous les deux, et ma première version les
   croyait donc équivalents. Elle rendait « yalla » — en effaçant l'accent du
   nom de Dieu. */
const nombreDAccents = (m: string) =>
  [...m.toLowerCase()].filter((c) => !/[a-z0-9\-' ]/.test(c)).length;
const aPlusDAccents = (neuf: string, vieux: string) =>
  nombreDAccents(neuf) > nombreDAccents(vieux)
  || (nombreDAccents(neuf) === nombreDAccents(vieux) && neuf === neuf.toLowerCase() && vieux !== vieux.toLowerCase());

/* ── LES MOTS QU'ON NE DONNE PAS, ET POURQUOI ─────────────────────────────

   Cent places. Un mot français ordinaire n'en mérite aucune : Scribe connaît
   le français mieux que nous, et « bonne », « message », « parents » ne
   reviennent jamais faux. Chaque place dépensée là-dessus est une place volée
   à un mot wolof que le moteur n'a jamais vu.

   Ce ne sont donc pas des mots « interdits » : ce sont des mots DÉJÀ SUS. */
const DEJA_SUS = new Set([
  "suis", "vais", "fais", "sais", "dit", "dis", "lire", "ecrire", "écrire", "parle", "parles",
  "parler", "bonne", "bonsoir", "bonjour", "bienvenue", "merci", "pardon", "salut", "bye",
  "message", "famille", "maison", "parents", "nouvelles", "manque", "internet", "jeux",
  "applications", "application", "quelles", "quelle", "vraiment", "francais", "français",
  "journee", "journée", "nuit", "demain", "aujourd", "hui", "chose", "quelque", "quelqu",
  "photo", "video", "vidéo", "image", "carte", "voir", "montre", "montrer", "cherche",
  "chercher", "trouve", "trouver", "appelle", "appeler", "ecris", "écris", "aide", "aider",
  "veux", "peux", "faut", "petit", "grand", "tout", "rien", "jour", "soir", "matin",
]);

/* Et à l'inverse : les noms propres de son monde. Scribe ne les a jamais vus,
   et ils reviennent dans toutes ses phrases. Ce sont les places les mieux
   dépensées de la liste. */
const LES_SIENS = ["KHALAM", "BIA", "BIBA", "GEWEL", "Kha", "Lamine", "Dakar", "wolof", "dërëm"];

/* ── L'ORTHOGRAPHE JUSTE, PRISE LÀ OÙ ELLE EST JUSTE ─────────────────────

   Ses formulations de déclenchement sont écrites SANS ACCENTS, et c'est
   voulu : « les formes qui doivent déclencher cette réponse, sans accent, en
   minuscules » — la correspondance les compare ainsi.

   Mais une liste de keyterms n'est pas une liste de comparaison : elle
   APPREND au moteur comment le mot s'écrit. Lui donner « men » lui
   apprendrait à écrire « men », et « bëgg » deviendrait « begg » dans tout ce
   qu'il transcrit.

   Ses phrases ENREGISTRÉES, elles, sont écrites correctement — c'est ce
   qu'elle prononce, il les a relues une par une. On s'en sert donc comme
   dictionnaire : chaque mot pris dans une formulation est rendu à son
   orthographe complète s'il existe quelque part dans ce qu'elle dit. */
let dictionnaire: Map<string, string> | null = null;
function orthographeJuste(mot: string): string {
  if (!dictionnaire) {
    dictionnaire = new Map();
    const poser = (t: string) => {
      for (const m of motsDe(t)) {
        const cle = sansAccent(m);
        const vu = dictionnaire!.get(cle);
        if (!vu || aPlusDAccents(m, vu)) dictionnaire!.set(cle, m);
      }
    };
    for (const e of REPERTOIRE) poser(e.wolof);
    for (const n of NOUVELLES) poser(n.wolof);
    for (const n of NOMBRES) poser(n.wolof);
  }
  const juste = dictionnaire.get(sansAccent(mot));
  return juste && aPlusDAccents(juste, mot) ? juste : mot;
}

/** Un terme acceptable pour Scribe, et qui vaille sa place. */
function utilisable(terme: string): boolean {
  const t = terme.trim();
  if (t.length < 3 || t.length > MAX_SIGNES) return false;
  const mots = motsDe(t);
  if (!mots.length || mots.length > MAX_MOTS) return false;
  /* Des chiffres ne s'entendent pas : ce sont des mots qu'on veut. */
  if (/^[\d\s.,%-]+$/.test(t)) return false;
  /* Un mot-outil seul ne sert à rien — « ci », « nga », « le » reviennent
     dans toutes les phrases du monde et ne distinguent rien. Une EXPRESSION
     de plusieurs mots, elle, garde sa valeur même si elle en contient. */
  if (mots.length === 1 && OUTILS.has(sansAccent(t))) return false;
  /* Un mot que Scribe connaît déjà — voir DEJA_SUS. Et une apostrophe est le
     signe d'un morceau de français découpé (« J'ai », « Quelqu'un ») : ça ne
     s'apprend pas, ça se sait. */
  if (mots.length === 1 && (DEJA_SUS.has(sansAccent(t)) || /['']/.test(t))) return false;
  return true;
}

/* ── CE QU'IL DIT, LUI : LE CORPUS DES FORMULATIONS ──────────────────────── */

/** Toutes les formes qui déclenchent une réponse — donc tout ce qu'il a écrit
    en pensant « voilà comment les gens le disent ici ». */
export function formulations(): string[] {
  const tout: string[] = [];
  for (const e of REPERTOIRE) tout.push(...(e.formes || []));
  for (const n of NOUVELLES) tout.push(...(n.formes || []));
  for (const formes of Object.values(FORMES_NEUVES)) tout.push(...formes);
  for (const formes of Object.values(DE_LAMINE)) tout.push(...formes);
  return tout;
}

/** Les mots des phrases ENREGISTRÉES — ce que sa règle appelle « les phrases
    enregistrées ». Un mot corrigé qui s'y trouve a déjà un filet. */
export function motsDejaEnregistres(): Set<string> {
  const dedans = new Set<string>();
  const poser = (t: string) => { for (const m of motsDe(t)) dedans.add(sansAccent(m)); };
  for (const e of REPERTOIRE) { poser(e.wolof); (e.formes || []).forEach(poser); }
  for (const n of NOUVELLES) { poser(n.wolof); (n.formes || []).forEach(poser); }
  for (const formes of Object.values(FORMES_NEUVES)) formes.forEach(poser);
  for (const formes of Object.values(DE_LAMINE)) formes.forEach(poser);
  return dedans;
}

/** Les mots de l'argent et des nombres. Courts, peu nombreux, et ce sont les
    seuls dont une erreur se PAIE.

    DEUX ÉCONOMIES, parce qu'il n'y a que cent places :

      — LE « i » DE LIAISON NE COMPTE PAS DOUBLE. « ñaar » et « ñaari » sont le
        même mot, à une liaison près ; on ne garde que la forme nue.
      — LES COMPOSÉS NON PLUS. « juróom-benn-fukk » est fait de mots déjà
        donnés ; le donner en entier dépenserait une place pour rien. On garde
        les composés seulement si l'un de leurs morceaux manque.

    Et « fan wer » est l'exception qui justifie la règle : deux mots, et il ne
    veut rien dire coupé en deux. On le donne entier. */
export function motsDArgent(): string[] {
  /* On garde la VRAIE orthographe, accents compris — c'est elle qu'on envoie.
     Ma première version renvoyait la clé sans accent : « teemeer » au lieu de
     « téeméer ». On aurait appris au moteur à mal l'écrire. */
  const vus = new Map<string, { mot: string; fois: number }>();
  for (const n of NOMBRES) {
    for (const m of motsDe(n.wolof)) {
      if (!utilisable(m)) continue;
      const cle = sansAccent(m);
      const vu = vus.get(cle);
      if (vu) { vu.fois += 1; if (aPlusDAccents(m, vu.mot)) vu.mot = m; }
      else vus.set(cle, { mot: m, fois: 1 });
    }
  }
  const nus = new Set([...vus.keys()].filter((c) => !c.endsWith("i") || !vus.has(c.slice(0, -1))));
  const garde = (cle: string) => {
    /* La liaison : « naari » tombe si « naar » est là. */
    if (cle.endsWith("i") && vus.has(cle.slice(0, -1))) return false;
    /* Le composé : il tombe si tous ses morceaux sont là. */
    if (cle.includes("-")) {
      const morceaux = cle.split("-");
      if (morceaux.every((m) => nus.has(m) || nus.has(m + "i"))) return false;
    }
    return true;
  };
  const seuls = [...vus.entries()]
    .filter(([cle]) => garde(cle))
    .sort((a, b) => b[1].fois - a[1].fois)
    .map(([, v]) => v.mot);
  return ["fan wer", "dërëm", ...seuls];
}

/* ── LA LISTE, DANS SON ORDRE ────────────────────────────────────────────── */

/**
 * Les cent mots à donner à Scribe, dans l'ordre de sa règle.
 *
 * `corriges` vient de `motsCorriges()` : ce que les locuteurs ont corrigé
 * dans la façon de dire de BIA, le plus souvent corrigé en tête.
 */
export function motsAEntendre(corriges: MotCorrige[] = [], max = MAX_TERMES): Terme[] {
  const sortie: Terme[] = [];
  const deja = new Set<string>();
  const poser = (terme: string, source: Source, fois?: number) => {
    const t = terme.trim();
    if (sortie.length >= max) return;
    if (!utilisable(t)) return;
    const cle = sansAccent(t);
    if (deja.has(cle)) return;
    deja.add(cle);
    sortie.push({ terme: t, source, ...(fois ? { fois } : {}) });
  };

  const enregistres = motsDejaEnregistres();
  /* ── « SI SON ÉQUIVALENT N'EXISTE PAS SUR LES PHRASES ENREGISTRÉES » ───

     Sa règle, et il faut la lire au mot : l'équivalent, c'est le mot QUI
     PORTE LE SENS. Ma première version exigeait que TOUS les mots de la
     correction soient absents — « sëriñ bi » était donc déclaré « déjà
     connu » parce que « bi » l'est. Un article suffisait à disqualifier le
     mot qu'il a corrigé. La règle ne se déclenchait presque jamais.

     On ne regarde donc que les mots PLEINS — ceux qui ne sont pas des
     outils grammaticaux. Si l'un d'eux manque aux phrases enregistrées, la
     correction est irremplaçable : rien d'autre ne la rattrapera. */
  const absent = (juste: string) => {
    const pleins = motsDe(juste).filter((m) => !OUTILS.has(sansAccent(m)));
    if (!pleins.length) return false;   // que des outils : rien à apprendre
    return pleins.some((m) => !enregistres.has(sansAccent(m)));
  };

  /* 1 et 2 — SA RÈGLE. Les corrigés absents d'abord, les autres ensuite. */
  const corrigesUtiles = corriges.filter((c) => c.juste && utilisable(c.juste));
  for (const c of corrigesUtiles.filter((c) => absent(c.juste))) poser(c.juste, "corrigé-absent", c.fois);
  for (const c of corrigesUtiles.filter((c) => !absent(c.juste))) poser(c.juste, "corrigé", c.fois);

  /* 3 — Ses noms propres. Scribe ne les a jamais vus, et ils reviennent dans
     toutes ses phrases : ce sont les places les mieux dépensées. */
  for (const m of LES_SIENS) poser(m, "sien");

  /* 4 — L'argent. Une erreur ici se paie, littéralement. */
  for (const m of motsDArgent()) poser(m, "argent");

  /* 4 et 5 — Les mots distinctifs de SES formulations, les plus employés
     d'abord : un mot qui revient dans dix de ses formes couvre dix façons de
     lui parler pour une seule place. */
  const compte = new Map<string, { mot: string; fois: number }>();
  for (const f of formulations()) {
    for (const m of motsDe(f)) {
      if (!utilisable(m)) continue;
      const cle = sansAccent(m);
      const vu = compte.get(cle);
      if (vu) vu.fois += 1;
      else compte.set(cle, { mot: orthographeJuste(m), fois: 1 });
    }
  }
  const classes = [...compte.values()].sort((a, b) => b.fois - a.fois || a.mot.localeCompare(b.mot));
  for (const { mot, fois } of classes) poser(mot, fois > 1 ? "sien" : "fréquent", fois);

  return sortie;
}

/** Ce qu'on envoie vraiment à Scribe : des chaînes, rien de plus. */
export function pourScribe(corriges: MotCorrige[] = [], max = MAX_TERMES): string[] {
  return motsAEntendre(corriges, max).map((t) => t.terme);
}
