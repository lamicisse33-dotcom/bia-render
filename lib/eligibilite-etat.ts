/* ── POURQUOI L'ANTICIPATION NE PART JAMAIS : LA PORTE QUI A REFUSÉ ────────

   Lu sur /api/etat le 23 octobre 2026 après quatre tours Khalam :

     anticipation_conversation.ecoute   segments 6, segments_reussis 6
     anticipation_conversation          preparations 0, pretes 0, servies 0
     briques_conversation               sessions 0, preparees 0, lectures 0
     briques_conversation.departs       sans_preparation 4

   L'écoute progressive réussissait six fois sur six, et pourtant rien n'était
   préparé. Entre les deux il y a une dizaine de conditions — trois côté
   téléphone, sept côté serveur — et AUCUNE ne disait laquelle avait refusé.
   On ne pouvait donc que deviner. C'est exactement la faute nommée dans
   AVANT-DE-DIRE-QUE-C-EST-BON.md : « j'ai écrit ce compteur moi-même, et je
   ne l'ai jamais lu » — ici, je ne l'avais même pas écrit.

   Ce champ nomme la porte. Un refus sans nom est un refus qu'on cherchera
   encore dans six jours.

   CE QUI EST PUBLIÉ : des noms de conditions et des comptes. La longueur du
   texte est publiée parce qu'elle EST la condition (seuil de 35 signes) —
   une longueur n'est pas un contenu. Aucune transcription, aucun texte,
   aucun code d'accès. */

import { signesAnticipation } from "./seuils-anticipation";

type Refus = { porte: string; fois: number; dernier_signes: number | null; quand: string };
type Etat = {
  cote_telephone: Record<string, Refus>;
  cote_serveur: Record<string, Refus>;
  tours_declares: number;
  tours_sans_aucun_texte: number;
  derniers: Array<Record<string, unknown>>;
};
const g = globalThis as typeof globalThis & { biaEligibilite?: Etat };
const etat: Etat = (g.biaEligibilite ??= {
  cote_telephone: {}, cote_serveur: {}, tours_declares: 0, tours_sans_aucun_texte: 0, derniers: [],
});

/* Les noms autorisés, pour qu'un client bricolé ne puisse pas inventer des
   portes qui n'existent pas dans le code. */
const PORTES_TELEPHONE = new Set([
  "jamais_de_texte", "trop_court", "preparation_en_cours", "ecoute_fermee",
  "annule", "tour_perime", "rien_de_pret", "transcription_apres_fermeture",
  "premier_segment_hors_portee", "depart_sur_transcription_finale",
  /* ── CHANTIER 02 : LA TRANSCRIPTION LIVRÉE MALGRÉ LA FERMETURE ──────────
     `transcription_apres_fermeture` compte le CAS ; celle-ci compte les fois
     où on l'a quand même servie au producteur. Les deux côte à côte disent
     si le remède marche : avant, le premier montait et le second n'existait
     pas. Garder l'ancien compteur était la condition pour que le gain
     d'après-demain soit encore lisible. */
  "transcription_apres_fermeture_servie",
]);
const PORTES_SERVEUR = new Set([
  "texte_court", "texte_action", "salutation", "identite", "historique",
  "voix", "apprentissage", "tour_invalide", "persona_rara", "limite_personne",
]);

function compter(ou: Record<string, Refus>, porte: string, signes: number | null) {
  const r = (ou[porte] ??= { porte, fois: 0, dernier_signes: null, quand: "" });
  r.fois += 1;
  if (signes !== null) r.dernier_signes = signes;
  r.quand = new Date().toISOString();
}

const longueur = (v: unknown) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n <= 100000 ? n : null;
};

/** Le serveur nomme lui-même la porte qu'il vient de fermer. */
export function noterRefusServeur(porte: string, signes?: number) {
  if (!PORTES_SERVEUR.has(porte)) return;
  compter(etat.cote_serveur, porte, longueur(signes));
}

/** Le téléphone déclare, à la fin de chaque tour, les portes qu'il a vues. */
export function noterEligibilite(d: Record<string, unknown>) {
  if (d.etape !== "portes") return;
  etat.tours_declares += 1;
  const vues = d.portes;
  if (!vues || typeof vues !== "object" || Array.isArray(vues)) return;
  const retenues: Record<string, number> = {};
  for (const [porte, fois] of Object.entries(vues as Record<string, unknown>)) {
    const n = Number(fois);
    if (!PORTES_TELEPHONE.has(porte) || !Number.isInteger(n) || n < 1 || n > 1000) continue;
    retenues[porte] = n;
    for (let i = 0; i < Math.min(n, 1000); i++) compter(etat.cote_telephone, porte, longueur(d.signes_max));
  }
  if (retenues.jamais_de_texte) etat.tours_sans_aucun_texte += 1;
  etat.derniers = [...etat.derniers.slice(-19), {
    portes: retenues,
    signes_max: longueur(d.signes_max),
    parole_ms: longueur(d.parole_ms),
    segments: longueur(d.segments),
    quand: new Date().toISOString(),
  }];
}

const classer = (ou: Record<string, Refus>) =>
  Object.values(ou).sort((a, b) => b.fois - a.fois);
/* Un départ sur la transcription finale n'est pas un refus : c'est une
   décision, et elle ne doit pas se présenter comme la cause d'un blocage. */
const DECISIONS = new Set([
  "depart_sur_transcription_finale",
  /* Livrer une transcription n'est pas la refuser. Sans cette ligne, le
     remède du 25 octobre deviendrait lui-même « la porte qui refuse le
     plus » — et on chercherait un défaut là où il y a une réparation. */
  "transcription_apres_fermeture_servie",
  /* ── ET LE CAS LUI-MÊME N'EST PLUS UN REFUS ──────────────────────────────
     Mesuré après le chantier 02 : le cas × 7, servie × 7. Sept fois le cas,
     sept fois servie — plus rien n'est perdu, et pourtant ce compteur
     restait élu « porte qui refuse », en tête du classement. Il compte un
     CAS, pas un blocage. La vraie perte porte son propre nom. */
  "transcription_apres_fermeture",
]);

export function resumeEligibilite() {
  const tel = classer(etat.cote_telephone), srv = classer(etat.cote_serveur);
  return {
    revision: "portes-eligibilite-v1",
    seuil_signes: signesAnticipation(),
    tours_declares: etat.tours_declares,
    tours_sans_aucun_texte: etat.tours_sans_aucun_texte,
    /* La porte qui refuse le plus. Côté téléphone d'abord : si le téléphone
       n'a jamais demandé, les portes du serveur n'ont rien refusé — elles
       n'ont simplement rien vu, et les lire d'abord ferait conclure à tort. */
    porte_qui_refuse: tel.find(p => !DECISIONS.has(p.porte))?.porte ?? srv[0]?.porte ?? null,
    cote_telephone: tel,
    cote_serveur: srv,
    derniers_tours: etat.derniers,
    limite:
      "Noms de conditions et comptes. La longueur du texte est publiée parce qu'elle est la condition " +
      "(seuil de 35 signes) ; aucune transcription, aucun texte, aucun code. Les portes du serveur ne " +
      "comptent que les demandes qu'il a reçues : un téléphone qui n'a rien demandé les laisse à zéro.",
  };
}
