import { NextRequest, NextResponse } from "next/server";
import { verifierCode } from "@/lib/codes";
import { ajouterCorrection, retirerCorrection } from "@/lib/lexique";
import { noterTentative } from "@/lib/lecons-vues";
import { langueDe } from "@/lib/repertoire";
import { noterPanne } from "@/lib/panne";

/* ── LE BOUTON QUI NE PEUT PAS ÊTRE MAL ENTENDU ─────────────────────────────

   Lamine, le 14 septembre 2026 au soir, après avoir essayé « garde garde » :

     « Le mieux c'est de mettre un bouton bleu pendant la session
       d'apprentissage au lieu de lui demander de mémoriser. Si j'appuie sur
       ce bouton elle mémorise directement. »

   Il a raison, et il a raison pour une raison précise que les mesures de la
   soirée rendent indiscutable.

   ── POURQUOI LA VOIX NE POUVAIT PAS TENIR CE RÔLE ──────────────────────────

   Trois murs successifs, et chacun était réel :

     1. la liste fermée n'attrapait pas ses phrases de professeur — on l'a
        élargie, il a dit « garde garde », et le redoublement n'y était pas ;
     2. le modèle, lui, comprend — mais il répondait « mémorisé, papa » sans
        rien écrire, et il a fallu une balise pour le forcer ;
     3. et sous les deux, l'oreille : sur quarante écoutes ce soir-là, seize
        reprises, seize échecs, et des langues détectées qui allaient du
        slovaque au hongrois. « Très bien, mémorise ça » est ressorti en
        « Très bien. Mémorisez quoi ».

   On peut réparer 1 et 2. On ne peut pas réparer 3 depuis ici. Tant que la
   validation passe par la voix, elle traverse un moteur qui se trompe une
   fois sur trois — et une validation qui se trompe est pire qu'absente : elle
   range une phrase abîmée sous le sceau « validé par Lamine ».

   UN APPUI NE SE TRANSCRIT PAS. C'est tout l'argument. La phrase à garder est
   déjà en main — c'est celle qu'elle vient de répéter, celle qu'il vient
   d'entendre et de juger bonne. Le geste ne fait que dire oui, et il n'y a
   aucun endroit où se tromper entre son doigt et Supabase.

   ── CE QUE CETTE ROUTE ÉCRIT, ET CE QU'ELLE N'ÉCRIT PAS ────────────────────

   Elle écrit le texte qu'on lui donne, tel quel, sous l'auteur
   « maitre-vocal ». Pas de correction d'orthographe, pas de reformulation,
   pas de traduction ajoutée : c'est sa langue à lui.

   Et elle est réservée au CODE MAÎTRE, comme tout ce qui touche à sa
   mémoire — un testeur ne doit pas pouvoir y écrire une ligne.

   DELETE fait l'inverse, et seulement sur ce qu'il a posé lui-même : le
   bouton d'à côté, pour la phrase qu'on vient de garder et qui n'était pas
   la bonne.                                                                */

function refuse(request: NextRequest) {
  const verdict = verifierCode(request.headers.get("x-bia-code"));
  if (!verdict.ok || !verdict.maitre) {
    return NextResponse.json({ erreur: "Réservé au code maître." }, { status: 401 });
  }
  return null;
}

/** Ce qu'on accepte de garder. Trop court : ce n'est pas une phrase. */
function texteDe(brut: unknown): string {
  return String(brut || "").trim().slice(0, 400);
}

export async function POST(request: NextRequest) {
  const non = refuse(request);
  if (non) return non;

  let texte = "";
  try {
    const corps = await request.json() as { texte?: string };
    texte = texteDe(corps.texte);
  } catch { texte = ""; }

  if (texte.length < 2) {
    /* On ne range pas le vide, et on le DIT — un bouton qui répond « c'est
       fait » sans rien faire est exactement la faute qu'on vient de réparer. */
    return NextResponse.json(
      { erreur: "Il n'y a rien à garder : dis-moi la phrase, elle la répète, puis appuie." },
      { status: 400 },
    );
  }

  try {
    await ajouterCorrection({
      source: texte, corrigee: texte, langue: langueDe(texte),
      auteur: "maitre-vocal", application: "bia",
    });
  } catch (err) {
    console.error("BIA — le bouton « garder » n'a pas abouti :", (err as Error).message);
    noterPanne("bouton garder", (err as Error).message, "retenir");
    noterTentative({
      dit: "(bouton)", maitre: true, ordre: "retiens", en_main: true,
      signes_en_main: texte.length, ecrit: false,
      motif: `le rangement a refusé : ${(err as Error).message}`.slice(0, 200),
    });
    return NextResponse.json(
      { erreur: "Le rangement n'a pas répondu. Rien n'a été gardé." }, { status: 502 },
    );
  }

  noterTentative({
    dit: "(bouton)", maitre: true, ordre: "retiens", en_main: true,
    signes_en_main: texte.length, ecrit: true, motif: "rangée par le bouton",
  });
  /* On rend le texte gardé : le téléphone l'affiche, et il voit EXACTEMENT ce
     qui est entré — pas un « c'est fait » qui ne dit rien de ce qui est
     dedans. C'est ce qui lui permet d'attraper une transcription abîmée avant
     qu'elle ne s'installe. */
  return NextResponse.json({ retenu: texte });
}

export async function DELETE(request: NextRequest) {
  const non = refuse(request);
  if (non) return non;

  const texte = texteDe(new URL(request.url).searchParams.get("texte"));
  if (texte.length < 2) {
    return NextResponse.json({ erreur: "Rien à enlever." }, { status: 400 });
  }
  try {
    const partis = await retirerCorrection(texte, "maitre-vocal");
    noterTentative({
      dit: "(bouton)", maitre: true, ordre: "oublie", en_main: true,
      signes_en_main: texte.length, ecrit: partis > 0,
      motif: partis > 0 ? `retiré (${partis})` : "rien à retirer sous ce texte",
    });
    return NextResponse.json({ retires: partis });
  } catch (err) {
    noterPanne("bouton oublier", (err as Error).message, "retenir");
    return NextResponse.json(
      { erreur: "Le rangement n'a pas répondu. Rien n'a été enlevé." }, { status: 502 },
    );
  }
}
