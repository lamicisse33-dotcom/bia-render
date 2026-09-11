import { NextRequest, NextResponse } from "next/server";
import { verifierCode } from "@/lib/codes";
import { lexiqueConfig } from "@/lib/lexique";
import { REPERTOIRE, RELU, etatRepertoire, repertoireActif } from "@/lib/repertoire";
import { NOUVELLES, RELU_BASE } from "@/lib/base-textes";
import { synthetiser } from "@/lib/voix";
import { noterVoix } from "@/lib/depense";
import { noterPanne } from "@/lib/panne";

/* ── ENREGISTRER LE RÉPERTOIRE, UNE FOIS ────────────────────────────────────

   Lamine, le 11 septembre 2026 : « il faut le faire en une fois, comme ça on
   n'aura plus à payer ces mots-là. »

   Cette route fabrique les sons manquants et les range chez Supabase. Elle
   coûte de l'argent — c'est la seule de toute l'application dont c'est le but
   — et elle est donc gardée par TROIS verrous :

   1. LE CODE MAÎTRE. Aucun testeur ne peut la déclencher.
   2. LES TEXTES RELUS. Tant que RELU vaut false dans lib/repertoire.ts, elle
      refuse : on n'achète pas quarante fichiers pour découvrir ensuite qu'une
      phrase sur trois sonne faux à l'oreille d'un Dakarois.
   3. ELLE NE REFAIT JAMAIS CE QUI EXISTE. Chaque son est vérifié avant d'être
      fabriqué. Lancer la route deux fois ne coûte donc rien la seconde fois —
      et c'est important, parce qu'on la relancera à chaque phrase ajoutée.

   GET dit ce qui manque et ce que ça coûterait. POST le fabrique. Regarder
   est gratuit ; c'est la moindre des choses avant de dépenser. */

const SEAU = process.env.SUPABASE_BUCKET_REPERTOIRE || "repertoire";
const DOLLAR_PAR_SIGNE = 0.22 / 1000;

function entetes(type?: string) {
  return {
    apikey: lexiqueConfig.cle,
    Authorization: `Bearer ${lexiqueConfig.cle}`,
    ...(type ? { "content-type": type } : {}),
  };
}

const chemin = (cle: string, langue: string) => `${langue}/${cle}.wav`;

/* ── DIRE LA PANNE SANS RECRACHER LA PAGE ───────────────────────────────────

   Le 11 septembre 2026, l'écran de Lamine a affiché ceci :

     ⚠ 1 ratée(s) : inchallah (Soynade 502 : <!DOCTYPE html> <!--[if lt IE 7]>
     <html class="no-js ie6 oldie" lang="en-US"> <![endif]--> <!--[if IE 7]>…

   Quand Soynade tombe, il ne répond pas une erreur : il répond une PAGE, avec
   son doctype et ses commentaires pour Internet Explorer 6. Tout ça est parti
   tel quel dans son téléphone et a mangé l'écran, alors que le seul mot utile
   était « 502 ».

   Ce qu'on garde à l'écran : le moteur et le numéro. Le détail complet reste
   dans le journal des pannes, là où il sert à quelque chose. */
function motifLisible(err: Error): string {
  const brut = String(err.message || "").trim();
  const balise = brut.indexOf("<");
  const propre = (balise > 0 ? brut.slice(0, balise) : brut)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (propre || "panne sans message").slice(0, 90);
}

/** Le son est-il déjà là ? Une requête de tête, sans corps, sans coût. */
async function dejaLa(cle: string, langue: string): Promise<boolean> {
  try {
    const r = await fetch(
      `${lexiqueConfig.url}/storage/v1/object/info/public/${SEAU}/${chemin(cle, langue)}`,
      { headers: entetes(), cache: "no-store" },
    );
    return r.ok;
  } catch { return false; }
}

async function deposer(cle: string, langue: string, audio: Buffer): Promise<boolean> {
  const r = await fetch(
    `${lexiqueConfig.url}/storage/v1/object/${SEAU}/${chemin(cle, langue)}`,
    {
      method: "POST",
      headers: { ...entetes("audio/wav"), "x-upsert": "true" },
      body: new Uint8Array(audio),
    },
  );
  if (!r.ok) {
    const detail = (await r.text().catch(() => "")).slice(0, 300);
    noterPanne(`répertoire : dépôt ${cle}/${langue}`, detail, "repertoire");
  }
  return r.ok;
}

/* ── TOUT CE QUI DOIT EXISTER EN SON ────────────────────────────────────────

   Deux listes, deux verrous. Les 42 premières sont relues depuis ce matin ;
   les 69 nouvelles depuis cet après-midi. Une liste dont le verrou est fermé
   n'apparaît pas ici : ni comptée, ni fabriquée, ni facturée.

   Les deux routes — celle qui compte et celle qui fabrique — lisent CETTE
   fonction. Écrire la boucle deux fois, c'était se préparer à n'en corriger
   qu'une. */
function toutCeQuiSeDit() {
  return [
    ...(RELU ? REPERTOIRE.map((e) => ({ cle: e.cle, wolof: e.wolof, francais: e.francais })) : []),
    ...(RELU_BASE ? NOUVELLES.map((e) => ({ cle: e.cle, wolof: e.wolof, francais: e.francais })) : []),
  ];
}

/* ── UN SON ATTENDU ─────────────────────────────────────────────────────────

   Deux cent vingt-deux lignes : cent onze réponses, chacune en wolof et en
   français. Une réponse dont un côté est vide ne compte pas — on ne fabrique
   pas le silence. */
type Attendu = { cle: string; langue: "wo" | "fr"; texte: string };

function tousLesSonsAttendus(): Attendu[] {
  const liste: Attendu[] = [];
  for (const e of toutCeQuiSeDit()) {
    for (const [langue, texte] of [["wo", e.wolof], ["fr", e.francais]] as const) {
      if (texte.trim()) liste.push({ cle: e.cle, langue, texte });
    }
  }
  return liste;
}

/* ── REGARDER VITE, PAR PAQUETS ─────────────────────────────────────────────

   Lamine, le 11 septembre 2026, après avoir dû relancer l'enregistrement
   plusieurs fois pour savoir où il en était : « j'ai appuyé plusieurs fois,
   j'ai attendu chaque fois quand ça se décroche… il faut vérifier si c'est
   parti. »

   Il ne devait pas avoir à payer pour regarder, et la vraie raison qu'il l'a
   fait est ici : demander « ce son existe-t-il ? » deux cent vingt-deux fois
   L'UNE APRÈS L'AUTRE prenait une minute entière avant même la première
   dépense. C'est ce temps mort qui a fait couper la requête en route et perdu
   quatre-vingt-treize fichiers.

   Douze questions à la fois, pas plus. Supabase les encaisse sans broncher et
   la vérification passe d'une minute à quelques secondes. On ne monte pas
   plus haut : ce qui compte est que ça aboutisse toujours, pas que ça aille
   au plus vite une fois sur deux. */
const DE_FRONT = 12;

async function parPaquets<T, R>(liste: T[], faire: (x: T) => Promise<R>): Promise<R[]> {
  const sortie: R[] = [];
  for (let i = 0; i < liste.length; i += DE_FRONT) {
    sortie.push(...(await Promise.all(liste.slice(i, i + DE_FRONT).map(faire))));
  }
  return sortie;
}

/** Le tri : ce qui est déjà là, et ce qu'il reste à fabriquer. Gratuit. */
async function trier(liste: Attendu[]) {
  const presence = await parPaquets(liste, (a) => dejaLa(a.cle, a.langue));
  const enPlace: Attendu[] = [];
  const aFaire: Attendu[] = [];
  liste.forEach((a, i) => (presence[i] ? enPlace : aFaire).push(a));
  return { enPlace, aFaire };
}

/** Ce qui manque, et ce que ça coûterait. Gratuit. */
export async function GET(request: NextRequest) {
  const verdict = verifierCode(request.headers.get("x-bia-code"));
  if (!verdict.ok || !verdict.maitre) {
    return NextResponse.json({ erreur: "code maître" }, { status: 401 });
  }
  if (!repertoireActif()) {
    return NextResponse.json({ erreur: "Supabase n'est pas configuré." }, { status: 400 });
  }

  const liste = tousLesSonsAttendus();
  const { enPlace, aFaire } = await trier(liste);
  const signes = aFaire.reduce((t, a) => t + a.texte.length, 0);

  return NextResponse.json({
    ...etatRepertoire(),
    /* Les trois chiffres que Lamine lit : combien de sons doivent exister,
       combien existent, combien manquent. Le premier ne bouge que quand on
       ajoute une réponse ; le deuxième est relu dans le seau à chaque appui. */
    attendus: liste.length,
    en_place: enPlace.length,
    manquants: aFaire.length,
    signes,
    cout_dollars: Math.round(signes * DOLLAR_PAR_SIGNE * 1000) / 1000,
    detail: aFaire.map((a) => ({ cle: a.cle, langue: a.langue, signes: a.texte.length })),
    /* Dire NON en expliquant pourquoi vaut mieux qu'un bouton qui ne fait
       rien : c'est ce qu'on lit quand l'enregistrement refuse de partir. */
    pret: RELU ? "oui" : "non — les textes attendent d'être relus par Lamine (RELU dans lib/repertoire.ts)",
  });
}

/** Fabrique ce qui manque. Coûte de l'argent. */
export async function POST(request: NextRequest) {
  const verdict = verifierCode(request.headers.get("x-bia-code"));
  if (!verdict.ok || !verdict.maitre) {
    return NextResponse.json({ erreur: "code maître" }, { status: 401 });
  }
  if (!repertoireActif()) {
    return NextResponse.json({ erreur: "Supabase n'est pas configuré." }, { status: 400 });
  }
  if (!RELU && !RELU_BASE) {
    return NextResponse.json({
      erreur: "Les textes n'ont pas encore été relus. Rien n'a été enregistré, et rien n'a été payé.",
    }, { status: 409 });
  }

  const faits: string[] = [];
  const rates: { cle: string; langue: string; motif: string }[] = [];
  let signes = 0;

  /* Le tri d'abord, par paquets de douze : quelques secondes au lieu d'une
     minute. Ensuite seulement la dépense, et celle-là reste une par une —
     Soynade n'aime pas qu'on lui parle à douze voix. */
  const { enPlace, aFaire } = await trier(tousLesSonsAttendus());

  for (const a of aFaire) {
    try {
      const parole = await synthetiser(a.texte, a.langue, {});
      if (!parole) throw new Error("aucun moteur de voix");
      noterVoix(a.texte.length, "répertoire");
      signes += a.texte.length;
      if (await deposer(a.cle, a.langue, parole.audio)) faits.push(`${a.langue}/${a.cle}`);
      else rates.push({ cle: a.cle, langue: a.langue, motif: "dépôt refusé" });
    } catch (err) {
      rates.push({ cle: a.cle, langue: a.langue, motif: motifLisible(err as Error) });
    }
  }

  return NextResponse.json({
    enregistres: faits.length,
    deja_la: enPlace.length,
    rates,
    signes,
    cout_dollars: Math.round(signes * DOLLAR_PAR_SIGNE * 1000) / 1000,
    /* Ce qu'on veut lire après : à partir de maintenant, ces phrases-là ne se
       paieront plus jamais. */
    desormais_gratuit: faits.length + enPlace.length,
  });
}
