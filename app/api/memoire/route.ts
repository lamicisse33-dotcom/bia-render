import { NextRequest, NextResponse } from "next/server";
import { verifierCode } from "@/lib/codes";
import { lexiqueConfig, retirerCorrection } from "@/lib/lexique";
import { empreinteDe } from "@/lib/empreinte";
import { noterPanne } from "@/lib/panne";

/* ── SA VOIX, GARDÉE À CÔTÉ DU TEXTE ────────────────────────────────────────

   Lamine, le 14 septembre 2026 : « il vaut mieux qu'elle entende ce que je
   dis et la manière dont je le dis. »

   ── CE QUE CETTE ROUTE FAIT, ET CE QU'ELLE NE FAIT PAS ──────────────────────

   Elle ne fait PAS apprendre à BIA à prononcer. Il faut le dire ici, une fois,
   en clair : le moteur de voix reçoit du TEXTE et rend du son. Il n'a pas
   d'oreille. Lui donner cent fois le même enregistrement ne change rien à ce
   qu'il prononcera demain. Ce qui change sa prononciation, c'est l'orthographe
   qu'on lui envoie — et c'est ce que la boucle fait déjà, sans qu'on ait à y
   penser : à chaque fois que Lamine redit la phrase, le micro l'écrit un peu
   autrement, et une écriture différente donne un son différent.

   CE QU'ELLE FAIT, ET QUI VAUT PLUS. Elle garde SA VOIX à lui, à côté du texte
   qu'il a validé. C'est la preuve de comment ça se dit — la seule chose qui
   permettra un jour de corriger le moteur pour de bon, et le corpus wolof que
   personne d'autre n'a. Un texte validé sans le son qui l'accompagne, c'est un
   avis ; avec le son, c'est une référence.

   ── OÙ ÇA VIT ──────────────────────────────────────────────────────────────

   Dans le seau `lecons`, sous « voix/ ». PAS dans un seau neuf : chaque seau
   de plus est une manipulation de plus à lui demander, et celui-ci existe
   déjà, il est privé, et il est fait pour ce qu'il lui apprend.

   Le nom du fichier est l'EMPREINTE du texte. Donc le même texte redit une
   seconde fois remplace le premier enregistrement au lieu d'en empiler un
   deuxième — et on retrouve toujours le son à partir du texte, sans table ni
   index.                                                                    */

const SEAU = process.env.SUPABASE_BUCKET_LECONS || "lecons";

function refuse(request: NextRequest): NextResponse | null {
  const verdict = verifierCode(request.headers.get("x-bia-code"));
  if (!verdict.ok || !verdict.maitre) {
    return NextResponse.json({ erreur: "Réservé au code maître." }, { status: 401 });
  }
  return null;
}

const entetes = (type?: string) => ({
  apikey: lexiqueConfig.cle,
  Authorization: `Bearer ${lexiqueConfig.cle}`,
  ...(type ? { "content-type": type } : {}),
});

/** Le chemin du son d'un texte. Voir plus haut : l'empreinte EST le nom. */
/* Non exportée : un fichier de route Next ne peut exporter que ses verbes
   HTTP — sinon la construction refuse tout le fichier. */
function cheminDuSon(texte: string, extension: string): string {
  return `voix/${empreinteDe(texte)}.${extension.replace(/[^a-z0-9]/gi, "").slice(0, 5) || "webm"}`;
}

export async function POST(request: NextRequest) {
  const refus = refuse(request);
  if (refus) return refus;
  if (!lexiqueConfig.actif) {
    return NextResponse.json({ erreur: "Supabase n'est pas configuré sur ce serveur." }, { status: 503 });
  }
  try {
    const forme = await request.formData();
    const texte = String(forme.get("texte") || "").trim();
    const fichier = forme.get("audio");
    if (!texte) return NextResponse.json({ erreur: "Quel texte ?" }, { status: 400 });
    if (!(fichier instanceof Blob)) {
      /* PAS DE SON : ce n'est pas une panne. Le texte a déjà été gardé dans le
         lexique par la route de la conversation ; le son est un PLUS. On le
         dit, et on n'échoue pas — sinon « mémorise » semblerait raté alors que
         l'essentiel est fait. */
      return NextResponse.json({ garde: false, motif: "aucun son à garder" });
    }
    if (fichier.size > 8 * 1024 * 1024) {
      return NextResponse.json({ garde: false, motif: "enregistrement trop long" });
    }

    const nom = (fichier instanceof File && fichier.name) ? fichier.name : "parole.webm";
    const extension = nom.split(".").pop() || "webm";
    const ou = cheminDuSon(texte, extension);
    const r = await fetch(`${lexiqueConfig.url}/storage/v1/object/${SEAU}/${ou}`, {
      method: "POST",
      headers: {
        ...entetes(fichier.type || "audio/webm"),
        "x-upsert": "true",
        "cache-control": "no-cache",
      },
      body: new Uint8Array(await fichier.arrayBuffer()),
    });
    if (!r.ok) throw new Error(`le dépôt a été refusé (${r.status}) : ${(await r.text()).slice(0, 200)}`);
    return NextResponse.json({ garde: true, ou });
  } catch (err) {
    const motif = (err as Error).message;
    console.error("BIA — sa voix n'a pas pu être gardée :", motif);
    noterPanne("sa voix n'a pas été gardée", motif.slice(0, 300), "memoire");
    /* Là encore : le texte est déjà retenu. On ne transforme pas un « plus »
       manqué en échec de la mémoire. */
    return NextResponse.json({ garde: false, motif: motif.slice(0, 160) });
  }
}

/* ── « EFFACE ÇA DE TA MÉMOIRE » ────────────────────────────────────────────

   Ses mots. Et il faut que ça efface les DEUX : le texte dans le lexique, et
   le son à côté. Effacer l'un en laissant l'autre donnerait une mémoire qui
   dit avoir oublié tout en gardant la trace — c'est exactement ce qu'on ne
   veut pas d'une mémoire à qui on demande d'oublier.

   Et ça n'efface que ce que LUI a posé à la voix : `auteur` vaut
   « maitre-vocal ». Les corrections faites au bouton « Mal dit », par lui ou
   par un testeur, ne bougent pas. */
export async function DELETE(request: NextRequest) {
  const refus = refuse(request);
  if (refus) return refus;
  const texte = (new URL(request.url).searchParams.get("texte") || "").trim();
  if (!texte) return NextResponse.json({ erreur: "Quoi, exactement ?" }, { status: 400 });
  try {
    const combien = await retirerCorrection(texte, "maitre-vocal");
    /* Le son : on essaie les extensions qu'un téléphone peut produire. Un
       fichier absent n'est pas une erreur — il n'y en avait peut-être pas. */
    let sonEfface = false;
    for (const ext of ["webm", "m4a", "ogg", "wav", "mp4"]) {
      try {
        const r = await fetch(
          `${lexiqueConfig.url}/storage/v1/object/${SEAU}/${cheminDuSon(texte, ext)}`,
          { method: "DELETE", headers: entetes() },
        );
        if (r.ok) sonEfface = true;
      } catch { }
    }
    return NextResponse.json({ efface: combien, son: sonEfface });
  } catch (err) {
    const motif = (err as Error).message;
    console.error("BIA — l'effacement a échoué :", motif);
    noterPanne("effacement de mémoire", motif.slice(0, 300), "memoire");
    return NextResponse.json({ erreur: motif.slice(0, 160) }, { status: 502 });
  }
}
