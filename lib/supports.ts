import { franc, nombre } from "./argent";

/* ═══════════════════════════════════════════════════════════════════════════
   BIA BUSINESS — LES SUPPORTS DE LA BOUTIQUE
   © 2026 KHALAM (Kha & Lamine).

   Demandé par Lamine le 10 septembre 2026, et redit le même jour avec la
   direction complète : « concevoir une partie spécialement dédiée aux petites
   entreprises, boutiques et commerces de quartier, avec des supports
   directement utilisables en wolof ».

   Et surtout sa phrase qui commande tout le reste : « il faut aller plus loin
   que traduire les outils en wolof. BIA devrait être pensée pour le
   fonctionnement RÉEL d'un commerçant sénégalais, avec son vocabulaire, ses
   habitudes de vente, les paiements Wave et Orange Money, les ventes à
   crédit, les fournisseurs, les commandes. »

   SON EXEMPLE, QUI EST LE VRAI CAHIER DES CHARGES :
   « Ma boutique dafa am produits yu bari, waaye xamuma ñaata lay jaay lépp,
     te xamuma ban produit mo guene rentable. »
   — j'ai beaucoup de produits, je ne sais pas combien je vends en tout, et je
   ne sais pas lequel rapporte le plus. Le commerçant parle en wolof ; il
   repart avec un tableau d'inventaire, un suivi des ventes, et la réponse à
   sa question.

   ── POURQUOI SIX MODÈLES ET PAS UN TABLEAU LIBRE ─────────────────────────

   Un tableau libre laisserait le modèle inventer ses colonnes, et deux
   inventaires du même boutiquier n'auraient pas la même forme d'une semaine à
   l'autre. Les six modèles ci-dessous sont FIXES : les colonnes sont écrites
   ici, le modèle ne fait que les remplir. C'est ce qui permet de rouvrir la
   fiche du mois dernier et de la reconnaître.

   ── LA RÈGLE QUI TIENT TOUT ──────────────────────────────────────────────

   La même que pour le devis : LE MODÈLE ÉCRIT LES MOTS, LE CODE FAIT LES
   ADDITIONS. Le reste de stock, la marge, le total des ventes, ce qui est
   encaissé, ce qui reste à recouvrer : tout est calculé ici, en francs
   entiers. Un stock faux fait racheter ce qu'on a déjà ; un bénéfice faux
   fait fermer une boutique.

   ── CE QUE LE CODE NE PRÉTEND PAS SAVOIR ─────────────────────────────────

   Deux honnêtetés, écrites pour qu'on ne les oublie pas :

   1. Une vente à crédit N'EST PAS de l'argent en caisse. On la compte à part,
      dans « à recouvrer », et jamais dans ce qui est encaissé. C'est la
      première chose qui tue une petite boutique : croire qu'on a gagné ce
      qu'on n'a pas encore reçu.
   2. « Ce qui reste après les dépenses » n'est PAS le bénéfice. Ça ne devient
      le bénéfice que si le prix d'achat de la marchandise figure parmi les
      dépenses. C'est écrit sous le tableau, en toutes lettres, plutôt que
      d'afficher un mot faux en gros.
   ═══════════════════════════════════════════════════════════════════════════ */

export type ModeleSupport =
  | "stock"       // fiche de stock : entrées, sorties, ce qui reste
  | "produit"     // fiche produit : prix d'achat, prix de vente, marge
  | "ventes"      // suivi des ventes : le jour, la semaine, le mois
  | "plan"        // plan commercial : quoi faire, quand, avec quel budget
  | "calendrier"  // calendrier marketing : les publications à faire
  | "rapport";    // rapport : ce qui est entré, ce qui est sorti, le solde

export const MODELES: ModeleSupport[] = [
  "stock", "ventes", "produit", "plan", "calendrier", "rapport",
];

/** Ce qu'on montre du modèle : son nom, ce qu'il sert à faire, et la phrase
    en wolof qui le fait reconnaître par quelqu'un qui ne lit pas le français. */
export const QUOI: Record<ModeleSupport, { nom: string; wolof: string; a_quoi: string }> = {
  stock: {
    nom: "Fiche de stock",
    wolof: "Lu ci des",
    a_quoi: "Ce qui est entré, ce qui est sorti, ce qui reste — et ce qu'il faut racheter.",
  },
  ventes: {
    nom: "Suivi des ventes",
    wolof: "Njaay yi",
    a_quoi: "Les ventes du jour, comment on a été payé, ce qui est encaissé et ce qui reste dû.",
  },
  produit: {
    nom: "Fiche produit",
    wolof: "Njëg yi",
    a_quoi: "Prix d'achat, prix de vente, marge — et lequel rapporte le plus.",
  },
  plan: {
    nom: "Plan commercial",
    wolof: "Plan bu jëf",
    a_quoi: "Une idée transformée en actions : quoi faire, quand, avec quel budget.",
  },
  calendrier: {
    nom: "Calendrier marketing",
    wolof: "Publications yi",
    a_quoi: "Les publications WhatsApp, Facebook et TikTok, jour par jour.",
  },
  rapport: {
    nom: "Rapport",
    wolof: "Rapport",
    a_quoi: "Sur une période : ce qui est entré, ce qui est sorti, ce qui reste.",
  },
};

/* Les moyens de paiement, tels qu'ils existent VRAIMENT dans une boutique de
   quartier. « Crédit » n'est pas un défaut de paiement : c'est la façon
   normale de vendre au voisinage, et il fallait une colonne pour lui — pas
   une note dans un coin. */
export const PAIEMENTS = ["Espèces", "Wave", "Orange Money", "Crédit"] as const;

/* ── UNE LIGNE ──────────────────────────────────────────────────────────────
   Une seule forme de ligne pour les six modèles, dont chacun n'utilise que
   les champs qui le regardent. Six formes différentes auraient voulu dire six
   nettoyeurs, six affichages et six fois plus d'endroits où se tromper. */
export type LigneSupport = {
  /** Le produit, l'action, la publication, le poste. Jamais vide. */
  quoi: string;
  /** Sac, carton, kilo, pièce. */
  unite?: string;
  /** Le jour ou la semaine : « lundi », « 8 septembre », « semaine 2 ». */
  quand?: string;

  /* Fiche de stock */
  debut?: number;    // ce qu'il y avait au départ
  entrees?: number;  // ce qui est arrivé du fournisseur
  sorties?: number;  // ce qui est parti
  seuil?: number;    // en dessous, il faut racheter

  /* Fiche produit, et suivi des ventes */
  achat?: number;    // le prix payé au fournisseur
  prix?: number;     // le prix de vente, à l'unité
  quantite?: number; // combien vendus

  /* Suivi des ventes */
  paiement?: string; // Espèces, Wave, Orange Money, Crédit
  client?: string;   // pour une vente à crédit, c'est lui qu'on ira voir
  depense?: number;  // une sortie d'argent : marchandise, transport, boutique

  /* Rapport */
  montant?: number;  // une entrée d'argent

  /* Plan commercial */
  budget?: number;

  /* Calendrier marketing */
  canal?: string;    // WhatsApp, Facebook, TikTok

  /** Le détail : comment faire l'action, le texte de la publication. */
  texte?: string;
};

export type Support = {
  type: "support";
  modele: ModeleSupport;
  titre: string;
  /** Le nom de la boutique, s'il a été dit. */
  boutique?: string;
  /** « Septembre », « la semaine du 8 » — ce que la personne a dit, tel quel. */
  periode?: string;
  lignes: LigneSupport[];
  /** Ce qu'elle explique sous le tableau, EN WOLOF. Deux ou trois lignes. */
  notes?: string[];
};

/* ── LES COLONNES QU'ON REMPLIT SOI-MÊME ────────────────────────────────────
   Ce que la personne peut corriger à l'écran. Les colonnes calculées ne sont
   pas là : elles se recalculent toutes seules et ne se tapent jamais. */
export type Champ = {
  cle: keyof LigneSupport;
  nom: string;
  genre: "texte" | "nombre" | "argent" | "choix" | "long";
  choix?: readonly string[];
};

export const CHAMPS: Record<ModeleSupport, Champ[]> = {
  stock: [
    { cle: "quoi", nom: "Produit", genre: "texte" },
    { cle: "unite", nom: "Unité", genre: "texte" },
    { cle: "debut", nom: "Au départ", genre: "nombre" },
    { cle: "entrees", nom: "Entrées", genre: "nombre" },
    { cle: "sorties", nom: "Sorties", genre: "nombre" },
    { cle: "seuil", nom: "Alerte à", genre: "nombre" },
  ],
  ventes: [
    { cle: "quand", nom: "Jour", genre: "texte" },
    { cle: "quoi", nom: "Produit", genre: "texte" },
    { cle: "quantite", nom: "Qté", genre: "nombre" },
    { cle: "prix", nom: "Prix unit.", genre: "argent" },
    { cle: "paiement", nom: "Payé par", genre: "choix", choix: PAIEMENTS },
    { cle: "client", nom: "Client", genre: "texte" },
    { cle: "depense", nom: "Dépense", genre: "argent" },
  ],
  produit: [
    { cle: "quoi", nom: "Produit", genre: "texte" },
    { cle: "unite", nom: "Unité", genre: "texte" },
    { cle: "achat", nom: "Prix d'achat", genre: "argent" },
    { cle: "prix", nom: "Prix de vente", genre: "argent" },
  ],
  plan: [
    { cle: "quoi", nom: "Action", genre: "texte" },
    { cle: "texte", nom: "Comment", genre: "long" },
    { cle: "quand", nom: "Quand", genre: "texte" },
    { cle: "budget", nom: "Budget", genre: "argent" },
  ],
  calendrier: [
    { cle: "quand", nom: "Quand", genre: "texte" },
    { cle: "canal", nom: "Où", genre: "choix", choix: ["WhatsApp", "Facebook", "TikTok", "Boutique"] },
    { cle: "quoi", nom: "Sujet", genre: "texte" },
    { cle: "texte", nom: "Le message", genre: "long" },
  ],
  rapport: [
    { cle: "quoi", nom: "Poste", genre: "texte" },
    { cle: "montant", nom: "Entré", genre: "argent" },
    { cle: "depense", nom: "Sorti", genre: "argent" },
  ],
};

/** Une ligne vide, prête à taper, avec les champs de son modèle. */
export function ligneVide(modele: ModeleSupport): LigneSupport {
  const l: LigneSupport = { quoi: "" };
  if (modele === "ventes") { l.quantite = 1; l.prix = 0; l.paiement = "Espèces"; }
  if (modele === "stock") { l.debut = 0; l.entrees = 0; l.sorties = 0; }
  if (modele === "produit") { l.achat = 0; l.prix = 0; }
  if (modele === "plan") l.budget = 0;
  if (modele === "calendrier") l.canal = "WhatsApp";
  if (modele === "rapport") { l.montant = 0; l.depense = 0; }
  return l;
}

/* ── CE QUE LE CODE CALCULE ─────────────────────────────────────────────────
   Aucun de ces chiffres ne vient du modèle. Tous se refont à chaque frappe :
   on corrige un prix mal entendu, et le total suit dans la seconde. */

export type Calculee = { nom: string; texte: string; alerte?: boolean };
export type LigneComptee = { ligne: LigneSupport; calculs: Calculee[] };
export type Resume = { nom: string; valeur: string; gros?: boolean; alerte?: boolean };

export type Compte = {
  lignes: LigneComptee[];
  resume: Resume[];
  /** Ce qui demande une décision aujourd'hui : une rupture, une vente à perte. */
  alertes: string[];
  /** Ce que le tableau ne dit PAS, écrit sous le tableau. */
  avertissement?: string;
};

const n = (v: number | undefined) => (Number.isFinite(v) ? Number(v) : 0);

export function compter(s: Support): Compte {
  const lignes = s.lignes || [];

  /* ── LA FICHE DE STOCK ────────────────────────────────────────────────
     Une seule soustraction, et c'est la plus utile de toutes : ce qui reste.
     Le seuil est ce que le commerçant sait déjà de tête — « en dessous de
     deux sacs, je rachète » — et qu'il n'a jamais écrit nulle part. */
  if (s.modele === "stock") {
    const comptees = lignes.map((l) => {
      const reste = n(l.debut) + n(l.entrees) - n(l.sorties);
      const bas = n(l.seuil) > 0 ? reste <= n(l.seuil) : reste <= 0;
      return {
        ligne: l,
        calculs: [{ nom: "Reste", texte: `${nombre(reste)}${l.unite ? " " + l.unite : ""}`, alerte: bas }],
      };
    });
    const manque = comptees.filter((c) => c.calculs[0].alerte);
    return {
      lignes: comptees,
      resume: [
        { nom: "Produits suivis", valeur: nombre(lignes.length) },
        { nom: "À racheter", valeur: nombre(manque.length), gros: true, alerte: manque.length > 0 },
      ],
      alertes: manque.map((c) => `${c.ligne.quoi} : il reste ${c.calculs[0].texte}.`),
    };
  }

  /* ── LA FICHE PRODUIT ─────────────────────────────────────────────────
     « Xamuma ban produit mo guene rentable » — je ne sais pas lequel
     rapporte le plus. C'est cette fiche qui répond, et la réponse tient en
     une soustraction que personne ne fait parce que personne n'a écrit les
     deux prix côte à côte.

     Le pourcentage est calculé sur le PRIX DE VENTE, comme dans le commerce :
     « sur 100 francs que je encaisse, il m'en reste tant ». */
  if (s.modele === "produit") {
    const comptees = lignes.map((l) => {
      const marge = n(l.prix) - n(l.achat);
      const part = n(l.prix) > 0 ? Math.round((marge / n(l.prix)) * 100) : 0;
      return {
        ligne: l,
        calculs: [
          { nom: "Marge", texte: franc(marge), alerte: marge <= 0 && n(l.prix) > 0 },
          { nom: "Sur 100 F", texte: `${part} %`, alerte: part <= 0 && n(l.prix) > 0 },
        ],
      };
    });
    const avecPrix = comptees.filter((c) => n(c.ligne.prix) > 0);
    const meilleur = [...avecPrix].sort(
      (a, b) => (n(b.ligne.prix) - n(b.ligne.achat)) - (n(a.ligne.prix) - n(a.ligne.achat)),
    )[0];
    const aPerte = avecPrix.filter((c) => n(c.ligne.prix) - n(c.ligne.achat) <= 0);
    return {
      lignes: comptees,
      resume: [
        { nom: "Produits", valeur: nombre(lignes.length) },
        meilleur
          ? {
              nom: "Rapporte le plus",
              valeur: `${meilleur.ligne.quoi} — ${franc(n(meilleur.ligne.prix) - n(meilleur.ligne.achat))}`,
              gros: true,
            }
          : { nom: "Rapporte le plus", valeur: "—" },
      ],
      alertes: aPerte.map((c) => `${c.ligne.quoi} : tu vends au prix d'achat, ou en dessous.`),
      avertissement:
        "La marge est par unité. Ce qui rapporte le plus dans le mois dépend aussi du nombre vendu — c'est le suivi des ventes qui le dit.",
    };
  }

  /* ── LE SUIVI DES VENTES ──────────────────────────────────────────────
     Le cœur de la journée d'une boutique, et l'endroit où il ne faut pas se
     tromper. Trois séparations qui comptent :

     — ce qui est ENCAISSÉ (espèces, Wave, Orange Money) ;
     — ce qui est À RECOUVRER, c'est-à-dire vendu à crédit, et qui n'est pas
       de l'argent tant qu'il n'est pas rentré ;
     — les DÉPENSES du jour.

     « Ce qui reste » n'est PAS le bénéfice, et c'est écrit sous le tableau
     plutôt qu'affiché en gros avec un mot faux. */
  if (s.modele === "ventes") {
    const comptees = lignes.map((l) => {
      /* Une DÉPENSE n'est pas une vente à zéro franc. Une ligne « achat de
         marchandise, 25 000 » affichait « Total : 0 FCFA » — et elle le
         DISAIT, dans la lecture à voix haute. Une ligne qui porte une dépense
         et pas de prix de vente est une sortie d'argent, et se lit ainsi. */
      if (n(l.depense) > 0 && !n(l.prix)) {
        return { ligne: l, calculs: [{ nom: "Dépense", texte: `- ${franc(n(l.depense))}` }] };
      }
      const total = Math.round(n(l.quantite) * n(l.prix));
      const credit = (l.paiement || "").toLowerCase().startsWith("cr");
      return {
        ligne: l,
        calculs: [{ nom: "Total", texte: franc(total), alerte: credit }],
      };
    });

    const totalDe = (garder: (l: LigneSupport) => boolean) =>
      lignes.filter(garder).reduce((s2, l) => s2 + Math.round(n(l.quantite) * n(l.prix)), 0);

    const estCredit = (l: LigneSupport) => (l.paiement || "").toLowerCase().startsWith("cr");
    const vendu = totalDe(() => true);
    const aRecouvrer = totalDe(estCredit);
    const encaisse = vendu - aRecouvrer;
    const depenses = lignes.reduce((s2, l) => s2 + n(l.depense), 0);
    const reste = encaisse - depenses;

    /* Par moyen de paiement : c'est ce qu'on regarde le soir, quand on compare
       la caisse au téléphone. */
    const parMoyen = PAIEMENTS.map((p) => ({
      nom: p,
      montant: totalDe((l) => (l.paiement || "").toLowerCase() === p.toLowerCase()),
    })).filter((x) => x.montant > 0);

    /* Le plus vendu, et celui qui rapporte le plus : deux réponses
       différentes, et c'est exactement ce que Lamine demandait. Le petit
       vendeur de sachets vend beaucoup et gagne peu. */
    const parProduit = new Map<string, { quantite: number; argent: number }>();
    for (const l of lignes) {
      const nom = String(l.quoi || "").trim();
      if (!nom || !n(l.prix)) continue;
      const d = parProduit.get(nom) || { quantite: 0, argent: 0 };
      d.quantite += n(l.quantite);
      d.argent += Math.round(n(l.quantite) * n(l.prix));
      parProduit.set(nom, d);
    }
    const tous = [...parProduit.entries()];
    const plusVendu = [...tous].sort((a, b) => b[1].quantite - a[1].quantite)[0];
    const plusRapporte = [...tous].sort((a, b) => b[1].argent - a[1].argent)[0];

    const resume: Resume[] = [
      { nom: "Vendu en tout", valeur: franc(vendu) },
      ...parMoyen.map((x) => ({ nom: x.nom, valeur: franc(x.montant) })),
      ...(aRecouvrer > 0
        ? [{ nom: "À recouvrer (crédit)", valeur: franc(aRecouvrer), alerte: true }]
        : []),
      ...(depenses > 0 ? [{ nom: "Dépenses", valeur: `- ${franc(depenses)}` }] : []),
      { nom: "Reste après dépenses", valeur: franc(reste), gros: true, alerte: reste < 0 },
    ];
    if (plusVendu) resume.push({ nom: "Le plus vendu", valeur: `${plusVendu[0]} — ${nombre(plusVendu[1].quantite)}` });
    if (plusRapporte && plusRapporte[0] !== plusVendu?.[0]) {
      resume.push({ nom: "Rapporte le plus", valeur: `${plusRapporte[0]} — ${franc(plusRapporte[1].argent)}` });
    }

    const dettes = lignes.filter((l) => estCredit(l) && l.client);
    return {
      lignes: comptees,
      resume,
      alertes: dettes.map(
        (l) => `${l.client} doit ${franc(Math.round(n(l.quantite) * n(l.prix)))} — ${l.quoi}.`,
      ),
      avertissement:
        "« Reste après dépenses » n'est le bénéfice QUE si le prix d'achat de la marchandise est parmi les dépenses. Le crédit n'est pas compté : ce n'est pas encore de l'argent.",
    };
  }

  /* ── LE PLAN COMMERCIAL ───────────────────────────────────────────────
     « Transformer une idée en actions concrètes : quoi faire, quand,
     comment, avec quel budget. » Le seul calcul est l'addition des budgets —
     mais c'est celui qui fait renoncer à un plan avant de l'avoir commencé,
     et c'est très bien ainsi. */
  if (s.modele === "plan") {
    const total = lignes.reduce((s2, l) => s2 + n(l.budget), 0);
    return {
      lignes: lignes.map((l) => ({ ligne: l, calculs: [] })),
      resume: [
        { nom: "Actions", valeur: nombre(lignes.length) },
        { nom: "Budget en tout", valeur: franc(total), gros: true },
      ],
      alertes: lignes.filter((l) => !l.quand).map((l) => `${l.quoi} : aucune date. Une action sans date ne se fait pas.`),
    };
  }

  /* ── LE CALENDRIER MARKETING ──────────────────────────────────────────
     Rien à additionner : ce qui manque à quelqu'un qui publie, ce n'est pas
     un total, c'est de savoir ce qu'il publie mardi. On compte seulement
     combien de publications, et où. */
  if (s.modele === "calendrier") {
    const parCanal = new Map<string, number>();
    for (const l of lignes) {
      const c = String(l.canal || "—").trim();
      parCanal.set(c, (parCanal.get(c) || 0) + 1);
    }
    return {
      lignes: lignes.map((l) => ({ ligne: l, calculs: [] })),
      resume: [
        { nom: "Publications", valeur: nombre(lignes.length), gros: true },
        ...[...parCanal.entries()].map(([c, k]) => ({ nom: c, valeur: nombre(k) })),
      ],
      alertes: lignes.filter((l) => !l.texte).map((l) => `${l.quoi} : le message n'est pas écrit.`),
    };
  }

  /* ── LE RAPPORT ───────────────────────────────────────────────────────
     Ce qui est entré, ce qui est sorti, ce qui reste. C'est ce qu'on montre
     à un fournisseur, à un associé, ou à soi-même à la fin du mois. */
  const entre = lignes.reduce((s2, l) => s2 + n(l.montant), 0);
  const sorti = lignes.reduce((s2, l) => s2 + n(l.depense), 0);
  const solde = entre - sorti;
  return {
    lignes: lignes.map((l) => ({ ligne: l, calculs: [] })),
    resume: [
      { nom: "Entré", valeur: franc(entre) },
      { nom: "Sorti", valeur: `- ${franc(sorti)}` },
      { nom: "Reste", valeur: franc(solde), gros: true, alerte: solde < 0 },
    ],
    alertes: solde < 0 ? ["Sur cette période, il est sorti plus d'argent qu'il n'en est entré."] : [],
  };
}

/* ── CE QU'ELLE LIT À VOIX HAUTE ────────────────────────────────────────────

   La règle de Lamine du 10 septembre 2026 vaut ici aussi : elle lit avant
   d'écrire, et attend un « oui ». Mais on ne lit PAS quinze lignes
   d'inventaire — au bout de la quatrième, personne n'écoute plus, et une
   lecture qu'on n'écoute pas ne vérifie rien.

   On lit donc : le titre, la période, les chiffres qui comptent, et les
   alertes. Et les lignes une à une SEULEMENT quand il y en a peu — c'est
   alors que la vérification a un sens, parce qu'un tableau de quatre lignes
   se corrige de tête. */
export function lectureSupport(s: Support, c: Compte): string {
  const quoi = QUOI[s.modele].nom.toLowerCase();
  const morceaux: string[] = [
    s.periode ? `Voici ${s.titre || quoi}, pour ${s.periode}.` : `Voici ${s.titre || quoi}.`,
  ];

  if (s.lignes.length <= 6) {
    for (const l of c.lignes) {
      const calcul = l.calculs[0]?.texte ? ` ${l.calculs[0].nom} : ${l.calculs[0].texte}.` : "";
      morceaux.push(`${l.ligne.quoi}.${calcul}`);
    }
  } else {
    morceaux.push(`${s.lignes.length} lignes.`);
  }

  for (const r of c.resume) {
    if (r.gros || r.alerte) morceaux.push(`${r.nom} : ${r.valeur}.`);
  }
  for (const a of c.alertes.slice(0, 3)) morceaux.push(a);

  morceaux.push("Est-ce que c'est bien ça ?");
  return morceaux.join(" ");
}

/** Le nom qu'on lit dans la liste des papiers. */
export function titreSupport(s: Support): string {
  const base = QUOI[s.modele]?.nom || "Support";
  const suite = s.titre?.trim() && s.titre.trim().toLowerCase() !== base.toLowerCase() ? s.titre.trim() : s.periode?.trim();
  return suite ? `${base} — ${suite}` : base;
}

/* ── NETTOYER CE QUE LE MODÈLE RENVOIE ──────────────────────────────────────
   Même méfiance qu'ailleurs : chaque champ ramené à son type, borné, et les
   nombres impossibles mis à zéro plutôt que propagés jusque dans un total. */

const mot = (v: unknown, max = 120) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const chiffre = (v: unknown): number | undefined => {
  if (v === null || v === undefined || v === "") return undefined;
  const x = Number(String(v).replace(/[^\d.,-]/g, "").replace(",", "."));
  return Number.isFinite(x) && x >= 0 && x < 1e12 ? Math.round(x) : undefined;
};

/** Le moyen de paiement ramené à l'un des quatre, quoi que le modèle écrive. */
function paiementDe(v: unknown): string | undefined {
  const brut = mot(v, 30).toLowerCase();
  if (!brut) return undefined;
  if (brut.startsWith("cr") || brut.includes("dette") || brut.includes("ndey")) return "Crédit";
  if (brut.includes("wave")) return "Wave";
  if (brut.includes("orange") || brut.includes("om")) return "Orange Money";
  return "Espèces";
}

export function estModele(v: unknown): v is ModeleSupport {
  return typeof v === "string" && (MODELES as string[]).includes(v);
}

export function nettoyerSupport(brut: unknown, modele: ModeleSupport): Support | null {
  const o = (brut ?? {}) as Record<string, unknown>;
  const lignes = (Array.isArray(o.lignes) ? o.lignes : [])
    .slice(0, 60)
    .map((x) => {
      const l = (x ?? {}) as Record<string, unknown>;
      const sortie: LigneSupport = { quoi: mot(l.quoi, 120) };
      const met = (cle: keyof LigneSupport, v: unknown) => {
        if (v !== undefined) (sortie as Record<string, unknown>)[cle] = v;
      };
      met("unite", mot(l.unite, 24) || undefined);
      met("quand", mot(l.quand, 40) || undefined);
      met("debut", chiffre(l.debut));
      met("entrees", chiffre(l.entrees));
      met("sorties", chiffre(l.sorties));
      met("seuil", chiffre(l.seuil));
      met("achat", chiffre(l.achat));
      met("prix", chiffre(l.prix));
      met("quantite", chiffre(l.quantite));
      met("paiement", paiementDe(l.paiement));
      met("client", mot(l.client, 80) || undefined);
      met("depense", chiffre(l.depense));
      met("montant", chiffre(l.montant));
      met("budget", chiffre(l.budget));
      met("canal", mot(l.canal, 24) || undefined);
      met("texte", mot(l.texte, 600) || undefined);
      return sortie;
    })
    .filter((l) => l.quoi);

  if (!lignes.length) return null;

  const notes = (Array.isArray(o.notes) ? o.notes : [])
    .slice(0, 5)
    .map((x) => mot(x, 300))
    .filter(Boolean);

  return {
    type: "support",
    modele,
    titre: mot(o.titre, 120) || QUOI[modele].nom,
    boutique: mot(o.boutique, 80) || undefined,
    periode: mot(o.periode, 60) || undefined,
    lignes,
    notes: notes.length ? notes : undefined,
  };
}

/* ── CE QU'ON DEMANDE AU MODÈLE ─────────────────────────────────────────────
   Une consigne par modèle serait six fois la même chose : on donne la forme
   commune, puis les seules colonnes du modèle demandé. Et jamais un total. */

const COLONNES: Record<ModeleSupport, string> = {
  stock: `{ "quoi": "le produit", "unite": "sac, carton, kilo, pièce", "debut": 0, "entrees": 0, "sorties": 0, "seuil": 0 }
"debut" = ce qu'il y avait au début de la période. "seuil" = la quantité en
dessous de laquelle il faut racheter, si elle a été dite. NE CALCULE PAS le
reste : il est calculé ailleurs.`,
  ventes: `{ "quand": "le jour", "quoi": "le produit", "quantite": 0, "prix": 0, "paiement": "Espèces | Wave | Orange Money | Crédit", "client": "seulement si c'est à crédit", "depense": 0 }
"prix" = le prix de vente À L'UNITÉ, jamais le total. "depense" = une sortie
d'argent ce jour-là (marchandise achetée, transport, boutique) — mets-la sur sa
propre ligne, avec "quoi" qui dit de quoi il s'agit et sans quantité ni prix.
Le nom du client n'est utile que pour une vente à crédit : c'est lui qu'on ira
voir. NE CALCULE AUCUN TOTAL.`,
  produit: `{ "quoi": "le produit", "unite": "l'unité de vente", "achat": 0, "prix": 0 }
"achat" = ce qu'il paie au fournisseur, "prix" = ce qu'il vend au client. NE
CALCULE PAS la marge.`,
  plan: `{ "quoi": "l'action, en peu de mots", "texte": "comment la faire, concrètement", "quand": "la semaine ou la date", "budget": 0 }
Des actions VRAIMENT faisables dans une boutique de quartier, pas des conseils
généraux. Chacune a une date. NE CALCULE PAS le budget total.`,
  calendrier: `{ "quand": "le jour", "canal": "WhatsApp | Facebook | TikTok | Boutique", "quoi": "le sujet en trois mots", "texte": "le message tout prêt, à copier" }
Le message est ÉCRIT EN ENTIER et prêt à publier — c'est tout l'intérêt. Le
texte d'une publication peut être en wolof, ou mêler wolof et français comme on
le fait vraiment ici.`,
  rapport: `{ "quoi": "le poste", "montant": 0, "depense": 0 }
"montant" = de l'argent entré, "depense" = de l'argent sorti. Une ligne porte
l'un OU l'autre, jamais les deux. NE CALCULE PAS le solde.`,
};

export function consigneSupport(modele: ModeleSupport): string {
  return `Tu fabriques un support de gestion pour une petite boutique de quartier,
à partir de la conversation qui précède. Le support demandé : ${QUOI[modele].nom.toUpperCase()}
— ${QUOI[modele].a_quoi}

Réponds UNIQUEMENT par un objet JSON, sans un mot avant, sans un mot après,
sans balise de code. MÊME SI LA CONVERSATION EST MAIGRE : tu réponds quand
même par le JSON, avec ce que tu sais, et tu laisses vide ce que tu ignores.
Ne réponds JAMAIS par une phrase pour expliquer qu'il te manque des
renseignements — ce n'est pas lu, et la personne ne voit alors qu'un échec.

{
  "titre": "de quoi il s'agit, en trois mots",
  "boutique": "le nom de la boutique, s'il a été dit",
  "periode": "le jour, la semaine ou le mois, s'il a été dit",
  "lignes": [ ${COLONNES[modele].split("\n")[0]} ],
  "notes": ["deux ou trois lignes EN WOLOF qui expliquent le tableau et ce qu'il faut faire"]
}

LES COLONNES, ET RIEN D'AUTRE :
${COLONNES[modele]}

N'INVENTE AUCUN CHIFFRE, AUCUN NOM DE PRODUIT, AUCUN PRIX. Ce qui n'a pas été
dit reste vide ou absent. Un stock inventé fait racheter ce qu'on a déjà ; un
prix inventé fait vendre à perte. S'il n'y a qu'un seul produit dans la
conversation, tu fais un tableau d'une seule ligne — c'est très bien.

NE CALCULE RIEN. Ni reste de stock, ni marge, ni total, ni bénéfice : toutes
les additions sont faites ailleurs, en francs entiers, et un total que tu
écrirais serait ignoré.

LES NOMBRES sont des nombres nus : 12500, jamais "12 500 FCFA". Les montants
sont en francs CFA.

LES NOTES SONT EN WOLOF — c'est le seul endroit du support qui l'est. Le
tableau, lui, garde ses mots courts en français : c'est ce qu'on montre à un
fournisseur. Les notes disent ce que les chiffres veulent dire et ce qu'il y a
à faire, dans la langue de celui qui tient la boutique. Écris-les dans le
wolof qu'on parle vraiment à Dakar : tout mot difficile se dit en français, et
les nombres se disent TOUJOURS en français.`;
}

/* ── RECONNAÎTRE LA DEMANDE ─────────────────────────────────────────────────
   BIA pose elle-même la balise quand elle a de quoi remplir un tableau ; ces
   mots ne servent qu'à ne pas manquer une demande dite autrement, et à
   allumer le bon onglet avant même qu'elle réponde. */
const MOTS: Record<ModeleSupport, string[]> = {
  stock: ["stock", "inventaire", "magasin", "marchandise", "rupture", "reste",
          "des", "marsandiis", "depot", "stok"],
  ventes: ["ventes", "vente", "caisse", "recette", "journee", "credit", "dette",
           "njaay", "jaay", "bor", "wave", "caisse"],
  produit: ["marge", "benefice", "rentable", "rentabilite", "prix", "achat",
            "njeg", "tool"],
  plan: ["plan", "strategie", "objectif", "action", "developper", "budget"],
  calendrier: ["calendrier", "publication", "publier", "marketing", "whatsapp",
               "facebook", "tiktok", "promo", "promotion", "affiche", "slogan"],
  rapport: ["rapport", "bilan", "resume", "mois", "situation"],
};

const sansAccent = (t: string) =>
  String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ");

/** Le support évoqué, s'il y en a un. */
export function supportEvoque(dit: string): ModeleSupport | null {
  const mots = new Set(sansAccent(dit).split(" ").filter(Boolean));
  for (const m of MODELES) {
    if (MOTS[m].some((x) => mots.has(x))) return m;
  }
  return null;
}
