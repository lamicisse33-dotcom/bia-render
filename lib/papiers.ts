import type { Document, Totaux } from "./documents";

/* ── LA BOÎTE À PAPIERS ─────────────────────────────────────────────────────

   Signalé par Lamine le 10 septembre 2026 : « quand elle écrit un message, le
   prochain message le supprime. Il faut que tous ces messages et tous ces
   devis soient stockés, comme une discussion normale, et restent sur le fil. »

   Il avait raison, et c'était pire que ça : un papier n'était gardé NULLE
   PART. Il vivait dans la mémoire de la page. Recharger l'écran, changer de
   service, poser une question de plus — et il disparaissait. Quelqu'un qui
   dicte un devis de quinze lignes le perdait en touchant un bouton.

   POURQUOI UNE BOÎTE À PART, ET PAS SEULEMENT DANS LE FIL. Le fil est rogné :
   passé une trentaine d'échanges, les plus anciens sont résumés puis effacés,
   et c'est ce qui garde BIA rapide. Un papier rangé dans le fil disparaîtrait
   donc avec lui, un jour ou l'autre, sans prévenir. Les papiers ont donc leur
   propre boîte, qui ne se rogne pas — et le fil ne garde qu'un renvoi vers
   eux, pour qu'on les retrouve à leur place dans la conversation.

   UNE BOÎTE PAR PERSONNE, comme le reste : le devis du frère n'a rien à faire
   dans la liste de la sœur. */

export type PapierGarde = {
  id: string;
  /** devis, lettre ou message — ce que le bouton rouvre. */
  sorte: string;
  /** De quoi le reconnaître dans une liste, sans l'ouvrir. */
  titre: string;
  quand: string;
  doc: Document;
  totaux: Totaux | null;
};

export const clePapiers = (id: string) => (id ? `bia-papiers-${id}` : "bia-papiers");

/* Vingt papiers gardés. Au-delà, le plus ancien s'en va : localStorage n'est
   pas infini, et un téléphone plein casse l'application entière — perdre le
   devis d'il y a trois mois est moins grave que ne plus pouvoir en écrire. */
const COMBIEN = 20;

export const nouvelIdPapier = () =>
  `d${Date.now().toString(36)}${Math.floor(Math.random() * 46656).toString(36)}`;

export function chargerPapiers(profil: string): PapierGarde[] {
  try {
    const brut = localStorage.getItem(clePapiers(profil));
    const liste = brut ? (JSON.parse(brut) as PapierGarde[]) : [];
    return Array.isArray(liste) ? liste : [];
  } catch { return []; }
}

function ecrire(profil: string, liste: PapierGarde[]) {
  try { localStorage.setItem(clePapiers(profil), JSON.stringify(liste.slice(0, COMBIEN))); }
  catch { /* mémoire pleine : on ne casse rien, le papier reste à l'écran */ }
}

/** Range un papier, le plus récent en tête. Le même identifiant remplace. */
export function garderPapier(profil: string, p: PapierGarde): PapierGarde[] {
  const liste = [p, ...chargerPapiers(profil).filter((x) => x.id !== p.id)];
  ecrire(profil, liste);
  return liste.slice(0, COMBIEN);
}

export function retirerPapier(profil: string, id: string): PapierGarde[] {
  const liste = chargerPapiers(profil).filter((x) => x.id !== id);
  ecrire(profil, liste);
  return liste;
}

/** Effacer quelqu'un efface ses papiers avec le reste. */
export function oublierPapiers(profil: string) {
  try { localStorage.removeItem(clePapiers(profil)); } catch {}
}

/* Le nom qu'on lit dans la liste. On prend ce que le papier a de plus parlant
   — le client d'un devis, l'objet d'une lettre, le début d'un message — parce
   que « Devis n° 4 » ne dit rien à quelqu'un qui en a écrit dix. */
export function titreDe(doc: Document): string {
  if (doc.type === "devis") {
    const qui = doc.client?.nom?.trim();
    const nom = doc.nature === "facture" ? "Facture" : "Devis";
    return qui ? `${nom} — ${qui}` : nom;
  }
  if (doc.type === "lettre") {
    const quoi = doc.objet?.trim() || doc.titre?.trim();
    return quoi ? `Lettre — ${quoi}` : "Lettre";
  }
  const debut = String(doc.texte || "").trim().replace(/\s+/g, " ").slice(0, 40);
  return debut ? `Message — ${debut}${debut.length >= 40 ? "…" : ""}` : "Message";
}
