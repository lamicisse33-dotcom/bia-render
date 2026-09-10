import { NextRequest } from "next/server";
import PDFDocument from "pdfkit";
import { verifierCode } from "@/lib/codes";
import { franc, nettoyer, totauxDe, TAUX_TVA } from "@/lib/documents";
import type { Devis, Lettre, Partie, Sorte } from "@/lib/documents";
import { CHAMPS, QUOI, compter, estModele, nettoyerSupport } from "@/lib/supports";
import type { Support } from "@/lib/supports";

/* Le PDF est fabriqué sur le serveur, pas dans le téléphone.

   Sur un iPhone, « imprimer en PDF » demande trois manipulations et sort une
   page avec l'en-tête du navigateur. Ici le fichier arrive fini : on l'ouvre,
   on le partage sur WhatsApp, c'est tout.

   Helvetica suffit : elle couvre les accents français, et le document est en
   français. Aucune police à embarquer, aucun fichier à déployer. */

export const runtime = "nodejs";

const OR = "#8a6a1e";
const ENCRE = "#1a1a1a";
const GRIS = "#666666";
const TRAIT = "#d8d2bc";

const enFrancais = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
};

function bloc(doc: PDFKit.PDFDocument, titre: string, p: Partie, x: number, y: number, largeur: number) {
  doc.fontSize(8).fillColor(GRIS).font("Helvetica-Bold").text(titre.toUpperCase(), x, y, { width: largeur });
  let h = doc.y + 2;
  doc.fontSize(10).fillColor(ENCRE).font("Helvetica-Bold").text(p.nom || "—", x, h, { width: largeur });
  h = doc.y;
  doc.font("Helvetica").fontSize(9).fillColor(GRIS);
  const identifiants = [p.ninea ? `NINEA ${p.ninea}` : "", p.rc ? `RC ${p.rc}` : ""].filter(Boolean).join(" · ");
  for (const ligne of [p.metier, p.adresse, p.telephone, identifiants].filter(Boolean)) {
    doc.text(String(ligne), x, h, { width: largeur });
    h = doc.y;
  }
  return h;
}

function dessinerDevis(doc: PDFKit.PDFDocument, d: Devis) {
  const G = 56, D = 539, L = D - G;

  doc.fontSize(22).fillColor(OR).font("Helvetica-Bold").text("DEVIS", G, 54);
  doc.fontSize(9).fillColor(GRIS).font("Helvetica")
    .text(`N° ${d.numero}`, G, 80)
    .text(enFrancais(d.date), G, 93);

  const hg = bloc(doc, "Émis par", d.emetteur, G, 128, L / 2 - 12);
  const hd = bloc(doc, "Pour", d.client, G + L / 2 + 12, 128, L / 2 - 12);
  let y = Math.max(hg, hd) + 20;

  if (d.objet) {
    doc.fontSize(10).fillColor(ENCRE).font("Helvetica-Bold").text("Objet : ", G, y, { continued: true })
      .font("Helvetica").text(d.objet, { width: L });
    y = doc.y + 16;
  }

  const { lignes, sous_total, remise, ht, tva, total, acompte, reste } = totauxDe(d);
  const cQ = 300, cP = 360, cT = 452;

  doc.rect(G, y, L, 20).fill("#f6f1e2");
  doc.fillColor(GRIS).fontSize(8).font("Helvetica-Bold")
    .text("DÉSIGNATION", G + 8, y + 6)
    .text("QTÉ", cQ, y + 6, { width: 50 })
    .text("PRIX UNIT.", cP, y + 6, { width: 84, align: "right" })
    .text("TOTAL", cT, y + 6, { width: D - cT - 8, align: "right" });
  y += 26;

  doc.font("Helvetica").fontSize(10).fillColor(ENCRE);
  for (const l of lignes) {
    const hauteur = doc.heightOfString(l.designation, { width: cQ - G - 16 });
    if (y + hauteur > 720) { doc.addPage(); y = 56; }
    doc.fillColor(ENCRE).text(l.designation, G + 8, y, { width: cQ - G - 16 });
    const bas = doc.y;
    doc.text(`${l.quantite}${l.unite ? " " + l.unite : ""}`, cQ, y, { width: 50 });
    doc.text(franc(l.prix_unitaire), cP, y, { width: 84, align: "right" });
    doc.font("Helvetica-Bold").text(franc(l.total), cT, y, { width: D - cT - 8, align: "right" }).font("Helvetica");
    y = Math.max(bas, y + 14) + 8;
    doc.moveTo(G, y - 4).lineTo(D, y - 4).lineWidth(0.5).strokeColor(TRAIT).stroke();
  }

  y += 6;
  const ligneTotal = (etiquette: string, valeur: string, gras = false, couleur = ENCRE) => {
    doc.font(gras ? "Helvetica-Bold" : "Helvetica").fontSize(gras ? 12 : 10).fillColor(gras ? couleur : GRIS)
      .text(etiquette, cP - 60, y, { width: 144, align: "right" })
      .fillColor(couleur).text(valeur, cT, y, { width: D - cT - 8, align: "right" });
    y = doc.y + 4;
  };
  /* Un tiret ordinaire, pas le signe moins typographique : Helvetica ne
     connaît pas U+2212 et l'imprimait en guillemet. */
  if (remise > 0) { ligneTotal("Sous-total", franc(sous_total)); ligneTotal("Remise", `- ${franc(remise)}`); }
  if (tva > 0) {
    ligneTotal("Montant hors taxes", franc(ht));
    ligneTotal(`TVA ${Math.round(TAUX_TVA * 100)} %`, franc(tva));
  }
  ligneTotal(tva > 0 ? "TOTAL TTC À PAYER" : "TOTAL À PAYER", franc(total), true, OR);
  if (acompte > 0) { ligneTotal("Acompte versé", franc(acompte)); ligneTotal("Reste à payer", franc(reste), true); }

  y += 14;
  doc.fontSize(9).fillColor(GRIS).font("Helvetica");
  for (const t of [
    d.delai ? `Délai : ${d.delai}` : "",
    d.validite_jours ? `Devis valable ${d.validite_jours} jours.` : "",
    d.conditions || "",
  ].filter(Boolean)) {
    doc.text(String(t), G, y, { width: L });
    y = doc.y + 4;
  }

  y = Math.max(y + 30, 690);
  doc.fontSize(9).fillColor(GRIS).text("Signature", G, y)
    .text("Bon pour accord", D - 140, y, { width: 140, align: "right" });
}

function dessinerLettre(doc: PDFKit.PDFDocument, l: Lettre) {
  const G = 64, D = 531, L = D - G;

  doc.fontSize(10).fillColor(ENCRE).font("Helvetica-Bold").text(l.expediteur.nom || "", G, 64, { width: L / 2 });
  doc.font("Helvetica").fontSize(9).fillColor(GRIS);
  for (const t of [l.expediteur.adresse, l.expediteur.telephone].filter(Boolean)) doc.text(String(t), { width: L / 2 });

  let y = 64;
  doc.fontSize(10).fillColor(ENCRE).font("Helvetica-Bold").text(l.destinataire.nom || "", G + L / 2, y, { width: L / 2, align: "right" });
  doc.font("Helvetica").fontSize(9).fillColor(GRIS);
  if (l.destinataire.adresse) doc.text(l.destinataire.adresse, G + L / 2, doc.y, { width: L / 2, align: "right" });

  y = Math.max(doc.y, 140) + 18;
  doc.fontSize(10).fillColor(ENCRE).font("Helvetica")
    .text(`${l.lieu ? l.lieu + ", le " : "Le "}${enFrancais(l.date)}`, G, y, { width: L, align: "right" });
  y = doc.y + 26;

  if (l.objet) {
    doc.font("Helvetica-Bold").text(l.objet.startsWith("Objet") ? l.objet : `Objet : ${l.objet}`, G, y, { width: L });
    y = doc.y + 22;
  }

  doc.font("Helvetica").fontSize(11).fillColor(ENCRE);
  for (const para of l.corps) {
    if (y > 690) { doc.addPage(); y = 64; }
    doc.text(para, G, y, { width: L, align: "justify", lineGap: 3 });
    y = doc.y + 12;
  }

  if (l.formule) { doc.text(l.formule, G, y + 8, { width: L, lineGap: 3 }); y = doc.y + 30; }
  if (l.signature) doc.font("Helvetica-Bold").text(l.signature, G + L / 2, y, { width: L / 2, align: "right" });
}

/* ── LA FEUILLE ────────────────────────────────────────────────────────────
   Monter le document, laisser le dessinateur travailler, poser le pied
   KHALAM, rendre le fichier. Le même pour un devis, une lettre et un tableau
   de boutique : ce qui change est le dessin, jamais l'emballage. */
async function feuille(
  _quoi: unknown,
  dessiner: (p: PDFKit.PDFDocument) => void,
  nom: string,
  titre: string,
): Promise<Response> {
  const pdf = new PDFDocument({ size: "A4", margin: 0, info: { Title: titre } });
  const morceaux: Buffer[] = [];
  pdf.on("data", (c: Buffer) => morceaux.push(c));
  const fini = new Promise<void>((r) => pdf.on("end", () => r()));

  dessiner(pdf);

  // Le pied KHALAM : discret, et le même sur tous les documents de la maison.
  const bas = pdf.page.height - 42;
  pdf.fontSize(8).fillColor(TRAIT).font("Helvetica")
    .text("Écrit avec BIA — KHALAM", 0, bas, { width: pdf.page.width, align: "center" });

  pdf.end();
  await fini;

  return new Response(new Uint8Array(Buffer.concat(morceaux)), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${nom}"`,
    },
  });
}

/* ── LE TABLEAU DE LA BOUTIQUE, SUR UNE FEUILLE ─────────────────────────────

   Un support de BIA Business se regarde d'abord sur le téléphone, mais il
   finit souvent ailleurs : on le montre au fournisseur, on l'envoie sur
   WhatsApp, on le punaise derrière le comptoir. D'où cette page.

   Un seul dessinateur pour les six modèles : les colonnes viennent de CHAMPS,
   les calculs de compter(). Six fonctions de dessin auraient voulu dire six
   endroits où une colonne peut manquer. Les colonnes sont réparties à parts
   égales sur la largeur, en donnant deux parts au libellé — c'est toujours
   lui qui est long. */
function dessinerSupport(doc: PDFKit.PDFDocument, s: Support) {
  const G = 40, D = 555, L = D - G;
  const c = compter(s);
  const champs = CHAMPS[s.modele].filter((x) => x.genre !== "long");
  const calculs = c.lignes[0]?.calculs || [];

  doc.fontSize(18).fillColor(OR).font("Helvetica-Bold").text(s.titre || QUOI[s.modele].nom, G, 48);
  doc.fontSize(9).fillColor(GRIS).font("Helvetica")
    .text([s.boutique, s.periode].filter(Boolean).join(" · ") || QUOI[s.modele].a_quoi, G, 72, { width: L });

  /* Deux parts pour la première colonne — le produit, l'action, le poste —
     une part pour les autres, une part pour chaque colonne calculée. */
  const parts = champs.map((_, i) => (i === 0 ? 2 : 1)).concat(calculs.map(() => 1));
  const somme = parts.reduce((a, b) => a + b, 0);
  const largeurs = parts.map((x) => (L * x) / somme);
  const x0 = (i: number) => G + largeurs.slice(0, i).reduce((a, b) => a + b, 0);
  const titres = [...champs.map((x) => x.nom), ...calculs.map((k) => k.nom)];

  let y = 104;
  const enTete = () => {
    doc.rect(G, y, L, 18).fill("#f6f1e2");
    doc.fillColor(GRIS).fontSize(7).font("Helvetica-Bold");
    titres.forEach((t, i) => doc.text(t.toUpperCase(), x0(i) + 4, y + 5, { width: largeurs[i] - 8 }));
    y += 22;
  };
  enTete();

  doc.font("Helvetica").fontSize(9);
  c.lignes.forEach((ligne, n) => {
    if (y > 740) { doc.addPage(); y = 48; enTete(); doc.font("Helvetica").fontSize(9); }
    if (n % 2 === 1) doc.rect(G, y - 3, L, 18).fill("#faf7ee");
    champs.forEach((ch, i) => {
      const v = ligne.ligne[ch.cle];
      const texte = v === undefined || v === null || v === ""
        ? "—"
        : ch.genre === "argent" ? franc(Number(v)) : String(v);
      doc.fillColor(ENCRE).text(texte, x0(i) + 4, y, { width: largeurs[i] - 8, ellipsis: true, height: 12 });
    });
    ligne.calculs.forEach((k, j) => {
      const i = champs.length + j;
      doc.fillColor(k.alerte ? "#a33" : ENCRE).font("Helvetica-Bold")
        .text(k.texte, x0(i) + 4, y, { width: largeurs[i] - 8, ellipsis: true, height: 12 })
        .font("Helvetica");
    });
    y += 18;
  });

  /* Le texte long — le message d'une publication, le « comment » d'une action
     — ne tient pas dans une colonne. Il se met sous le tableau, ligne par
     ligne, sinon on l'écrase et il ne sert plus à rien. */
  const long = CHAMPS[s.modele].find((x) => x.genre === "long");
  if (long) {
    y += 10;
    for (const l of s.lignes) {
      const t = l[long.cle];
      if (!t) continue;
      if (y > 720) { doc.addPage(); y = 48; }
      doc.font("Helvetica-Bold").fontSize(9).fillColor(ENCRE).text(`${l.quoi} — `, G, y, { continued: true })
        .font("Helvetica").fillColor(GRIS).text(String(t), { width: L });
      y = doc.y + 8;
    }
  }

  if (y > 660) { doc.addPage(); y = 48; }
  y += 12;
  doc.moveTo(G, y).lineTo(D, y).strokeColor(TRAIT).stroke();
  y += 12;

  for (const r of c.resume) {
    doc.fontSize(r.gros ? 12 : 9).font(r.gros ? "Helvetica-Bold" : "Helvetica")
      .fillColor(r.alerte ? "#a33" : GRIS).text(r.nom, G, y, { width: L / 2 })
      .fillColor(r.alerte ? "#a33" : ENCRE).text(r.valeur, G + L / 2, y, { width: L / 2, align: "right" });
    y = doc.y + 5;
  }

  for (const a of c.alertes) {
    if (y > 740) { doc.addPage(); y = 48; }
    doc.fontSize(9).font("Helvetica").fillColor("#a33").text(`• ${a}`, G, y, { width: L });
    y = doc.y + 3;
  }

  /* Ce que le tableau ne dit pas est écrit sur la feuille aussi : c'est là
     qu'on le lira, longtemps après la conversation. */
  if (c.avertissement) {
    y += 8;
    doc.fontSize(8).fillColor(GRIS).font("Helvetica").text(c.avertissement, G, y, { width: L });
    y = doc.y + 10;
  }
  for (const note of s.notes || []) {
    if (y > 740) { doc.addPage(); y = 48; }
    doc.fontSize(9).fillColor(ENCRE).font("Helvetica").text(note, G, y, { width: L });
    y = doc.y + 5;
  }
}

export async function POST(request: NextRequest) {
  const verdict = verifierCode(request.headers.get("x-bia-code"));
  if (!verdict.ok) return new Response("code", { status: 401 });

  const body = await request.json().catch(() => null) as { document?: unknown } | null;
  const brut = body?.document as Record<string, unknown> | undefined;

  /* Un support de boutique arrive par la même porte, avec son propre
     nettoyeur : ses colonnes ne ressemblent à rien de ce que nettoyer() sait
     lire, et le faire passer par là sortirait une feuille vide. */
  if (brut?.type === "support" && estModele(brut.modele)) {
    const support = nettoyerSupport(brut, brut.modele);
    if (!support) return new Response("tableau vide", { status: 400 });
    return feuille(support, (p) => dessinerSupport(p, support),
      `${support.modele}-${(support.periode || "").replace(/[^\w-]+/g, "-") || "boutique"}.pdf`,
      support.titre || QUOI[support.modele].nom);
  }

  const sorte: Sorte = brut?.type === "lettre" ? "lettre"
    : brut?.type === "message" ? "message" : "devis";
  const doc = nettoyer(brut, sorte);
  if (!doc) return new Response("document illisible", { status: 400 });
  /* Un message n'a pas de PDF, et c'est voulu : on le copie et on l'envoie.
     Lui fabriquer une page A4 serait lui faire faire le tour du monde pour
     traverser la rue. */
  if (doc.type === "message") return new Response("un message ne s'imprime pas", { status: 400 });

  /* Un support ne passe jamais par nettoyer() : s'il arrive ici, c'est que
     la sorte a été mal transmise, et il vaut mieux le dire que dessiner une
     page vide. */
  if (doc.type === "support") return new Response("tableau mal transmis", { status: 400 });

  const nom = doc.type === "devis" ? `devis-${doc.numero}.pdf` : `lettre-${doc.date}.pdf`;
  const titre = doc.type === "devis" ? `Devis ${doc.numero}` : doc.titre;
  return feuille(doc, (p) => {
    if (doc.type === "devis") dessinerDevis(p, doc); else dessinerLettre(p, doc);
  }, nom, titre);
}
