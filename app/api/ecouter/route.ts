import { NextRequest, NextResponse } from "next/server";
import { verifierCode } from "@/lib/codes";
import { transcrire } from "@/lib/ecoute";
import { motsCorriges } from "@/lib/lexique";
import { pourScribe } from "@/lib/mots-a-entendre";
import { noterPanne } from "@/lib/panne";
import { annoncerLaFin, cleValide, oublierLeDepot, recoudre } from "@/lib/morceaux-de-parole";

export async function POST(request: NextRequest) {
  try {
    const verdict = verifierCode(request.headers.get("x-bia-code"));
    if (!verdict.ok) return NextResponse.json({ erreur: "code" }, { status: 401 });

    const form = await request.formData();

    /* ── LE SON EST DÉJÀ LÀ, OU IL ARRIVE AVEC CETTE REQUÊTE ───────────────

       Deux chemins, et le premier est nouveau.

       AU FIL DE L'EAU : le téléphone a déposé les morceaux pendant que Lamine
       parlait (voir lib/morceaux-de-parole.ts). Il ne nous envoie ici qu'un
       identifiant de tour, et tout le son est déjà à Francfort. C'est la
       seconde et demie qu'on reprend.

       ENTIER : l'ancien chemin, inchangé. Le fichier voyage maintenant. Le
       téléphone y revient de lui-même dès qu'un morceau s'est perdu, et c'est
       ce qui rend le nouveau chemin sans danger.

       L'ordre compte : on regarde d'abord s'il y a un fichier entier. Quand
       le téléphone a décidé de se replier, sa décision fait foi. */
    let fichier = form.get("audio");
    let recousu = false;
    const tour = cleValide(form.get("tour"));
    if (!(fichier instanceof Blob) && tour) {
      /* Le compte des morceaux vient d'ici, pas des morceaux eux-mêmes : seul
         le téléphone a vu l'enregistreur s'arrêter, et il ne le sait qu'à cet
         instant. Sans ce nombre, on ne pourrait pas distinguer « il en manque
         un » de « c'était le dernier ». */
      const annonce = annoncerLaFin(tour, Number(form.get("total")));
      if (!annonce.ok) {
        return NextResponse.json(
          { erreur: "dépôt incomplet", motif: annonce.motif, renvoyer: true }, { status: 409 },
        );
      }
      const fil = recoudre(tour);
      if (!fil.ok) {
        /* On le DIT au téléphone au lieu de rendre un texte vide : il saura
           renvoyer le fichier entier, et Lamine n'aura rien vu passer. */
        return NextResponse.json(
          { erreur: "dépôt incomplet", motif: fil.motif, renvoyer: true }, { status: 409 },
        );
      }
      fichier = new File([fil.son.blob], fil.son.nom, { type: fil.son.blob.type });
      recousu = true;
    }
    if (!(fichier instanceof Blob)) return NextResponse.json({ erreur: "Aucun enregistrement." }, { status: 400 });
    if (fichier.size > 20 * 1024 * 1024) return NextResponse.json({ erreur: "Enregistrement trop long." }, { status: 413 });
    /* Si le téléphone s'est replié sur l'envoi entier, le dépôt commencé ne
       sert plus à rien : il meurt tout de suite plutôt que d'attendre sa
       minute. C'est de la voix ; elle ne traîne pas. */
    if (!recousu && tour) oublierLeDepot(tour);

    const indice = String(form.get("indice_langue") || "") || null;
    /* LE NOM DU FICHIER VIENT DU TÉLÉPHONE, PAS D'ICI.

       Il était écrit en dur : « parole.webm », quel que soit ce qu'on
       recevait vraiment. Safari — Mac et iPhone — enregistre en MP4 : on
       annonçait donc du webm à ElevenLabs en lui tendant du MP4, et il
       refusait. Le format d'un enregistrement ne se décide pas sur le
       serveur : il se constate. */
    const nom = (fichier instanceof File && fichier.name) ? fichier.name : "parole.webm";
    /* ── LES MOTS QU'ON LUI DONNE D'AVANCE ─────────────────────────────

       Sa règle du 12 septembre au soir : « les mots corrigés doivent être
       prioritaires si leur équivalent n'existe pas sur les phrases
       enregistrées. » Les corrections viennent de Supabase (déjà en cache
       d'une minute) ; si elles ne répondent pas, on envoie la liste sans
       elles plutôt que de ne rien envoyer. */
    let mots: string[] = [];
    try {
      mots = pourScribe(await motsCorriges(60));
    } catch (err) {
      console.error("BIA — mots corrigés indisponibles :", (err as Error).message);
      try { mots = pourScribe([]); } catch { mots = []; }
    }
    const reco = await transcrire(fichier, nom, indice, mots);
    /* `au_fil_de_leau` dit par quel chemin le son est arrivé. Sans lui, on ne
       saurait pas si le chemin rapide sert vraiment, ou s'il se replie en
       silence sur l'ancien depuis des jours — c'est exactement le genre
       d'aveuglement qui nous a coûté deux soirées sur la mémoire. */
    return NextResponse.json({ ...reco, au_fil_de_leau: recousu });
  } catch (err) {
    /* ── UNE ÉCOUTE QUI ÉCHOUE NE LAISSAIT AUCUNE TRACE ──────────────────

       Le 12 septembre 2026 à deux heures du matin, Lamine : « elle répète
       toujours : je ne t'entends pas bien, répète s'il te plaît. »

       Cette route était la DERNIÈRE à ne pas noter ses pannes — la voix avait
       été corrigée le 10 septembre, pas elle. Elle renvoyait { texte: "" }, et
       le téléphone lisait ce vide comme « je n'ai rien entendu ». Le vrai
       motif — une clé refusée, un quota épuisé, un format rejeté — mourait
       dans un console.error que personne ne lit. /api/etat affichait
       « 0 panne » pendant que chaque phrase se perdait.

       Maintenant ça se voit dans /api/etat, et le téléphone reçoit « panne »
       pour dire à la personne que c'est SON OREILLE qui est cassée, pas sa
       voix à elle. Les deux phrases n'appellent pas la même réaction : on ne
       répète pas plus fort devant un micro qui ne transmet rien. */
    const motif = (err as Error).message;
    console.error("BIA — l'écoute a échoué :", motif);
    noterPanne("l'écoute a échoué", motif.slice(0, 300), "ecoute");
    return NextResponse.json({ texte: "", panne: true, motif: motif.slice(0, 200) }, { status: 502 });
  }
}
