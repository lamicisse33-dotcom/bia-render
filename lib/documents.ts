/* ── LES DOCUMENTS DE BIA ──────────────────────────────────────────────────

   Demandé par Lamine le 9 septembre 2026 : qu'un tailleur, un maçon, un
   mécanicien puisse parler wolof à BIA et repartir avec un devis propre, en
   français, prêt à envoyer au client. Et de même pour une lettre — demande
   d'emploi, courrier administratif, annonce.

   C'est le contraire d'un gadget : ici, la personne qui fait le travail parle
   souvent très bien et écrit peu, tandis que le papier, lui, doit être en
   français. Aujourd'hui elle demande à quelqu'un d'autre de l'écrire. BIA
   peut l'écrire pendant qu'elle parle.

   UNE RÈGLE TIENT TOUT LE RESTE : le modèle écrit les MOTS, le code fait les
   ADDITIONS. Un devis dont le total est faux part chez un client et coûte de
   l'argent à quelqu'un. Le modèle donne les postes, les quantités et les prix
   unitaires ; les multiplications, la remise, l'acompte et le total sont
   calculés ici, en francs entiers, et ne dépendent d'aucun modèle. */

export type LigneDevis = {
  designation: string;
  quantite: number;
  unite?: string;
  prix_unitaire: number;
};

export type Partie = {
  nom: string;
  metier?: string;
  telephone?: string;
  adresse?: string;
  /* Les identifiants de l'entreprise. Sans eux, un devis n'est pas recevable
     par une administration ni par une société — c'est le premier motif de
     rejet. Ils ne concernent que celui qui émet. */
  ninea?: string;
  rc?: string;
};

export type Devis = {
  type: "devis";
  numero: string;
  date: string;
  emetteur: Partie;
  client: Partie;
  objet: string;
  lignes: LigneDevis[];
  /** En francs, jamais en pourcentage : plus simple à dire, plus dur à truquer. */
  remise?: number;
  acompte?: number;
  /* Assujetti à la TVA ou non. Ce n'est PAS au modèle d'en décider : la
     plupart des artisans ne le sont pas, et faire apparaître une TVA quand on
     n'y est pas assujetti est une faute. C'est un réglage de l'émetteur, posé
     une fois pour toutes dans ses renseignements. */
  tva?: boolean;
  validite_jours?: number;
  delai?: string;
  conditions?: string;
};

export type Lettre = {
  type: "lettre";
  titre: string;
  lieu?: string;
  date: string;
  expediteur: Partie;
  destinataire: Partie;
  objet?: string;
  /** Un élément par paragraphe : c'est la mise en page qui les espace. */
  corps: string[];
  formule?: string;
  signature?: string;
};

/* ── LE MESSAGE ─────────────────────────────────────────────────────────────
   Demandé par Lamine le 10 septembre 2026 : « parler en wolof et que ça
   t'écrive un message en français, très propre ».

   Ce n'est PAS une lettre, et c'est pour ça que c'est une sorte à part. Une
   lettre a un en-tête, une date, un destinataire, une formule de politesse,
   et elle finit en PDF. Un message se copie et part sur WhatsApp dans la
   seconde. C'est sans doute ce dont on se servira le plus : tout le monde
   écrit des messages, peu de gens écrivent des lettres. */
export type Mot = {
  type: "message";
  /** Par où il part — ça change le ton et la longueur. */
  canal?: string;
  destinataire?: string;
  /** Un objet seulement pour un courriel. */
  objet?: string;
  /** Le message lui-même, prêt à envoyer. Les sauts de ligne sont gardés. */
  texte: string;
};

export type Document = Devis | Lettre | Mot;
export type Sorte = "devis" | "lettre" | "message";

/* ── L'argent ───────────────────────────────────────────────────────────────
   Le franc CFA n'a pas de centimes : tout est arrondi à l'entier, et on
   sépare les milliers par une espace insécable pour que « 1 250 000 » ne se
   coupe jamais en fin de ligne. */

export const franc = (n: number) =>
  `${Math.round(n).toLocaleString("fr-FR").replace(/ | | /g, " ")} FCFA`;

export type Totaux = {
  lignes: Array<LigneDevis & { total: number }>;
  sous_total: number;
  remise: number;
  /** Le montant hors taxes, remise déduite. */
  ht: number;
  /** Zéro si l'émetteur n'est pas assujetti — et alors rien ne s'affiche. */
  tva: number;
  /** Ce qu'il y a à payer : le HT, ou le TTC si la TVA s'applique. */
  total: number;
  acompte: number;
  reste: number;
};

/** Le taux en vigueur au Sénégal. */
export const TAUX_TVA = 0.18;

export function totauxDe(d: Devis): Totaux {
  const lignes = d.lignes.map((l) => ({
    ...l,
    total: Math.round(l.quantite * l.prix_unitaire),
  }));
  const sous_total = lignes.reduce((s, l) => s + l.total, 0);
  // Une remise ne peut pas dépasser le sous-total, un acompte ne peut pas
  // dépasser ce qu'il y a à payer. Sans ces deux bornes, un chiffre mal dicté
  // sort un total négatif — et personne ne le voit avant le client.
  const remise = Math.min(Math.max(0, Math.round(d.remise || 0)), sous_total);
  const ht = sous_total - remise;
  const tva = d.tva ? Math.round(ht * TAUX_TVA) : 0;
  const total = ht + tva;
  const acompte = Math.min(Math.max(0, Math.round(d.acompte || 0)), total);
  return { lignes, sous_total, remise, ht, tva, total, acompte, reste: total - acompte };
}

/* ── Nettoyer ce que le modèle renvoie ──────────────────────────────────────
   On ne fait confiance à rien : chaque champ est ramené à son type, borné en
   longueur, et les nombres impossibles sont mis à zéro plutôt que propagés. */

const texte = (v: unknown, max = 200) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const nombre = (v: unknown) => {
  const n = Number(String(v ?? "").toString().replace(/[^\d.,-]/g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 && n < 1e12 ? n : 0;
};
const partie = (v: unknown): Partie => {
  const o = (v ?? {}) as Record<string, unknown>;
  return {
    nom: texte(o.nom, 80),
    metier: texte(o.metier, 80) || undefined,
    telephone: texte(o.telephone, 40) || undefined,
    adresse: texte(o.adresse, 120) || undefined,
    ninea: texte(o.ninea, 40) || undefined,
    rc: texte(o.rc, 40) || undefined,
  };
};

/** Les renseignements de l'émetteur, tels que l'appareil les a gardés. */
export function nettoyerEmetteur(v: unknown): Partie | null {
  const p = partie(v);
  return p.nom ? p : null;
}

const aujourdhui = () => new Date().toISOString().slice(0, 10);

/** Un numéro lisible et non deviné : l'année, le mois, quatre caractères. */
export function numeroDevis(): string {
  const d = new Date();
  const alpha = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let queue = "";
  for (let i = 0; i < 4; i++) queue += alpha[Math.floor(Math.random() * alpha.length)];
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}-${queue}`;
}

export function nettoyer(brut: unknown, sorte: Sorte): Document | null {
  const o = (brut ?? {}) as Record<string, unknown>;

  if (sorte === "devis") {
    const lignes = (Array.isArray(o.lignes) ? o.lignes : [])
      .slice(0, 40)
      .map((l) => {
        const x = (l ?? {}) as Record<string, unknown>;
        return {
          designation: texte(x.designation, 160),
          quantite: nombre(x.quantite) || 1,
          unite: texte(x.unite, 20) || undefined,
          prix_unitaire: nombre(x.prix_unitaire),
        };
      })
      .filter((l) => l.designation);
    if (!lignes.length) return null;
    return {
      type: "devis",
      numero: texte(o.numero, 24) || numeroDevis(),
      date: texte(o.date, 24) || aujourdhui(),
      emetteur: partie(o.emetteur),
      client: partie(o.client),
      objet: texte(o.objet, 160),
      lignes,
      remise: nombre(o.remise) || undefined,
      acompte: nombre(o.acompte) || undefined,
      tva: Boolean(o.tva),
      validite_jours: Math.min(365, Math.round(nombre(o.validite_jours))) || undefined,
      delai: texte(o.delai, 120) || undefined,
      conditions: texte(o.conditions, 400) || undefined,
    };
  }

  if (sorte === "message") {
    /* Le texte garde ses retours à la ligne : un message WhatsApp respire, et
       tout coller en un bloc, c'est le rendre illisible sur un téléphone. */
    const brut = String(o.texte ?? "").replace(/\r/g, "").replace(/[ \t]+/g, " ").trim().slice(0, 2000);
    if (!brut) return null;
    return {
      type: "message",
      canal: texte(o.canal, 24) || undefined,
      destinataire: texte(o.destinataire, 80) || undefined,
      objet: texte(o.objet, 160) || undefined,
      texte: brut,
    };
  }

  const corps = (Array.isArray(o.corps) ? o.corps : [String(o.corps ?? "")])
    .slice(0, 20)
    .map((p) => texte(p, 1200))
    .filter(Boolean);
  if (!corps.length) return null;
  return {
    type: "lettre",
    titre: texte(o.titre, 120) || "Lettre",
    lieu: texte(o.lieu, 60) || undefined,
    date: texte(o.date, 24) || aujourdhui(),
    expediteur: partie(o.expediteur),
    destinataire: partie(o.destinataire),
    objet: texte(o.objet, 160) || undefined,
    corps,
    formule: texte(o.formule, 300) || undefined,
    signature: texte(o.signature, 80) || undefined,
  };
}

/* ── Ce qu'on demande au modèle ─────────────────────────────────────────────
   Du JSON, rien que du JSON, et surtout AUCUN total : il n'a pas à calculer,
   et lui demander de le faire serait l'inviter à se tromper. */

export const CONSIGNE_DOCUMENT = `Tu fabriques un document à partir de la conversation qui précède.

Réponds UNIQUEMENT par un objet JSON, sans un mot avant, sans un mot après,
sans balise de code. MÊME SI LA CONVERSATION EST MAIGRE : tu réponds quand
même par le JSON, en remplissant ce que tu sais et en laissant vide ce que tu
ignores. Ne réponds JAMAIS par une phrase pour expliquer que tu manques de
renseignements — ce n'est pas lu, et la personne ne voit alors qu'un message
d'échec. Pour une lettre, écris au moins un paragraphe ; pour un message, au
moins une phrase. Le document est rédigé EN FRANÇAIS, même si toute la
conversation s'est tenue en wolof : c'est la langue des devis, des factures et
de l'administration au Sénégal.

N'INVENTE AUCUN CHIFFRE, AUCUN NOM, AUCUNE ADRESSE. Ce qui n'a pas été dit
reste absent — un champ vide vaut mieux qu'un renseignement inventé sur un
papier qui part chez un client. Ne calcule AUCUN total : donne les quantités
et les prix unitaires, les additions sont faites ailleurs.

POUR UN DEVIS :
{
  "objet": "ce que le devis couvre, en une ligne",
  "emetteur": { "nom": "", "metier": "", "telephone": "", "adresse": "" },
  "client":   { "nom": "", "telephone": "", "adresse": "" },
  "lignes": [ { "designation": "", "quantite": 1, "unite": "", "prix_unitaire": 0 } ],
  "remise": 0,
  "acompte": 0,
  "validite_jours": 30,
  "delai": "le délai annoncé, s'il a été dit",
  "conditions": "ce qui a été convenu : paiement, garantie, ce qui n'est pas compris"
}
Les prix sont en francs CFA, en nombres nus : 12500, jamais "12 500 FCFA".
Ne mets NI "tva", NI "ninea", NI "rc" : ces trois-là viennent des
renseignements de l'émetteur, pas de toi. Une TVA affichée par quelqu'un qui
n'y est pas assujetti est une faute, et ce n'est pas à toi d'en décider.

POUR UN MESSAGE (WhatsApp, SMS, courriel) :
{
  "canal": "whatsapp, sms ou courriel, si on te l'a dit",
  "destinataire": "à qui il s'adresse, si on te l'a dit",
  "objet": "UNIQUEMENT pour un courriel",
  "texte": "le message, prêt à envoyer"
}
Un message n'est PAS une lettre : ni en-tête, ni date, ni « Monsieur le
Directeur », ni « je vous prie d'agréer ». Il est court, direct et poli — trois
ou quatre phrases suffisent presque toujours. Le français doit être
IMPECCABLE : c'est tout l'intérêt, la personne parle très bien mais veut
envoyer quelque chose de propre. Tu peux garder des retours à la ligne pour
aérer. Signe du prénom de la personne si tu le connais, sinon ne signe pas.
Pas d'émojis, sauf si on t'en demande.

POUR UNE LETTRE :
{
  "titre": "de quoi il s'agit, en trois mots",
  "lieu": "la ville, si elle a été dite",
  "expediteur":   { "nom": "", "telephone": "", "adresse": "" },
  "destinataire": { "nom": "", "adresse": "" },
  "objet": "Objet : …",
  "corps": ["premier paragraphe", "deuxième paragraphe"],
  "formule": "la formule de politesse finale",
  "signature": "le nom de celui qui signe"
}
Une lettre au Sénégal est courte, claire et polie : trois paragraphes
suffisent presque toujours. Pas de tournure ampoulée, pas de remplissage.`;

/* ── Reconnaître la demande ─────────────────────────────────────────────────
   BIA pose elle-même la balise quand elle a tout ce qu'il faut ; cette liste
   ne sert qu'à lui rappeler d'y penser, et à ne pas manquer une demande dite
   autrement. */
const MOTS: Record<Sorte, string[]> = {
  message: ["message", "whatsapp", "wattsap", "watsap", "sms", "texto", "mail",
            "email", "courriel", "mesaas", "meesaas"],
  devis: ["devis", "facture", "proforma", "prix", "estimation", "chiffrage",
          "njëg", "xaalis", "fakture", "deewis"],
  lettre: ["lettre", "courrier", "demande", "candidature", "cv", "annonce",
           "attestation", "reclamation", "bataaxal", "lettar"],
};

const sansAccent = (t: string) =>
  String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ");

/** La sorte de document évoquée, s'il y en a une. */
export function sorteEvoquee(texteDit: string): Sorte | null {
  const mots = new Set(sansAccent(texteDit).split(" ").filter(Boolean));
  for (const sorte of ["devis", "lettre", "message"] as Sorte[]) {
    if (MOTS[sorte].some((m) => mots.has(m))) return sorte;
  }
  return null;
}
