/* ── LES RAPPELS DE MÉDICAMENTS — CE QUE LA VOIX DIT, ET CE QU'ON EN COMPREND
     ────────────────────────────────────────────────────────────────────────

   Lamine, le 24 octobre 2026 : cinq services, dont « rappels de médicaments :
   création à la voix (« rappelle-moi mon médicament à 8 h et 20 h »), rappel
   qui sonne même BIA fermée, liste et suppression à la voix ».

   CE FICHIER NE FAIT QUE COMPRENDRE ET CALCULER. Il ne lit rien, n'écrit
   rien, n'envoie rien : pas un seul import, pour qu'une épreuve puisse le
   charger seul et pour qu'il ne puisse jamais toucher Supabase par accident.
   Le rangement est dans lib/rappels-depot.ts, l'envoi dans lib/push-web.ts.

   ── POURQUOI DAKAR EST SIMPLE, ET POURQUOI JE LE DIS QUAND MÊME ───────────

   Africa/Dakar, c'est UTC+0 toute l'année, sans heure d'été. « 8 h » est donc
   8 h UTC, et aucune bascule de printemps ne viendra faire sonner son
   médicament à 7 h. C'est vrai AUJOURD'HUI et pour ce pays ; `DECALAGE_MIN`
   le rend réglable par variable Render si BIA sort du Sénégal un jour, au
   lieu de laisser une hypothèse tacite dans quatre fichiers.

   ── LA LEÇON DES FRONTIÈRES DE MOTS, DÉJÀ PAYÉE ───────────────────────────

   `\b` ne marche pas contre une lettre accentuée : /\bmédicament\b/ échoue
   sur « médicament ». On borne donc avec les classes Unicode, comme dans
   lib/orientation.ts. */

/** Décalage de l'heure dite par rapport à UTC, en minutes. Dakar = 0. */
export const DECALAGE_MIN = (() => {
  const n = Number(process.env.BIA_RAPPELS_DECALAGE_MIN);
  return Number.isFinite(n) && n >= -840 && n <= 840 ? Math.round(n) : 0;
})();

export type Rappel = {
  id: string;
  /** Ce qu'on lui rappelle, avec SES mots. « ton médicament » par défaut. */
  quoi: string;
  /** Les heures dites, en « HH:MM », triées, uniques. */
  heures: string[];
  cree: string;
  /** Pour chaque heure, le jour où elle a déjà sonné : « 2026-10-24 ». */
  sonne: Record<string, string>;
};

export type Intention = {
  action: "ajoute" | "liste" | "supprime" | null;
  quoi: string;
  heures: string[];
};

const FIN = "(?![\\p{L}\\p{N}])";
const DEBUT = "(^|[^\\p{L}\\p{N}])";
const sansAccent = (t: string) =>
  String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/* Les nombres dits en lettres. On s'arrête à vingt-trois : au-delà, une heure
   n'existe pas, et un chiffre écrit fait le reste. */
const EN_LETTRES: Record<string, number> = {
  zero: 0, une: 1, un: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6,
  sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, treize: 13,
  quatorze: 14, quinze: 15, seize: 16, "dix-sept": 17, "dix sept": 17,
  "dix-huit": 18, "dix huit": 18, "dix-neuf": 19, "dix neuf": 19,
  vingt: 20, "vingt et une": 21, "vingt-et-une": 21, "vingt deux": 22,
  "vingt-deux": 22, "vingt trois": 23, "vingt-trois": 23,
};

const hhmm = (h: number, m = 0) =>
  `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

/** Les heures qu'une phrase contient, dans l'ordre et sans doublon. */
export function heuresDites(phrase: string): string[] {
  const t = sansAccent(phrase);
  const vues: string[] = [];
  const poser = (h: number, m: number) => {
    if (!Number.isInteger(h) || h < 0 || h > 23 || m < 0 || m > 59) return;
    const s = hhmm(h, m);
    if (!vues.includes(s)) vues.push(s);
  };

  /* 1. Les chiffres : « 8h », « 8 h 30 », « 20:00 », « 8 heures et demie ».
        Le « h » ou « heure » est EXIGÉ — sans lui, « mes 3 cachets » et
        « 500 mg » deviendraient des heures. */
  const chiffres = /(\d{1,2})\s*(?:heures?|h|:)\s*(\d{1,2})?(?:\s*(?:min|minutes?))?(\s*(?:et\s+)?(?:demie?|quart))?/g;
  for (const m of t.matchAll(chiffres)) {
    let min = m[2] ? Number(m[2]) : 0;
    if (m[3]?.includes("demi")) min = 30;
    else if (m[3]?.includes("quart")) min = 15;
    poser(Number(m[1]), min);
  }

  /* 2. Les lettres : « à huit heures », « à vingt heures trente ». */
  const mots = Object.keys(EN_LETTRES).sort((a, b) => b.length - a.length).join("|");
  const enLettres = new RegExp(`${DEBUT}(${mots})\\s*(?:h|heures?)${FIN}`, "gu");
  for (const m of t.matchAll(enLettres)) poser(EN_LETTRES[m[2]], 0);

  /* 3. Les moments de la journée, en français et en wolof. Ils ne s'ajoutent
        que si AUCUNE heure chiffrée n'a été dite : « à 8 h le matin » ne doit
        pas faire deux sonneries. */
  if (!vues.length) {
    const moments: Array<[RegExp, number]> = [
      [/midi/u, 12], [/minuit/u, 0],
      [/\ble matin\b|\bau matin\b|ci suba|suba si|suba ba/u, 8],
      [/\bmidi\b|\bdans la journee\b/u, 12],
      [/\bl apres midi\b|\bapres midi\b|ngoon/u, 16],
      [/\ble soir\b|\bau soir\b|ngoon si|guddi/u, 20],
      [/\bla nuit\b|\bavant de dormir\b|\bau coucher\b/u, 21],
    ];
    for (const [re, h] of moments) if (re.test(t)) poser(h, 0);
  }
  return vues.sort();
}

/* Les mots qui disent « rappel », et ceux qui disent quoi en faire. */
const DIT_RAPPEL = new RegExp(
  `${DEBUT}(rappelle?[- ]moi|rappelle|rappel|rappels|souviens[- ]toi de me|previens[- ]moi|fais[- ]moi penser|pense a me|alarme|sonnerie)${FIN}`, "u");
const DIT_LISTE = new RegExp(
  `${DEBUT}(quels?|liste|listes|lis|rappelle[- ]moi mes rappels|mes rappels|dis[- ]moi mes rappels|c est quoi mes rappels|combien de rappels)${FIN}`, "u");
const DIT_SUPPRIME = new RegExp(
  `${DEBUT}(supprime|enleve|annule|arrete|efface|retire|oublie|plus besoin|stop)${FIN}`, "u");
const DIT_MEDICAMENT = new RegExp(
  `${DEBUT}(medicament|medicaments|cachet|cachets|comprime|comprimes|gelule|gelules|traitement|sirop|piqure|insuline|garab|garab yi|xorom)${FIN}`, "u");

/* ── « DANS DEUX MINUTES » ────────────────────────────────────────────────

   Lamine demande de tester avec un rappel à deux minutes. Un délai relatif
   n'est donc pas un cas de bord : c'est la phrase du test. Il est lu AVANT
   les heures absolues et retiré de la phrase, sinon « dans 2 heures »
   deviendrait « à 2 h du matin ». */
const DELAI = /\bdans\s+(?:(\d{1,3})|(une?|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|quinze|vingt|trente))\s*(min|mn|minutes?|heures?|h)\b/u;

/** Le délai relatif d'une phrase, en minutes, et la phrase sans ce délai. */
export function delaiDit(phrase: string): { minutes: number | null; reste: string } {
  const t = sansAccent(phrase);
  const m = t.match(DELAI);
  if (!m) return { minutes: null, reste: phrase };
  const n = m[1] ? Number(m[1]) : (EN_LETTRES[m[2]] ?? (m[2] === "quinze" ? 15 : m[2] === "trente" ? 30 : NaN));
  if (!Number.isFinite(n) || n <= 0) return { minutes: null, reste: phrase };
  const minutes = /^h|heure/.test(m[3]) ? n * 60 : n;
  /* Borné : au-delà d'une journée ce n'est plus un délai, c'est une date, et
     ce fichier ne sait pas poser de dates. */
  if (minutes > 1440) return { minutes: null, reste: phrase };
  /* On retire le délai de la MÊME position dans la phrase d'origine : les
     deux textes ont la même longueur, sansAccent ne décale aucun caractère
     (NFD puis suppression des seuls diacritiques combinants… qui, eux,
     décalent). On repasse donc par un remplacement sur le texte accentué. */
  const reste = phrase.replace(new RegExp(DELAI.source, "iu"), " ");
  return { minutes, reste };
}

/* Les mots qui ferment un groupe : après eux, ce n'est plus le nom de la
   chose à rappeler, c'est l'heure ou la suite de la phrase. */
const ARRET = new RegExp(
  `^(?:a|au|aux|vers|pour|chaque|tous|toutes|le|la|les|du|de|des|et|ou|dans|avant|apres|quand|si|matin|soir|midi|minuit|nuit|journee|heure|heures|h|min|minute|minutes|jour|jours|fois|prendre|boire)$`, "u");
const PAS_UN_NOM = new RegExp(`^(?:rappel|rappels|alarme|alarmes|sonnerie|chose|truc|ca|cela)$`, "u");

/** Ce qu'on lui rappelle. Jamais inventé : ses mots, nettoyés. */
export function quoiRappeler(phrase: string): string {
  const brut = String(phrase || "");
  const sansDelai = delaiDit(brut).reste;
  /* Tous les groupes qui suivent un déterminant, dans l'ordre. On garde le
     PREMIER qui porte un vrai nom : « supprime le rappel de mon médicament »
     en donne deux, et « rappel » n'en est pas un. */
  const groupes = [...sansDelai.matchAll(/\b(?:mon|ma|mes|le|la|les|du|de\s+la|des)\s+((?:[\p{L}\p{N}'’-]+\s*){1,5})/giu)];
  for (const g of groupes) {
    const mots: string[] = [];
    for (const mot of (g[1] || "").trim().split(/\s+/)) {
      if (ARRET.test(sansAccent(mot))) break;
      if (/^\d/.test(mot)) break;
      mots.push(mot);
    }
    const quoi = mots.join(" ").trim();
    if (quoi && !PAS_UN_NOM.test(sansAccent(quoi))) return quoi.slice(0, 60);
  }
  return DIT_MEDICAMENT.test(sansAccent(brut)) ? "ton médicament" : "";
}

/** Ce que la phrase demande. `action: null` = ce n'est pas un rappel.
    `maintenant` sert aux délais relatifs : « dans deux minutes ». */
export function intentionRappel(phrase: string, maintenant = Date.now()): Intention {
  const brut = String(phrase || "");
  const t = sansAccent(brut);
  const { minutes, reste } = delaiDit(brut);
  const heures = minutes === null
    ? heuresDites(brut)
    : [hhmm(
        Math.floor(((minutesLocales(maintenant) + minutes) % 1440) / 60),
        ((minutesLocales(maintenant) + minutes) % 1440) % 60,
      )];
  const quoi = quoiRappeler(reste);
  const parleDeRappel = DIT_RAPPEL.test(t) || /\brappels?\b/u.test(t);

  /* On lit la suppression AVANT la liste : « supprime mes rappels » contient
     les deux, et c'est bien une suppression. */
  if (parleDeRappel && DIT_SUPPRIME.test(t)) return { action: "supprime", quoi, heures: heuresDites(brut) };
  if (/\bmes rappels\b|\bquels rappels\b|\bmes alarmes\b/u.test(t) ||
      (parleDeRappel && DIT_LISTE.test(t) && !heures.length))
    return { action: "liste", quoi: "", heures: [] };
  /* Ajouter exige une heure. « rappelle-moi mon médicament » sans heure n'est
     pas un rappel qu'on peut poser : c'est une question à lui reposer. */
  if ((parleDeRappel || DIT_MEDICAMENT.test(t)) && heures.length)
    return { action: "ajoute", quoi: quoi || "ton médicament", heures };
  if (parleDeRappel && !heures.length) return { action: null, quoi, heures: [] };
  return { action: null, quoi: "", heures: [] };
}

/* ── LE TEMPS, ET LA FENÊTRE DE RETARD ────────────────────────────────────

   Le serveur de BIA dort. Un rappel de 8 h peut donc être lu à 8 h 07, quand
   un réveil extérieur le relève. MIEUX VAUT SONNER EN RETARD QUE PAS DU
   TOUT — mais pas douze heures plus tard, sinon le médicament du matin sonne
   au dîner. Une heure de retard est acceptée, au-delà le créneau est perdu et
   compté comme perdu : un rappel manqué en silence est le pire des deux. */
export const RETARD_MAX_MIN = 60;

/** Le jour local (« 2026-10-24 ») d'un instant. */
export function jourLocal(maintenant: number): string {
  return new Date(maintenant + DECALAGE_MIN * 60000).toISOString().slice(0, 10);
}
/** Les minutes depuis minuit local. */
export function minutesLocales(maintenant: number): number {
  const d = new Date(maintenant + DECALAGE_MIN * 60000);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}
const enMinutes = (hm: string) => {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
};

export type Sonnerie = { rappel: Rappel; heure: string; retard_min: number };

/** Les créneaux à faire sonner maintenant, et ceux qu'on a laissés passer. */
export function sonneriesDues(rappels: Rappel[], maintenant: number): {
  dues: Sonnerie[];
  perdues: Sonnerie[];
} {
  const jour = jourLocal(maintenant), minute = minutesLocales(maintenant);
  const dues: Sonnerie[] = [], perdues: Sonnerie[] = [];
  for (const r of rappels) {
    for (const heure of r.heures || []) {
      if (r.sonne?.[heure] === jour) continue;
      const retard = minute - enMinutes(heure);
      if (retard < 0) continue;
      (retard <= RETARD_MAX_MIN ? dues : perdues).push({ rappel: r, heure, retard_min: retard });
    }
  }
  return { dues, perdues };
}

/** Le prochain instant où ce rappel sonnera, en millisecondes. */
export function prochaineSonnerie(r: Rappel, maintenant: number): number | null {
  const minute = minutesLocales(maintenant);
  const base = maintenant - minute * 60000;
  let meilleur: number | null = null;
  for (const heure of r.heures || []) {
    const m = enMinutes(heure);
    const quand = m > minute ? base + m * 60000 : base + (m + 1440) * 60000;
    if (meilleur === null || quand < meilleur) meilleur = quand;
  }
  return meilleur;
}

/* ── CE QU'ELLE DIT ───────────────────────────────────────────────────────
   Des phrases, pas des listes à puces : elles seront PRONONCÉES. « 08:00 »
   lu à voix haute donne « zéro huit deux points zéro zéro ». */
const heureDite = (hm: string) => {
  const [h, m] = hm.split(":").map(Number);
  if (h === 0 && m === 0) return "minuit";
  if (h === 12 && m === 0) return "midi";
  return m === 0 ? `${h} heures` : m === 30 ? `${h} heures et demie` : `${h} heures ${m}`;
};
export const heureEnMots = heureDite;

export function phraseDesRappels(rappels: Rappel[]): string {
  if (!rappels.length) return "Tu n'as aucun rappel pour l'instant.";
  const lignes = rappels.map((r) => {
    const h = (r.heures || []).map(heureDite);
    const quand = h.length === 1 ? h[0] : h.slice(0, -1).join(", ") + " et " + h.at(-1);
    return `${r.quoi} à ${quand}`;
  });
  return lignes.length === 1
    ? `Un rappel : ${lignes[0]}.`
    : `${lignes.length} rappels : ${lignes.join(" ; ")}.`;
}

/** Ce que la notification affichera. Court : un écran verrouillé est petit. */
export function texteSonnerie(r: Rappel, heure: string): { titre: string; corps: string } {
  return { titre: "BIA — " + heureDite(heure), corps: `C'est l'heure de ${r.quoi}.` };
}

/* Quel rappel une phrase de suppression désigne. On n'efface JAMAIS sur un
   doute : sans désignation claire, on rend la liste et on laisse demander. */
export function rappelsVises(rappels: Rappel[], intention: Intention): Rappel[] {
  const quoi = sansAccent(intention.quoi);
  const parQuoi = quoi
    ? rappels.filter((r) => sansAccent(r.quoi).includes(quoi) || quoi.includes(sansAccent(r.quoi)))
    : [];
  const parHeure = intention.heures.length
    ? rappels.filter((r) => (r.heures || []).some((h) => intention.heures.includes(h)))
    : [];
  if (parQuoi.length && parHeure.length)
    return parQuoi.filter((r) => parHeure.includes(r));
  if (parQuoi.length) return parQuoi;
  if (parHeure.length) return parHeure;
  /* Rien de désigné, et un seul rappel existe : c'est celui-là, sans ambiguïté
     possible. Plusieurs : on ne devine pas. */
  return rappels.length === 1 ? rappels : [];
}

export function identifiant(maintenant = Date.now()): string {
  return maintenant.toString(36) + Math.random().toString(36).slice(2, 8);
}

/** Un rappel propre, borné, à partir d'une intention. Jamais plus de huit
    heures par rappel : au-delà ce n'est plus un médicament, c'est une alarme
    toutes les deux heures, et la notification deviendrait du harcèlement. */
export function construireRappel(i: Intention, maintenant = Date.now()): Rappel | null {
  const heures = [...new Set(i.heures)].sort().slice(0, 8);
  const quoi = (i.quoi || "ton médicament").slice(0, 60);
  if (!heures.length) return null;
  return { id: identifiant(maintenant), quoi, heures, cree: new Date(maintenant).toISOString(), sonne: {} };
}
