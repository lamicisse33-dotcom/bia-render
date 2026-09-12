import { NextRequest, NextResponse } from "next/server";
import { KBITS, versMp3 } from "@/lib/mp3";
import { verifierCode } from "@/lib/codes";
import { lexiqueConfig } from "@/lib/lexique";
import { REPERTOIRE, RELU, etatRepertoire, repertoireActif } from "@/lib/repertoire";
import { NOUVELLES, RELU_BASE } from "@/lib/base-textes";
import { GUIDAGE, RELU_GUIDAGE } from "@/lib/guidage-textes";
import { A_FABRIQUER, cleDe } from "@/lib/attente";
import { BLAGUES, RELU_BLAGUES } from "@/lib/blagues-textes";
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
/* La version légère, à côté de l'original. Les deux cohabitent : le WAV est
   ce qui a été payé, le MP3 est ce qu'on télécharge. */
const cheminMp3 = (cle: string, langue: string) => `${langue}/${cle}.mp3`;

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

/* ── « ABSENT » ET « JE N'AI PAS PU SAVOIR » NE SONT PAS LA MÊME CHOSE ──────

   Le 11 septembre 2026, en mesurant la taille des 222 sons pour Lamine, j'ai
   posé la question douze fois à la fois — comme le faisait le code que je
   venais d'écrire. Trente-trois fichiers sur deux cent vingt-deux m'ont
   répondu ceci, en cent vingt-cinq octets :

     {"statusCode":"429","error":"too_many_connections"}

   Les fichiers étaient là. Supabase refusait simplement de répondre si vite.
   Et l'ancien code lisait ce refus comme une absence — il aurait REFABRIQUÉ
   trente-trois sons déjà achetés, et fait payer Lamine deux fois pour rien.

   Mesuré ensuite : trente demandes à douze de front passent sans refus, mais
   deux cent vingt-deux d'affilée à cette largeur en font tomber une sur six.
   Le nombre exact n'est donc pas la garantie — la garantie est de ne jamais
   confondre les deux réponses.

     200 → le son est là (et on regarde sa taille : un fichier vide se refait)
     400 → le son n'existe pas ; c'est ce que Supabase répond pour un absent
     429 ou 5xx → on ne sait pas ; on réessaie, puis on l'avoue

   Un son « inconnu » n'est JAMAIS fabriqué. Ne rien dépenser et le dire vaut
   mieux que dépenser dans le doute. */
type EtatDuSon = "oui" | "non" | "inconnu";

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Le son est-il déjà là ? Une lecture de fiche, sans corps, sans coût. */
async function etatDuSon(cle: string, langue: string): Promise<EtatDuSon> {
  return etatDuFichier(chemin(cle, langue));
}

/** La même question, pour n'importe quel fichier du seau. */
async function etatDuFichier(ou: string): Promise<EtatDuSon> {
  const adresse = `${lexiqueConfig.url}/storage/v1/object/info/public/${SEAU}/${ou}`;
  /* Trois tentatives, en laissant Supabase respirer entre deux. */
  for (const pause of [0, 500, 1500]) {
    if (pause) await dormir(pause);
    try {
      const r = await fetch(adresse, { headers: entetes(), cache: "no-store" });
      if (r.ok) {
        /* La fiche donne la taille. Un « son » de cent octets n'est pas un
           son : c'est un dépôt coupé en route, et il faut le refaire. */
        const fiche = await r.json().catch(() => null) as { size?: number } | null;
        const taille = fiche && typeof fiche.size === "number" ? fiche.size : 0;
        return taille > 1000 ? "oui" : "non";
      }
      if (r.status === 400 || r.status === 404) return "non";
      /* 429, 5xx : Supabase est débordé, pas muet. On réessaie. */
    } catch {
      /* Coupure réseau : pareil, ça n'apprend rien sur le fichier. */
    }
  }
  return "inconnu";
}

async function deposer(cle: string, langue: string, audio: Buffer): Promise<boolean> {
  return deposerFichier(chemin(cle, langue), new Uint8Array(audio), "audio/wav",
    `répertoire : dépôt ${cle}/${langue}`);
}

async function deposerFichier(ou: string, octets: Uint8Array, type: string, quoi: string): Promise<boolean> {
  const r = await fetch(
    `${lexiqueConfig.url}/storage/v1/object/${SEAU}/${ou}`,
    {
      method: "POST",
      /* CE CACHE-CONTROL EST LA MOITIÉ DU GAIN, et il manquait.

         Mesuré le 12 septembre : les fichiers du répertoire arrivaient avec
         « cache-control: no-cache ». Le navigateur les reprenait donc au
         RÉSEAU à chaque fois, pour des fichiers gravés une fois pour toutes.
         Un an de garde : ils ne changent jamais, et si l'un devait changer,
         il changerait de nom.

         Le téléphone les garde aussi de son côté (voir octetsDuRepertoire
         dans app/page.tsx). Les deux ensemble, et « Salaam » ne coûte plus
         un octet après la première fois. */
      headers: { ...entetes(type), "x-upsert": "true", "cache-control": "public, max-age=31536000, immutable" },
      body: octets,
    },
  );
  if (!r.ok) {
    const detail = (await r.text().catch(() => "")).slice(0, 300);
    noterPanne(quoi, detail, "repertoire");
  }
  return r.ok;
}

/* ── ALLÉGER CE QUI EST DÉJÀ PAYÉ ──────────────────────────────────────────

   Lamine, le 12 septembre 2026 : « vas-y, il faut le convertir en MP3. »

   Mesuré : le WAV de « Salaam » pèse 136 364 octets, le MP3 à 64 kbit/s en
   pèse 23 232 — six fois moins à télécharger, pour la même voix. Sur un
   téléphone en 4G à Dakar, c'est la différence entre une réponse
   « instantanée » et une réponse qui commence par attendre.

   AUCUNE VOIX N'EST REPAYÉE. On ne redemande rien à Soynade : on relit le
   fichier déjà acheté, on le recompresse, on repose le résultat à côté. Et
   ON NE SUPPRIME RIEN — le WAV reste l'original, et le téléphone retombe
   dessus si un MP3 manque.

   ON N'EN FAIT QU'UN PAQUET PAR APPUI. Deux cent soixante-dix conversions
   d'affilée tiendraient une requête ouverte trois minutes, et une requête qui
   dure trois minutes finit par être coupée quelque part — on ne saurait même
   pas où ça s'est arrêté. Chaque appui en fait cent vingt et dit combien il
   en reste ; un deuxième appui finit le travail. C'est le même geste que pour
   l'enregistrement, et il le connaît déjà. */
const PAR_APPUI = 120;

type Allege = { faits: number; deja: number; rates: { ou: string; motif: string }[]; restent: number;
  avant: number; apres: number };

async function alleger(liste: Attendu[]): Promise<Allege> {
  /* On ne convertit que ce dont le WAV existe : convertir un son qui n'a pas
     encore été enregistré n'a pas de sens, et son MP3 arrivera au prochain
     appui — après l'enregistrement, qui tourne juste avant. */
  const etats = await parPaquets(liste, (a) => etatDuFichier(cheminMp3(a.cle, a.langue)));
  const aFaire = liste.filter((_, i) => etats[i] === "non");
  const deja = etats.filter((e) => e === "oui").length;

  const lot = aFaire.slice(0, PAR_APPUI);
  const rates: { ou: string; motif: string }[] = [];
  let faits = 0, avant = 0, apres = 0;

  const resultats = await parPaquets(lot, async (a) => {
    const ou = cheminMp3(a.cle, a.langue);
    try {
      const r = await fetch(
        `${lexiqueConfig.url}/storage/v1/object/public/${SEAU}/${chemin(a.cle, a.langue)}`,
        { headers: entetes(), cache: "no-store" },
      );
      /* Le WAV n'est pas là (400 de Supabase) : ce n'est pas une panne, c'est
         un son qui n'a pas encore été enregistré. On passe sans se plaindre. */
      if (!r.ok) return null;
      const wav = await r.arrayBuffer();
      if (wav.byteLength < 1000) return null;
      const mp3 = versMp3(wav);
      /* Un MP3 plus gros que son WAV voudrait dire qu'on s'est trompé de
         réglage : on ne dépose pas, ça ne ferait qu'alourdir. */
      if (mp3.length >= wav.byteLength) throw new Error("le MP3 n'allège rien");
      if (!(await deposerFichier(ou, mp3, "audio/mpeg", `répertoire : MP3 ${ou}`))) {
        throw new Error("dépôt refusé");
      }
      return { wav: wav.byteLength, mp3: mp3.length };
    } catch (err) {
      rates.push({ ou, motif: motifLisible(err as Error) });
      return null;
    }
  });

  for (const x of resultats) {
    if (!x) continue;
    faits++; avant += x.wav; apres += x.mp3;
  }

  return { faits, deja, rates, restent: Math.max(0, aFaire.length - lot.length), avant, apres };
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
    /* LE GUIDAGE. Troisième verrou, levé le 12 septembre 2026 — Lamine a
       corrigé les quarante-neuf dans la nuit, et trente-six ont changé. Et ici ce n'est pas une question
       d'argent — quarante-neuf phrases coûtent 0,65 $ en tout — mais
       de sécurité : une instruction mal dite fait manquer un carrefour. */
    ...(RELU_GUIDAGE ? GUIDAGE.map((e) => ({ cle: e.cle, wolof: e.wolof, francais: e.francais })) : []),
    /* LES DEUX PAROLES D'ATTENTE. Pas de verrou pour celles-là : leurs textes
       sont de Lamine depuis le 9 septembre et n'ont jamais bougé. Elles
       étaient fabriquées par Soynade à CHAQUE échange, faute d'avoir jamais
       été déposées — huit secondes et quelques signes payés, à chaque
       question, pour deux phrases qui ne changent jamais. */
    ...A_FABRIQUER.map((p) => ({ cle: cleDe(p), wolof: p.wo, francais: p.fr })),
    /* LES BLAGUES. Mêmes règles que tout le reste : achetées une fois, dites
       pour toujours. Leur rire, lui, est déjà dans public/sons/ — c'est la
       vraie voix de Kha, et il ne s'achète pas. */
    ...(RELU_BLAGUES ? BLAGUES.map((b) => ({ cle: b.cle, wolof: b.wolof, francais: b.francais })) : []),
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

   SIX questions à la fois, pas plus. Mesuré le même soir, trente demandes :

     une par une   8,3 s   aucun refus
     trois         4,0 s   aucun refus
     six           2,3 s   aucun refus
     douze         1,5 s   aucun refus sur trente… mais une sur six refusée
                           quand on tient cette largeur sur deux cent vingt-deux
     vingt         4,5 s   six refus sur trente, et PLUS LENT que six

   Vingt est plus lent que six : passé une certaine largeur, Supabase refuse,
   et un refus coûte plus cher en temps qu'il ne fait gagner. Six tient la
   vérification sous vingt secondes sans jamais s'en approcher. */
const DE_FRONT = 6;

async function parPaquets<T, R>(liste: T[], faire: (x: T) => Promise<R>): Promise<R[]> {
  const sortie: R[] = [];
  for (let i = 0; i < liste.length; i += DE_FRONT) {
    sortie.push(...(await Promise.all(liste.slice(i, i + DE_FRONT).map(faire))));
  }
  return sortie;
}

/** Le tri en TROIS tas : déjà là, à fabriquer, et « je n'ai pas pu savoir ».
    Gratuit — aucune voix n'est appelée ici. */
async function trier(liste: Attendu[]) {
  const etats = await parPaquets(liste, (a) => etatDuSon(a.cle, a.langue));
  const enPlace: Attendu[] = [];
  const aFaire: Attendu[] = [];
  const incertains: Attendu[] = [];
  liste.forEach((a, i) => {
    const tas = etats[i] === "oui" ? enPlace : etats[i] === "non" ? aFaire : incertains;
    tas.push(a);
  });
  return { enPlace, aFaire, incertains };
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
  const { enPlace, aFaire, incertains } = await trier(liste);
  const signes = aFaire.reduce((t, a) => t + a.texte.length, 0);

  /* Combien sont encore lourds. On le REGARDE ici, on ne le fait pas : cette
     route est celle qui ne dépense rien, et ça vaut aussi pour le temps. */
  const mp3 = await parPaquets(enPlace, (a) => etatDuFichier(cheminMp3(a.cle, a.langue)));
  const aAlleger = mp3.filter((e) => e === "non").length;

  return NextResponse.json({
    ...etatRepertoire(),
    /* Les chiffres que Lamine lit : combien de sons doivent exister, combien
       existent, combien manquent. Le premier ne bouge que quand on ajoute une
       réponse ; le deuxième est relu dans le seau à chaque appui. Et le
       quatrième est le plus honnête des quatre — ceux dont on n'a pas pu
       savoir. Il vaut zéro presque toujours ; quand il ne vaut pas zéro, il
       faut le voir plutôt que de le deviner. */
    attendus: liste.length,
    en_place: enPlace.length,
    manquants: aFaire.length,
    incertains: incertains.length,
    signes,
    cout_dollars: Math.round(signes * DOLLAR_PAR_SIGNE * 1000) / 1000,
    detail: aFaire.map((a) => ({ cle: a.cle, langue: a.langue, signes: a.texte.length })),
    /* Dire NON en expliquant pourquoi vaut mieux qu'un bouton qui ne fait
       rien : c'est ce qu'on lit quand l'enregistrement refuse de partir. */
    pret: RELU ? "oui" : "non — les textes attendent d'être relus par Lamine (RELU dans lib/repertoire.ts)",
    /* Le poids, et ce qu'il reste à alléger. Rien de tout ça ne coûte un
       centime de voix : les fichiers sont déjà payés, on ne fait que les
       recompresser. */
    a_alleger: aAlleger,
    deja_legers: enPlace.length - aAlleger,
    mp3_kbits: KBITS,
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
  if (!RELU && !RELU_BASE && !RELU_GUIDAGE) {
    return NextResponse.json({
      erreur: "Les textes n'ont pas encore été relus. Rien n'a été enregistré, et rien n'a été payé.",
    }, { status: 409 });
  }

  const faits: string[] = [];
  const rates: { cle: string; langue: string; motif: string }[] = [];
  let signes = 0;

  /* Le tri d'abord, par paquets de six : quelques secondes au lieu d'une
     minute. Ensuite seulement la dépense, et celle-là reste une par une —
     Soynade n'aime pas qu'on lui parle à six voix.

     LES INCERTAINS NE SONT PAS FABRIQUÉS. Un son dont Supabase n'a pas voulu
     dire s'il existe est peut-être déjà payé ; on ne le repaie pas dans le
     doute. On le dit, et un appui de plus tranchera. */
  const { enPlace, aFaire, incertains } = await trier(tousLesSonsAttendus());

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

  /* ── PUIS ON ALLÈGE, ET ÇA NE COÛTE RIEN ──────────────────────────────

     Après l'enregistrement, jamais avant : un son qu'on vient de fabriquer
     mérite son MP3 dans le même appui, et un son qui n'existe pas encore n'a
     rien à convertir.

     SI ÇA ÉCHOUE, L'ENREGISTREMENT RESTE FAIT. C'est la partie qui a coûté
     de l'argent ; elle ne doit pas être perdue parce qu'une compression a
     mal tourné. On rapporte l'échec et on rend la main. */
  let leger: Allege | null = null;
  try {
    leger = await alleger(tousLesSonsAttendus());
  } catch (err) {
    noterPanne("répertoire : allègement", (err as Error).message.slice(0, 300), "repertoire");
  }

  return NextResponse.json({
    enregistres: faits.length,
    deja_la: enPlace.length,
    incertains: incertains.length,
    rates,
    signes,
    cout_dollars: Math.round(signes * DOLLAR_PAR_SIGNE * 1000) / 1000,
    /* Ce qu'on veut lire après : à partir de maintenant, ces phrases-là ne se
       paieront plus jamais. */
    desormais_gratuit: faits.length + enPlace.length,
    /* Et ce qui vient de maigrir. Zéro dollar : aucune voix n'est repayée. */
    allegement: leger ? {
      convertis: leger.faits,
      deja_legers: leger.deja,
      restent: leger.restent,
      rates: leger.rates,
      avant_ko: Math.round(leger.avant / 1024),
      apres_ko: Math.round(leger.apres / 1024),
      fois_plus_petit: leger.apres ? Math.round((leger.avant / leger.apres) * 10) / 10 : null,
      cout_dollars: 0,
    } : { erreur: "l'allègement a échoué — l'enregistrement, lui, est fait" },
  });
}
