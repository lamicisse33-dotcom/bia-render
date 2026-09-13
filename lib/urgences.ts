/* ── LES NUMÉROS QU'ELLE NE DOIT JAMAIS INVENTER ────────────────────────────

   Lamine, le 13 septembre 2026 : « les numéros d'urgence, les hôpitaux, la
   police, la gendarmerie, les sapeurs-pompiers… je veux que ce soit des
   numéros qu'elle puisse appeler directement, parce que c'est une urgence. »

   ── POURQUOI CE FICHIER, ET PAS UNE PHRASE DANS LA CONSIGNE ─────────────────

   Un modèle qui ne sait pas un numéro en fabrique un qui RESSEMBLE à un
   numéro. C'est vrai de tous les modèles, et c'est sans conséquence quand on
   demande l'heure d'ouverture d'une boutique. Ici, un chiffre inventé fait
   sonner chez un inconnu pendant qu'une maison brûle.

   La règle est donc absolue et elle est écrite deux fois — ici, et dans le
   socle : BIA ne donne AUCUN numéro d'urgence qui ne soit pas dans cette
   liste. Si on lui demande quelque chose qui n'y est pas, elle le dit et
   renvoie au 17, au 18 ou au 1515, qui répondent toujours.

   ── D'OÙ VIENNENT CES NUMÉROS ───────────────────────────────────────────────

   Relevés le 13 septembre 2026, aux sources les plus officielles trouvées, et
   recoupés :

     — 17, 18, 1515 : recoupés sur trois sources indépendantes (Senego,
       whitepages.sn, expat.com). Le SAMU est cité tantôt 15, tantôt 1515 ;
       on garde 1515, qui est la forme donnée partout.
     — 123 et 800 00 20 20 : donnés par la GENDARMERIE ELLE-MÊME
       (gendarmerie.sn, page « Contacter la gendarmerie » : « Numéro vert :
       123 ou 800 00 20 20 ») et annoncés par le ministère des Forces armées
       sous le nom « SECOURS GENDARMERIE ». Une source secondaire attribuait
       le 800 00 20 20 à un autre service : elle se trompe, et c'est
       précisément pourquoi on recoupe.
     — 119 : le site de la HASSMAR elle-même (hassmar.gouv.sn, page MRCC) —
       « Pour signaler tout incident en mer, veuillez contacter le MRCC au
       numéro d'appel gratuit : 119 ». C'est LAMINE qui me l'a donné ; je ne
       l'avais pas trouvé, et c'était une vraie lacune.
     — 800 00 17 00 : le numéro vert de la Police nationale, annoncé par elle
       lors de son rétablissement en septembre 2025. Lui aussi vient de lui.
     — les hôpitaux et cliniques : page consulaire de l'ambassade de France à
       Dakar. Officielle, mais ce sont des standards, pas des urgences.

   CE QU'IL FAUT SAVOIR SUR LES HÔPITAUX, et qui commande leur place ici :
   un standard d'hôpital n'est pas un numéro de secours. Il sonne dans le
   vide la nuit, la ligne change, et un service ferme sans prévenir — l'un des
   établissements de cette liste a été fermé pour reconstruction. Dans une
   urgence, la bonne réponse est TOUJOURS le numéro national, jamais un
   standard. Les hôpitaux sont donc rangés à part et servent à autre chose :
   prendre un rendez-vous, demander une information.

   À REVOIR PÉRIODIQUEMENT. Un numéro se vérifie, il ne se devine pas. La date
   de vérification est portée sur chaque ligne ; quand elle aura un an, il
   faudra la refaire.                                                       */

export type Urgence = {
  /** Ce qu'on appelle, en français simple. */
  quoi: string;
  /** Le numéro tel qu'on le compose depuis le Sénégal. */
  numero: string;
  /** Quand appeler celui-là plutôt qu'un autre. */
  quand: string;
  /** Où il a été lu. */
  source: string;
  /** Quand il a été vérifié. */
  verifie: string;
};

const LE_JOUR = "13 septembre 2026";

/* ── LES CINQ QUI RÉPONDENT TOUJOURS ────────────────────────────────────────
   Gratuits, courts, nationaux. Ce sont eux qu'on donne en premier, et ce sont
   les seuls qu'on donne quand on n'est pas sûr de ce qui se passe. */
export const URGENCES_NATIONALES: Urgence[] = [
  {
    quoi: "Les sapeurs-pompiers", numero: "18",
    quand: "un feu, un accident, quelqu'un qui ne respire plus, un secours à porter — c'est eux qui viennent",
    source: "Brigade nationale des Sapeurs-Pompiers", verifie: LE_JOUR,
  },
  {
    quoi: "Police Secours", numero: "17",
    quand: "une agression, un vol, un danger en ville",
    source: "Police nationale", verifie: LE_JOUR,
  },
  {
    quoi: "Le SAMU", numero: "1515",
    quand: "une urgence médicale — un malaise, une douleur grave, une femme qui accouche",
    source: "SAMU national", verifie: LE_JOUR,
  },
  {
    quoi: "Secours Gendarmerie", numero: "123",
    quand: "hors des villes, sur les routes, là où la police n'est pas",
    source: "gendarmerie.sn, « Numéro vert : 123 ou 800 00 20 20 »", verifie: LE_JOUR,
  },
  /* ── CELUI QUI MANQUAIT, ET C'EST LUI QUI L'A VU ────────────────────────

     Lamine m'a envoyé sa propre liste le 13 septembre 2026 au soir, et elle
     portait deux numéros que je n'avais pas trouvés. Celui-ci est le plus
     important des deux, et son absence était une vraie lacune : au Sénégal,
     une pirogue en difficulté n'est pas un cas d'école.

     Vérifié à la source la plus officielle qui soit — le site de la HASSMAR
     elle-même : « Pour signaler tout incident en mer, veuillez contacter le
     MRCC au numéro d'appel gratuit : 119 ». */
  {
    quoi: "Secours en mer (HASSMAR)", numero: "119",
    quand: "un accident en mer, une pirogue en difficulté, quelqu'un disparu en mer",
    source: "hassmar.gouv.sn, page MRCC — « numéro d'appel gratuit : 119 »", verifie: LE_JOUR,
  },
];

/* ── LES NUMÉROS VERTS, ET POURQUOI ILS VIENNENT EN SECOND ──────────────────

   Un numéro vert est un centre d'appel, pas un poste de secours : il est
   gratuit, national, et il répond — mais il est plus long à composer, et il
   tombe en panne comme tout le reste. Celui de la police est resté
   injoignable un temps en 2025 avant d'être rétabli, ce qui est exactement la
   raison d'en avoir deux plutôt qu'un.

   Dans l'urgence, on donne donc TOUJOURS le court d'abord — 17, 123 — et
   celui-ci seulement si le premier ne passe pas. */
export const POLICE_AUTRE = "800 00 17 00";

/* L'autre numéro de la gendarmerie, donné par elle sur la même page. On le
   garde en second : le 123 est plus court, et dans l'urgence chaque chiffre
   compte. */
export const GENDARMERIE_AUTRE = "800 00 20 20";


/* ── CE QUI N'EST PAS UNE URGENCE VITALE MAIS QUI PRESSE ────────────────── */
export const AUTRES_SECOURS: Urgence[] = [
  {
    quoi: "Violences faites aux femmes", numero: "116",
    quand: "une femme en danger chez elle",
    source: "relevé une seule fois — À CONFIRMER avant d'être dit à voix haute", verifie: LE_JOUR,
  },
];

/* ── LES ÉTABLISSEMENTS — À NE PAS DONNER DANS UNE URGENCE ─────────────────
   Standards, pas services de secours. Pour un rendez-vous, une information,
   un transport qu'on organise. Voir l'avertissement en tête de fichier. */
export const ETABLISSEMENTS: Urgence[] = [
  {
    quoi: "Hôpital Principal de Dakar", numero: "33 839 50 50",
    quand: "standard de l'hôpital", source: "ambassade de France à Dakar", verifie: LE_JOUR,
  },
  {
    quoi: "CHNU de Fann", numero: "33 869 18 18",
    quand: "standard de l'hôpital", source: "relevé en source secondaire", verifie: LE_JOUR,
  },
  {
    quoi: "SOS Médecin", numero: "33 889 15 15",
    quand: "un médecin qui se déplace, à Dakar", source: "ambassade de France à Dakar", verifie: LE_JOUR,
  },
  {
    quoi: "SUMA Assistance", numero: "33 824 60 30",
    quand: "ambulance privée, Dakar", source: "ambassade de France à Dakar", verifie: LE_JOUR,
  },
  {
    quoi: "Caserne de pompiers Malick Sy", numero: "33 823 03 59",
    quand: "la caserne du Plateau — mais dans l'urgence, c'est le 18",
    source: "ambassade de France à Dakar", verifie: LE_JOUR,
  },
];

/* ── LES NUMÉROS COURTS, ET POURQUOI IL FALLAIT LES DÉCLARER ────────────────

   Le bouton d'appel exigeait SIX CHIFFRES — écrit pour des numéros de
   téléphone ordinaires, et parfaitement raisonnable pour eux : un « 12 » posé
   par erreur ne doit pas devenir un bouton qui compose.

   Or les numéros d'urgence en font deux à quatre. `[[appel:18]]` était donc
   rejeté EN SILENCE : BIA disait « j'appelle les pompiers », et aucun bouton
   ne paraissait. Trouvé le 13 septembre 2026 en vérifiant les numéros pour
   lui, avant que ça n'ait jamais servi.

   On ne baisse pas le minimum pour tout le monde — on déclare les courts qui
   existent. Un numéro court inconnu reste refusé, exactement comme avant. */
export const NUMEROS_COURTS: ReadonlySet<string> = new Set(
  [...URGENCES_NATIONALES, ...AUTRES_SECOURS]
    .map((u) => u.numero.replace(/\D/g, ""))
    .filter((n) => n.length < 6),
);

export function estUnNumeroDUrgence(numero: string): boolean {
  return NUMEROS_COURTS.has(numero.replace(/\D/g, ""));
}

/* ── CE QU'ON EN DIT AU MODÈLE ──────────────────────────────────────────────

   Court exprès, et posé dans le SOCLE (la partie mise en cache) : ces numéros
   ne changent pas d'une question à l'autre, et les relire coûte dix fois
   moins que les renvoyer.

   La consigne dit trois choses, et la troisième est la plus importante :
   quoi appeler, comment poser le bouton, et QU'ELLE NE DOIT RIEN INVENTER. */
export function consigneUrgences(): string {
  const lignes = URGENCES_NATIONALES
    .map((u) => `  ${u.numero} — ${u.quoi} : ${u.quand}`).join("\n");
  return `

LES NUMÉROS D'URGENCE AU SÉNÉGAL
Voici la liste, et elle fait autorité. Tu n'en connais aucun autre.

${lignes}
  ${GENDARMERIE_AUTRE} — la gendarmerie, si le 123 ne passe pas.
  ${POLICE_AUTRE} — la police, si le 17 ne passe pas.

TU N'INVENTES JAMAIS UN NUMÉRO D'URGENCE, sous aucun prétexte. Si on te
demande un numéro qui n'est pas dans cette liste — un hôpital, une clinique,
une mairie, un commissariat de quartier — dis que tu ne l'as pas, et donne le
numéro national qui convient : il répond toujours, et il sait rediriger.

QUAND C'EST UNE URGENCE, TU FAIS TROIS CHOSES, DANS CET ORDRE :
  1. tu poses le bouton d'appel sur la PREMIÈRE ligne, tout de suite, avant
     même de parler : [[appel:18|les pompiers]]
  2. tu dis en une phrase courte qui va répondre — on n'écoute pas un discours
     quand quelqu'un saigne ;
  3. tu dis la seule chose utile en attendant : où on est, ce qu'on voit.

UNE MAIRIE N'A PAS DE NUMÉRO NATIONAL : chaque commune a le sien. Si on te
demande la mairie, demande laquelle, et dis que tu n'as pas son numéro plutôt
que d'en donner un au hasard.

CE N'EST PAS TOI QUI APPELLES. Tu prépares, le bouton s'allume, et c'est la
personne qui appuie.`;
}
