/* ── SA MÉMOIRE, CELLE QUI NE S'EFFACE PAS ─────────────────────────────────

   Lamine, le 15 septembre 2026 : « il faut que BIA ait une mémoire, une vraie
   mémoire. Une mémoire avec beaucoup de persistance qui va lui permettre de
   se rappeler de tout ce qu'on lui a dit il y a quelques jours, il y a une
   semaine, il y a un mois. »

   ── CE QU'ELLE AVAIT, ET POURQUOI CE N'ÉTAIT PAS UNE MÉMOIRE ───────────────

   Les douze derniers échanges et un résumé, gardés DANS LE NAVIGATEUR de son
   téléphone. Donc : la conversation d'hier, oui ; celle de la semaine
   dernière, non. Et le jour où il change d'appareil, où il vide les données
   du site, ou simplement où iOS fait le ménage dans une application installée
   qu'on n'a pas ouverte depuis trois semaines — tout part.

   ── CE QU'ON A CHOISI, ET CE QU'ON A ÉCARTÉ ────────────────────────────────

   Je lui avais d'abord proposé de garder des FICHES : les conclusions plutôt
   que la matière. Moins cher, et il a eu raison de refuser. Une conclusion
   qu'on n'a pas pensé à tirer sur le moment est perdue pour toujours : dans un
   mois il demandera le nom du type du Plateau qui vendait des moutons, et
   aucune fiche n'aurait pensé à le noter.

   ON GARDE DONC TOUT, ET ON NE RESSORT QUE CE QUE LA QUESTION APPELLE. Le prix
   ne se paie pas sur ce qu'on garde — un mois de conversation, c'est trois
   fois rien pour Supabase — mais sur ce qu'on RELIT à chaque question. D'où
   une recherche qui rend quelques passages, pas un mois de bavardage : une
   consigne noyée coûte cher en jetons ET dilue son attention.

   ── LE POINT QUI DÉCIDE DE TOUT : ON CHERCHE SUR CE QUE ÇA SONNE ───────────

   Une recherche ordinaire ne retrouverait rien ici. Le moteur d'écoute écrit
   « keur » un jour et « ker » le lendemain pour le même mot : chercher des
   lettres dans du wolof transcrit à l'oreille, c'est chercher un mot qui ne
   s'écrit jamais deux fois pareil.

   On range donc chaque souvenir avec sa forme sonnée — la même sonne() qui
   fait déjà marcher le répertoire à la voix — et c'est sur elle qu'on cherche.
   Le texte rendu, lui, reste EXACTEMENT ce qu'il a dit. C'est un avantage
   qu'on a par accident et qui vaut cher : sans lui, une mémoire de
   conversations en wolof ne se relit pas.

   ── ET ELLE NE CITE QUE CE QUI A ÉTÉ DIT ───────────────────────────────────

   Ce qui remonte d'ici est du texte exact, avec sa date et son auteur. Pas un
   résumé, pas une reconstitution. Une mémoire qui invente est pire que pas de
   mémoire : c'est faux, c'est permanent, et c'est dit avec assurance.       */

import { lexiqueConfig } from "@/lib/lexique";
import { sonne } from "@/lib/normaliser";

const TABLE = process.env.SUPABASE_TABLE_SOUVENIRS || "khalam_souvenirs";

export const souvenirsActifs = () => Boolean(lexiqueConfig.url && lexiqueConfig.cle);

/* ── CE QUI SE VOIT, ET POURQUOI IL LE FAUT ─────────────────────────────────

   Le 15 septembre 2026, j'ai livré sa mémoire et je n'ai posé AUCUN compteur.
   Deux heures plus tard, en lui confirmant que tout était en ligne, j'ai dû
   admettre que je ne pouvais pas lui dire si elle écrivait quoi que ce soit.

   C'est la faute que ce projet a déjà payée deux fois : ses leçons qui
   n'arrivaient pas au rangement, puis ses leçons qui n'en ressortaient pas —
   les deux introuvables tant que rien ne les regardait. Une chose qu'on ne
   mesure pas est une chose dont on discute au lieu de la savoir. */
let compte = { gardes: 0, refuses: 0, cherches: 0, retrouves: 0, pannes: 0, dernierMotif: "" };
export function resumeSouvenirs() {
  if (!souvenirsActifs()) return null;
  return {
    ...compte,
    /* La ligne qu'on lit en premier : sur les questions où on a cherché,
       combien ont ramené quelque chose. Zéro sur vingt dirait que la
       recherche ne trouve rien — et ce n'est pas la même panne que « rien
       n'est écrit ». */
    part_qui_retrouve: compte.cherches ? Math.round((compte.retrouves / compte.cherches) * 100) : null,
  };
}

function entetes(type?: string) {
  return {
    apikey: lexiqueConfig.cle,
    Authorization: `Bearer ${lexiqueConfig.cle}`,
    ...(type ? { "content-type": type } : {}),
  };
}

export type Souvenir = {
  id?: number;
  quand: string;
  qui: "personne" | "bia";
  texte: string;
};

/* Un tour de parole fait deux lignes : la sienne et la réponse. On les écrit
   ensemble, en un seul appel. */
export type Echange = {
  personne: string;
  dit: string;
  repondu: string;
  langue?: string | null;
};

/** Au-delà, on coupe : une dictée de dix minutes n'a pas à peser dans une
    recherche, et le début porte déjà le sujet. */
const SIGNES_AU_PLUS = 2000;

/* ── CE QU'ON REFUSE D'ÉCRIRE ───────────────────────────────────────────────

   Un souvenir vide n'est pas un souvenir, et une personne sans nom range
   les phrases de tout le monde au même endroit — c'est l'erreur qu'on a déjà
   réparée une fois pour les profils : un téléphone se prête, une personne
   non. On préfère ne rien garder que tout mélanger. */
export function ceQuiEmpeche(e: Echange): string | null {
  if (!String(e.personne || "").trim()) return "aucune personne — on ne sait pas à qui c'était";
  if (!String(e.dit || "").trim() && !String(e.repondu || "").trim()) return "rien n'a été dit";
  return null;
}

function ligne(personne: string, qui: "personne" | "bia", texte: string, langue?: string | null) {
  const propre = String(texte || "").trim().slice(0, SIGNES_AU_PLUS);
  return {
    application: lexiqueConfig.application,
    personne: String(personne).slice(0, 80),
    qui,
    texte: propre,
    langue: langue || null,
    sonne: sonne(propre),
  };
}

/**
 * Garder un tour de parole.
 *
 * NE FAIT JAMAIS ATTENDRE LA RÉPONSE : l'appelant lance ceci sans l'attendre,
 * une fois qu'il a déjà rendu la main. Un souvenir perdu coûte un souvenir ;
 * une seconde d'attente se paie à chaque phrase de chaque journée.
 */
export async function garder(e: Echange): Promise<void> {
  if (!souvenirsActifs()) return;
  if (ceQuiEmpeche(e)) { compte.refuses++; return; }
  const lignes = [
    String(e.dit || "").trim() ? ligne(e.personne, "personne", e.dit, e.langue) : null,
    String(e.repondu || "").trim() ? ligne(e.personne, "bia", e.repondu, e.langue) : null,
  ].filter(Boolean);
  if (!lignes.length) return;
  const r = await fetch(`${lexiqueConfig.url}/rest/v1/${TABLE}`, {
    method: "POST",
    headers: { ...entetes("application/json"), Prefer: "return=minimal" },
    body: JSON.stringify(lignes),
  });
  if (!r.ok) {
    compte.pannes++;
    compte.dernierMotif = `écriture refusée (${r.status}) : ${(await r.text()).slice(0, 120)}`;
    return;
  }
  compte.gardes += lignes.length;
}

/* ── COMBIEN IL Y EN A VRAIMENT, DANS LE RANGEMENT ──────────────────────────

   Lamine, le 18 septembre 2026 à 23 h, capture à l'appui : « Souvenirs
   gardés : 0 ». Une heure plus tôt, la même page disait 74.

   RIEN N'ÉTAIT PERDU, ET C'ÉTAIT MA FAUTE QUAND MÊME. `compte.gardes` est un
   compteur de mémoire vive : il compte ce qui a été écrit DEPUIS LE RÉVEIL du
   serveur, et il repart à zéro à chaque redéploiement — c'est-à-dire à chaque
   fois que Lamine pousse. Je l'avais posé dans le bloc « Ce que tu lui as
   appris », entre trois nombres qui, eux, ne repartent JAMAIS, sans rien
   écrire de la différence.

   Lue par celui qui a construit cette mémoire, cette ligne dit une seule
   chose : « ton travail a disparu ». Un chiffre juste, présenté de travers,
   fait plus de dégâts qu'un chiffre absent.

   On va donc chercher le VRAI nombre, celui de la table. Supabase le rend
   sans transférer une seule ligne : une requête de tête, et il répond dans
   l'en-tête `content-range`.

   `null` VEUT DIRE « JE N'AI PAS PU COMPTER », et surtout pas zéro. C'est
   exactement la confusion qu'on vient de payer. */
export async function combienDeSouvenirs(): Promise<number | null> {
  if (!souvenirsActifs()) return null;
  try {
    const r = await fetch(`${lexiqueConfig.url}/rest/v1/${TABLE}?select=id`, {
      method: "HEAD",
      headers: { ...entetes(), Prefer: "count=exact", Range: "0-0" },
    });
    if (!r.ok) return null;
    /* « 0-0/1234 » — ce qui nous intéresse est après la barre. */
    const plage = r.headers.get("content-range") || "";
    const total = Number(plage.split("/")[1]);
    return Number.isFinite(total) ? total : null;
  } catch { return null; }
}

/* ── LES MOTS SUR LESQUELS ON CHERCHE ───────────────────────────────────────

   On enlève les mots qui reviennent dans toutes les phrases : ils ne
   distinguent rien et, mis dans la recherche, ils ramèneraient la moitié du
   mois. Ce qui reste, ce sont les mots qui portent la question.

   LA LISTE EST COURTE ET FRANÇAISE EXPRÈS. Je n'écris pas de wolof de ma
   main ; les mots-outils wolof qui mériteraient d'y être, c'est à Lamine de
   les dicter. En attendant, un mot-outil wolof de trop ne casse rien : il
   ramène quelques passages de plus, et le classement les met derrière. */
const MOTS_QUI_NE_DISENT_RIEN = new Set([
  "le", "la", "les", "un", "une", "des", "de", "du", "au", "aux", "et", "ou",
  "que", "qui", "quoi", "dont", "ce", "cette", "ces", "mon", "ma", "mes",
  "ton", "ta", "tes", "son", "sa", "ses", "je", "tu", "il", "elle", "on",
  "nous", "vous", "ils", "elles", "me", "te", "se", "moi", "toi", "lui",
  "est", "sont", "etait", "ete", "suis", "es", "avoir", "ai", "as", "a",
  "avait", "pas", "ne", "plus", "pour", "dans", "sur", "avec", "en", "y",
  "tout", "tous", "toute", "toutes", "bien", "tres", "comme", "si", "quand",
  "dit", "dire", "fait", "faire", "peux", "peut", "veux", "veut", "rappelle",
  "souviens", "souvenir", "parle", "parler",
]);

/** Deux lettres ne cherchent rien d'utile ; elles ramènent tout. */
const LETTRES_AU_MOINS = 3;

/**
 * La requête à envoyer à Postgres, ou null s'il ne reste rien à chercher.
 *
 * Les mots sont joints par « | » — OU, et non ET : on préfère retrouver trop
 * et laisser le classement trancher, plutôt que d'exiger que tous les mots
 * soient présents et ne rien retrouver du tout.
 *
 * Tout est passé par sonne(), donc il ne reste que des lettres et des
 * chiffres. C'est ce qui rend l'envoi sûr : rien d'autre ne peut y entrer.
 */
export function motsDeLaQuestion(question: string, combien = 8): string | null {
  const mots = sonne(question)
    .split(" ")
    .filter((m) => m.length >= LETTRES_AU_MOINS && !MOTS_QUI_NE_DISENT_RIEN.has(m));
  /* Les plus longs d'abord : ce sont eux qui portent le sens. « moutons »
     distingue, « avait » non. */
  const choisis = [...new Set(mots)].sort((a, b) => b.length - a.length).slice(0, combien);
  return choisis.length ? choisis.join(" | ") : null;
}

/**
 * Ce que la question va chercher dans le passé. Rend une liste vide plutôt
 * que d'échouer : une mémoire qui ne répond pas ne doit pas empêcher BIA de
 * parler.
 */
export async function retrouver(
  personne: string, question: string, combien = 6,
): Promise<Souvenir[]> {
  if (!souvenirsActifs() || !String(personne || "").trim()) return [];
  const mots = motsDeLaQuestion(question);
  if (!mots) return [];
  compte.cherches++;
  try {
    const r = await fetch(`${lexiqueConfig.url}/rest/v1/rpc/chercher_souvenirs`, {
      method: "POST",
      headers: entetes("application/json"),
      body: JSON.stringify({
        p_application: lexiqueConfig.application,
        p_personne: personne,
        p_mots: mots,
        p_combien: combien,
      }),
      cache: "no-store",
    });
    if (!r.ok) {
      compte.pannes++;
      compte.dernierMotif = `recherche refusée (${r.status}) : ${(await r.text()).slice(0, 120)}`;
      return [];
    }
    const lignes = await r.json() as Souvenir[];
    if (lignes.length) compte.retrouves++;
    /* Rendus du plus ancien au plus récent : une conversation se lit dans
       l'ordre, même quand on l'a retrouvée par pertinence. */
    return lignes.sort((a, b) => String(a.quand).localeCompare(String(b.quand)));
  } catch (err) {
    compte.pannes++;
    compte.dernierMotif = String((err as Error).message || "").slice(0, 120);
    return [];
  }
}

/* ── CE QU'ELLE EN FAIT ─────────────────────────────────────────────────────

   Des citations datées, pas un récit. La différence n'est pas de style : un
   récit, le modèle le reformule, et une reformulation devient un souvenir
   faux au tour suivant. Une citation datée, il la cite.

   ET LA CONSIGNE LUI INTERDIT D'INVENTER LE RESTE. C'est le seul garde-fou
   qui compte ici : une mémoire qui comble les trous est pire que pas de
   mémoire du tout. */
export function consigneDesSouvenirs(souvenirs: Souvenir[], maintenant = Date.now()): string {
  if (!souvenirs.length) return "";
  const lignes = souvenirs.map((s) => {
    const jours = Math.floor((maintenant - Date.parse(s.quand)) / 86_400_000);
    const quand = jours <= 0 ? "aujourd'hui"
      : jours === 1 ? "hier"
        : jours < 7 ? `il y a ${jours} jours`
          : jours < 14 ? "la semaine dernière"
            /* On bascule en mois à quatre semaines : « il y a 8 semaines » ne
               se dit pas, et lui a parlé de « il y a un mois ». */
            : jours < 28 ? `il y a ${Math.round(jours / 7)} semaines`
              : `il y a ${Math.round(jours / 30)} mois`;
    return `- ${quand}, ${s.qui === "bia" ? "TU as dit" : "il t'a dit"} : « ${s.texte} »`;
  });
  return [
    "",
    "CE QUE TU TE RAPPELLES DE VOS CONVERSATIONS PASSÉES.",
    "Ces phrases ont vraiment été dites, aux dates indiquées. Tu peux t'y",
    "référer naturellement, comme quelqu'un qui se souvient — sans annoncer",
    "que tu consultes quoi que ce soit.",
    "",
    "N'INVENTE RIEN AUTOUR. Si tu ne te rappelles pas d'un détail, dis-le",
    "simplement : « je me rappelle que tu m'as parlé de ça, mais pas le nom ».",
    "Un souvenir inventé est pire que pas de souvenir — il est faux, il est",
    "définitif, et il est dit avec assurance.",
    ...lignes,
    "",
  ].join("\n");
}
