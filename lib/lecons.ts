/* ── CE QUE LAMINE LUI APPREND LUI-MÊME ─────────────────────────────────────

   Le 13 septembre 2026 au soir, au retour de sa rencontre avec des partenaires.
   L'un d'eux lui a suggéré l'idée, et il l'a précisée en cinq messages, chacun
   corrigeant ma compréhension du précédent. Je garde ses mots, parce que ce
   sont eux qui commandent la forme de ce fichier :

     « Il faut que BIA puisse être autonome, seulement avec moi, un bon temps
       pour l'enseigner. Je parle wolof et elle répète avec moi, et je lui
       explique le sens en wolof et en français jusqu'à ce qu'elle ait
       compris. Quand elle répète bien, je valide et ça reste dans sa
       mémoire. »

     « Moi uniquement, avec mon compte maître. Les testeurs n'auront pas accès
       à cette partie. »

     « Ce n'est pas elle qui doit dire ça — mais si on lui parle comme ça, je
       dois lui donner les réponses qu'elle doit donner. Au moins quatre à
       cinq réponses. »

     « Je dois lui apprendre au moins DIX manières de dire "peux-tu me tenir
       compagnie". »

     « Je veux lui expliquer tout en français. Ce qu'elle a compris en wolof,
       je vais lui expliquer son équivalent en français — ça doit être à
       côté. »

   ── CE QUE ÇA DONNE, ET POURQUOI C'EST EXACTEMENT ÇA ────────────────────────

   UNE LEÇON = UNE SITUATION. Ce qu'on lui dit, et ce qu'elle répond. Rien
   d'autre. J'avais d'abord cru qu'il fallait deux mémoires — « une façon de
   dire » et « une réponse » — et c'est lui qui a tranché : il n'y en a qu'une,
   et elle a toujours cette forme-là.

   DIX FAÇONS DE LE DIRE, ET C'EST MESURÉ, PAS PRUDENT. Le même soir, une heure
   avant sa démonstration : sur douze façons naturelles de demander « qu'est-ce
   que tu sais faire », CINQ seulement tombaient dans le répertoire. Les sept
   autres partaient chez le modèle, à quatre secondes la question. Dix façons
   écrites de sa main, c'est ce qui fait qu'elle n'a plus à deviner — elle
   reconnaît, ou elle ne reconnaît pas, et elle ne sert jamais la mauvaise
   leçon.

   QUATRE OU CINQ RÉPONSES, PAS UNE. Pour qu'elle ne réponde pas la même chose
   à chaque fois. La rotation existe déjà (voir dejaDitDansLeFil dans
   lib/repertoire.ts) : elle ne ressert pas ce qu'elle vient de dire.

   TOUT EST PAR PAIRES, LE WOLOF ET SON FRANÇAIS CÔTE À CÔTE. C'est sa dernière
   précision, et c'est la plus importante : le français n'est pas une
   traduction de plus, c'est PAR LÀ QU'ELLE COMPREND. Sans lui elle répéterait
   des sons. Et ça lui épargne un double travail — le français qu'il écrit pour
   expliquer EST la réponse française.

   ── OÙ ÇA VIT ───────────────────────────────────────────────────────────────

   Dans un seau Supabase `lecons`, un fichier JSON par leçon. PAS dans le code :
   il doit pouvoir en ajouter cent depuis son téléphone sans jamais pousser.
   Privé — rien là-dedans n'a besoin d'être public, contrairement aux sons.

   Je n'écris JAMAIS de wolof de ma main : ce fichier ne contient pas une
   syllabe de wolof, seulement la forme qui accueillera le sien.             */

import { lexiqueConfig } from "@/lib/lexique";
import { normaliser } from "@/lib/repertoire";

const SEAU = process.env.SUPABASE_BUCKET_LECONS || "lecons";

/** Une ligne, et elle ne va jamais seule : le wolof, et ce que ça veut dire. */
export type Paire = {
  wolof: string;
  francais: string;
};

export type Lecon = {
  /** Le nom du fichier, et la clé des sons qui en sortiront. */
  cle: string;
  /** Comment il l'appelle, en français. « Me tenir compagnie ». */
  titre: string;
  /** Les dix (ou plus) façons dont on peut le lui dire. */
  dit: Paire[];
  /** Les quatre ou cinq réponses qu'elle peut donner. */
  repond: Paire[];
  /** Quand elle a été validée. Sert à savoir ce qui est récent. */
  quand: string;
  /** Combien de fois elle a été retouchée. */
  version: number;
};

export const lecconsActives = () => Boolean(lexiqueConfig.url && lexiqueConfig.cle);

/* ── CE QUI FAIT UNE LEÇON VALABLE ──────────────────────────────────────────

   On refuse en amont plutôt que de ranger quelque chose d'inutilisable. Une
   leçon sans façon de le dire ne se déclenchera jamais ; une leçon sans
   réponse n'a rien à servir ; une paire sans son français trahit sa règle.

   LE MINIMUM N'EST PAS DIX. Il a dit « au moins dix » pour lui-même, et il a
   raison — mais une leçon à trois façons vaut mieux que pas de leçon, et c'est
   à lui de juger, pas au code de l'en empêcher. La page le lui rappelle ; elle
   ne lui interdit rien.                                                     */
export function ceQuiCloche(lecon: Lecon): string[] {
  const griefs: string[] = [];
  if (!lecon.cle.trim()) griefs.push("la leçon n'a pas de clé");
  if (!lecon.titre.trim()) griefs.push("la leçon n'a pas de nom");
  const pleines = (p: Paire[]) => p.filter((x) => x.wolof.trim() || x.francais.trim());
  const dit = pleines(lecon.dit);
  const repond = pleines(lecon.repond);
  if (!dit.length) griefs.push("aucune façon de le lui dire — elle ne se déclenchera jamais");
  if (!repond.length) griefs.push("aucune réponse — elle n'aurait rien à dire");
  /* ── UNE FAÇON DE LE DIRE N'EST PAS UNE PAIRE ──────────────────────────

     J'avais exigé le wolof ET le français sur CHAQUE ligne, des deux côtés.
     C'était appliquer sa règle — « le wolof et son français côte à côte » —
     là où elle ne vaut pas.

     Ses deux premières leçons, écrites le 13 septembre 2026 au soir, l'ont
     montré sans discussion : son tableau « Façons de le dire » a UNE colonne,
     son tableau « Réponses » en a DEUX. Et il a raison. « J'ai soif » et
     « damaa mar » ne sont pas une traduction l'une de l'autre : ce sont deux
     PORTES qui mènent à la même leçon. Exiger la seconde colonne l'aurait
     obligé à traduire vingt déclencheurs pour rien, et aurait refusé ses
     tournures mixtes, qui sont justement les plus vraies.

     Une réponse, elle, garde ses deux colonnes, et c'est non négociable :
     c'est ce que BIA DIT, et elle doit pouvoir le dire dans les deux langues.
     C'est là que « par le français elle comprend » s'applique vraiment. */
  for (const p of dit) {
    if (!p.wolof.trim() && !p.francais.trim()) griefs.push("ce qu'on lui dit : une ligne vide");
  }
  for (const p of repond) {
    if (!p.wolof.trim()) griefs.push("ce qu'elle répond : une ligne sans wolof");
    else if (!p.francais.trim()) {
      griefs.push(`ce qu'elle répond : « ${p.wolof.slice(0, 28)}… » n'a pas son français`);
    }
  }
  return griefs;
}

/** Ce qu'on garde : les lignes vides disparaissent, les espaces aussi. */
export function nettoyer(lecon: Lecon): Lecon {
  const propre = (paires: Paire[]) => paires
    .map((p) => ({ wolof: p.wolof.trim(), francais: p.francais.trim() }))
    .filter((p) => p.wolof || p.francais);
  return {
    ...lecon,
    cle: lecon.cle.trim(),
    titre: lecon.titre.trim(),
    dit: propre(lecon.dit),
    repond: propre(lecon.repond),
  };
}

/* ── LA CLÉ, TIRÉE DU NOM QU'IL DONNE ───────────────────────────────────────

   Elle sert de nom de fichier ET de préfixe aux sons. Donc : pas d'accent, pas
   d'espace, pas de majuscule, rien qui demande à être encodé dans une adresse.
   Et jamais vide — un fichier sans nom écraserait le suivant.                */
export function cleDepuis(titre: string): string {
  const sansAccent = titre.normalize("NFD").replace(/[̀-ͯ]/g, "");
  const propre = sansAccent.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return propre.slice(0, 48) || `lecon-${Date.now().toString(36)}`;
}

function entetes(type?: string) {
  return {
    apikey: lexiqueConfig.cle,
    Authorization: `Bearer ${lexiqueConfig.cle}`,
    ...(type ? { "content-type": type } : {}),
  };
}

/** Toutes les leçons, la plus récente d'abord. */
export async function listerLecons(): Promise<Lecon[]> {
  if (!lecconsActives()) return [];
  const r = await fetch(`${lexiqueConfig.url}/storage/v1/object/list/${SEAU}`, {
    method: "POST",
    headers: entetes("application/json"),
    body: JSON.stringify({ prefix: "", limit: 500, offset: 0, sortBy: { column: "name", order: "asc" } }),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`le seau « ${SEAU} » a refusé (${r.status}) : ${(await r.text()).slice(0, 200)}`);
  const fichiers = await r.json() as Array<{ name?: string }>;
  const noms = fichiers.map((f) => String(f.name || "")).filter((n) => n.endsWith(".json"));

  /* On les lit toutes de front : cinquante leçons, c'est cinquante petits
     fichiers, et les demander l'une après l'autre ferait attendre pour rien. */
  const lues = await Promise.all(noms.map(async (nom) => {
    try {
      const f = await fetch(`${lexiqueConfig.url}/storage/v1/object/${SEAU}/${encodeURIComponent(nom)}`, {
        headers: entetes(), cache: "no-store",
      });
      if (!f.ok) return null;
      return await f.json() as Lecon;
    } catch { return null; }
  }));
  return lues.filter((l): l is Lecon => Boolean(l && l.cle))
    .sort((a, b) => String(b.quand || "").localeCompare(String(a.quand || "")));
}

/** Déposer, ou remplacer. Le nom du fichier EST la clé : réécrire une leçon
    du même nom la remplace, ce qui est exactement ce qu'on veut quand il
    corrige une leçon d'hier. */
export async function deposerLecon(lecon: Lecon): Promise<void> {
  if (!lecconsActives()) throw new Error("Supabase n'est pas configuré sur ce serveur.");
  const corps = JSON.stringify(lecon, null, 2);
  const r = await fetch(`${lexiqueConfig.url}/storage/v1/object/${SEAU}/${encodeURIComponent(lecon.cle)}.json`, {
    method: "POST",
    /* Pas de cache d'un an ici, contrairement aux sons : une leçon est faite
       pour être retouchée. */
    headers: { ...entetes("application/json"), "x-upsert": "true", "cache-control": "no-cache" },
    body: corps,
  });
  if (!r.ok) throw new Error(`le dépôt a été refusé (${r.status}) : ${(await r.text()).slice(0, 200)}`);
  /* Il veut l'essayer tout de suite, pas dans une minute. */
  oublierLeCacheDesLecons();
}

export async function retirerLecon(cle: string): Promise<void> {
  if (!lecconsActives()) throw new Error("Supabase n'est pas configuré sur ce serveur.");
  const r = await fetch(`${lexiqueConfig.url}/storage/v1/object/${SEAU}/${encodeURIComponent(cle)}.json`, {
    method: "DELETE", headers: entetes(),
  });
  if (!r.ok && r.status !== 404) {
    throw new Error(`le retrait a été refusé (${r.status}) : ${(await r.text()).slice(0, 200)}`);
  }
  oublierLeCacheDesLecons();
}

/* ── CE QUE LA LEÇON DEVIENDRA DANS LA CONVERSATION ─────────────────────────

   Rien n'est branché pour l'instant, et c'est voulu : il essaie d'abord le
   geste, on branche ensuite. Mais la forme d'arrivée est déjà connue, parce
   que c'est celle du répertoire — et l'écrire ici évite qu'on invente autre
   chose plus tard.

     — les `dit` deviennent les FORMES qui déclenchent (les deux langues
       ensemble : c'est la même situation, quelle que soit la langue) ;
     — chaque `repond` devient une entrée « cle-1 », « cle-2 »… avec son wolof
       et son français, enregistrée une fois comme les autres ;
     — la rotation est celle qui existe déjà.

   Le prix se lit ici, et il est honnête à dire d'avance : cinq réponses à
   enregistrer dans les deux langues, c'est dix sons, à peu près deux centimes
   chacun.                                                                   */
export const SONS_PAR_REPONSE = 2;
export const CENTIMES_PAR_SON = 2;

/* ── « ESSAIE » : EST-CE QU'ELLE RETROUVE CE QU'ON LUI A APPRIS ? ───────────

   Le bouton dont il ne m'avait pas parlé et qui est nécessaire. Sans lui, on
   se retrouve avec deux cents leçons qu'elle connaît et ne sert jamais, sans
   que rien ne le dise.

   LA COMPARAISON EST FAITE AVEC LA VRAIE NORMALISATION DU RÉPERTOIRE, pas avec
   une copie écrite pour l'occasion. Une épreuve qui se sert d'un double ne
   prouve rien : elle dirait « elle retrouve » là où BIA, elle, ne retrouvera
   pas. C'est pour ça que cette fonction est ici, côté serveur, et que la page
   la lui demande au lieu de refaire le calcul dans le téléphone.

   Et la reconnaissance est EXACTE, volontairement. C'est tout le sens de ses
   dix façons de le dire : quand on a écrit dix tournures de sa main, on n'a
   plus besoin de deviner la onzième — et on ne risque plus de servir la
   mauvaise leçon.                                                          */
export function lecconQuiRepond(phrase: string, lecons: Lecon[]): { lecon: Lecon; forme: string } | null {
  const dit = normaliser(phrase);
  if (!dit) return null;
  for (const lecon of lecons) {
    for (const p of lecon.dit) {
      for (const cote of [p.wolof, p.francais]) {
        if (cote.trim() && normaliser(cote) === dit) return { lecon, forme: cote };
      }
    }
  }
  return null;
}

export function cleDeLaReponse(lecon: Lecon, rang: number): string {
  return `${lecon.cle}-${rang + 1}`;
}

/* ── LES LEÇONS, SOUS LA MAIN, SANS PAYER UN ALLER-RETOUR PAR TOUR ──────────

   Le 15 septembre 2026, en construisant son mode d'interrogation, j'ai
   découvert que lecconQuiRepond() n'était appelé de NULLE PART dans le chemin
   de la parole — seulement par le bouton « Essaie » de la page des leçons.

   Ce n'était pas un oubli : c'est écrit trente lignes plus haut, « rien n'est
   branché pour l'instant, et c'est voulu ». Sauf qu'entre-temps il a écrit des
   leçons, et qu'un report devient un défaut le jour où quelqu'un s'en sert.
   Ses leçons partaient dans le seau et n'en ressortaient jamais. C'est le
   défaut de la semaine dernière retourné : avant elles n'y arrivaient pas ;
   maintenant elles n'en sortent plus.

   ── POURQUOI UN CACHE, ET PAS UN APPEL ─────────────────────────────────────

   Demander le seau à chaque tour, c'est un aller-retour Supabase AVANT qu'elle
   n'ouvre la bouche, sur le chemin qu'on passe nos journées à raccourcir. Et
   les leçons ne changent qu'aux moments où LUI les change.

   On les garde donc en mémoire, une minute. Le premier tour après un
   redéploiement peut manquer une leçon — on préfère ça à une seconde d'attente
   sur tous les autres. Le rafraîchissement se fait EN ARRIÈRE-PLAN : personne
   n'attend jamais après lui, on répond avec ce qu'on a et la liste se met à
   jour pour le tour suivant.

   Et quand il dépose une leçon, le cache est vidé sur-le-champ : il veut
   l'essayer tout de suite après l'avoir écrite, pas dans une minute. */
const FRAICHEUR = 60_000;
let enCache: Lecon[] = [];
let cacheDepuis = 0;
let enTrainDeLire: Promise<void> | null = null;

function rafraichir(): Promise<void> {
  if (enTrainDeLire) return enTrainDeLire;
  enTrainDeLire = listerLecons()
    .then((l) => { enCache = l; cacheDepuis = Date.now(); })
    /* Un seau qui refuse ne doit pas faire tomber la conversation : elle
       répondra comme avant ce cache, par le modèle. */
    .catch(() => { })
    .finally(() => { enTrainDeLire = null; });
  return enTrainDeLire;
}

/** Vide le cache. Appelé au dépôt et au retrait : il essaie tout de suite. */
export function oublierLeCacheDesLecons() { cacheDepuis = 0; enCache = []; }

/**
 * Les leçons telles qu'on les a sous la main, MAINTENANT. N'attend jamais :
 * si elles sont périmées, on rend les anciennes et on relit derrière.
 */
export function leconsSousLaMain(): Lecon[] {
  if (!lecconsActives()) return [];
  if (Date.now() - cacheDepuis > FRAICHEUR) void rafraichir();
  return enCache;
}

/** À appeler au démarrage du serveur pour que le premier tour en profite. */
export function preparerLesLecons(): Promise<void> {
  return lecconsActives() ? rafraichir() : Promise.resolve();
}

/** Ce que cette leçon coûtera à enregistrer, en dollars. Le calcul exact vit
    dans la route du répertoire (il compte les signes) ; ceci est l'ordre de
    grandeur qu'on montre AVANT, pour qu'il n'y ait pas de surprise. */
export function coutApproximatif(lecon: Lecon): number {
  const sons = nettoyer(lecon).repond.length * SONS_PAR_REPONSE;
  return Math.round(sons * CENTIMES_PAR_SON) / 100;
}
