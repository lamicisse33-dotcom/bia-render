import { NextRequest, NextResponse } from "next/server";
import { verifierCode } from "@/lib/codes";
import {
  construireRappel, intentionRappel, phraseDesRappels, prochaineSonnerie,
  rappelsVises, type Rappel,
} from "@/lib/rappels";
import { lire, ecrire } from "@/lib/rappels-depot";
import { armerHorloge, balayerLesRappels } from "@/lib/rappels-horloge";

/* ── LES RAPPELS DE MÉDICAMENTS, À LA VOIX ─────────────────────────────────

   Lamine, le 24 octobre 2026 : « création à la voix (« rappelle-moi mon
   médicament à 8 h et 20 h »), rappel qui sonne même BIA fermée, liste et
   suppression à la voix. Les rappels restent privés à la personne, jamais
   dans la mémoire commune ni visibles d'un autre. »

   ── PRIVÉS PAR CONSTRUCTION, PAS PAR PROMESSE ─────────────────────────────

   La clé de rangement est l'identifiant du profil, et le serveur n'écrit
   JAMAIS que celui de la personne qui parle : il ne vient pas du corps de la
   requête. Un navigateur ne peut donc pas demander les rappels d'un autre,
   même en trichant — il n'y a aucun champ pour le dire.

   ── « BIA DOIT LE DIRE CLAIREMENT » ───────────────────────────────────────

   « Si le rappel ne peut pas sonner (app non installée, notifications
   refusées), BIA doit le dire clairement. » Chaque réponse porte donc
   `sonnera` et `pourquoi_pas`, et la consigne de l'outil interdit d'annoncer
   un rappel posé sans répéter ce que dit ce champ. Un rappel de médicament
   qu'on croit posé et qui ne sonnera jamais est pire que pas de rappel. */

const DECIDE = "x-bia-code";

/* ── À QUI SONT CES RAPPELS — LE MÊME RANGEMENT QUE SA MÉMOIRE ────────────

   On reprend EXACTEMENT le modèle de app/api/chat/route.ts (« à qui elle
   parle, pour savoir de qui se souvenir ») : le maître par son CODE, les
   autres par leur identifiant de profil. C'est la règle de Lamine — « Khalam
   Rapide et Khalam = même BIA, mêmes écritures » : un rappel posé sur un
   moteur doit se relire sur l'autre, donc la clé doit être la même.

   ET UN TROISIÈME CAS, PARCE QU'UN MÉDICAMENT NE PEUT PAS ATTENDRE UN
   PROFIL : quelqu'un qui n'a pas de profil est rangé par un jeton
   d'appareil. Ce jeton ne dit pas qui c'est, il dit « le même téléphone »
   (voir lib/appareil.ts). Sans profil ET sans jeton, on ne range rien :
   mieux vaut aucun rappel qu'un tas où chacun entend l'ordonnance du voisin.

   CE QUE ÇA VAUT, DIT FRANCHEMENT : l'identifiant de profil arrive du
   téléphone, donc quelqu'un qui le connaîtrait pourrait le réclamer. C'est
   le même compromis que la mémoire de BIA depuis le 10 septembre, et il est
   assumé là-bas pour la même raison. Le code maître, lui, ne se devine pas. */
function quiParle(request: NextRequest): { ok: boolean; personne: string; maitre: boolean } {
  const verdict = verifierCode(request.headers.get(DECIDE));
  if (!verdict.ok) return { ok: false, personne: "", maitre: false };
  const propre = (v: string | null, max = 60) => String(v || "").trim().replace(/[^A-Za-z0-9_-]/g, "").slice(0, max);
  const profil = propre(request.headers.get("x-bia-personne"));
  const appareil = propre(request.headers.get("x-bia-appareil"), 40);
  const personne = verdict.maitre ? "maitre" : profil ? "profil-" + profil : appareil ? "appareil-" + appareil : "";
  return { ok: Boolean(personne), personne, maitre: Boolean(verdict.maitre) };
}

function peutSonner(d: { abonnements?: unknown[] }) {
  const combien = (d.abonnements || []).length;
  return combien > 0
    ? { sonnera: true as const, pourquoi_pas: null, telephones: combien }
    : {
        sonnera: false as const,
        telephones: 0,
        pourquoi_pas:
          "Aucun téléphone n'est abonné aux notifications. Dis-le-lui clairement : " +
          "le rappel est gardé, mais il ne sonnera pas tant que BIA n'est pas installée sur " +
          "l'écran d'accueil et que les notifications ne sont pas acceptées.",
      };
}

const vuDehors = (r: Rappel) => ({ id: r.id, quoi: r.quoi, heures: r.heures });

export async function GET(request: NextRequest) {
  const qui = quiParle(request);
  if (!qui.ok) return NextResponse.json({ erreur: "code" }, { status: 401 });
  armerHorloge();
  const d = await lire(qui.personne);
  return NextResponse.json({
    rappels: (d.rappels || []).map(vuDehors),
    phrase: phraseDesRappels(d.rappels || []),
    ...peutSonner(d),
  }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const qui = quiParle(request);
  if (!qui.ok) return NextResponse.json({ erreur: "code" }, { status: 401 });
  armerHorloge();

  const corps = await request.json().catch(() => ({})) as { phrase?: string; action?: string; id?: string };
  const phrase = String(corps.phrase || "").slice(0, 400);
  const d = await lire(qui.personne);
  const rappels = d.rappels || [];

  /* Une action explicite l'emporte sur la phrase : c'est le chemin de
     l'écran, et il ne doit pas dépendre de l'interprétation d'un texte. */
  if (corps.action === "supprime" && corps.id) {
    const reste = rappels.filter((r) => r.id !== corps.id);
    if (reste.length === rappels.length)
      return NextResponse.json({ fait: false, raison: "Ce rappel n'existe plus.", rappels: rappels.map(vuDehors) });
    d.rappels = reste;
    const ecrit = await ecrire(qui.personne, d);
    return NextResponse.json({ fait: ecrit, supprimes: 1, rappels: reste.map(vuDehors), phrase: phraseDesRappels(reste) });
  }

  const i = intentionRappel(phrase);

  if (i.action === "liste")
    return NextResponse.json({ fait: true, action: "liste", rappels: rappels.map(vuDehors), phrase: phraseDesRappels(rappels), ...peutSonner(d) });

  if (i.action === "supprime") {
    const vises = rappelsVises(rappels, i);
    /* ON N'EFFACE JAMAIS SUR UN DOUTE. Sans désignation claire et avec
       plusieurs rappels, on rend la liste et on laisse demander : supprimer
       le mauvais médicament est irréparable, redemander coûte une phrase. */
    if (!vises.length)
      return NextResponse.json({
        fait: false, action: "supprime", ambigu: rappels.length > 1,
        rappels: rappels.map(vuDehors), phrase: phraseDesRappels(rappels),
        raison: rappels.length
          ? "Je ne sais pas lequel elle veut enlever. Demande-lui lequel, en citant ceux qui existent."
          : "Elle n'a aucun rappel à enlever.",
      });
    const reste = rappels.filter((r) => !vises.includes(r));
    d.rappels = reste;
    const ecrit = await ecrire(qui.personne, d);
    return NextResponse.json({
      fait: ecrit, action: "supprime", supprimes: vises.map(vuDehors),
      rappels: reste.map(vuDehors), phrase: phraseDesRappels(reste),
    });
  }

  if (i.action !== "ajoute")
    return NextResponse.json({
      fait: false, action: null,
      raison: "Je n'ai pas entendu d'heure. Demande-lui à quelle heure elle veut être rappelée.",
      rappels: rappels.map(vuDehors),
    });

  const neuf = construireRappel(i);
  if (!neuf) return NextResponse.json({ fait: false, raison: "Aucune heure comprise." }, { status: 400 });
  /* Borné : vingt rappels par personne. Au-delà ce n'est plus un traitement,
     et une notification toutes les dix minutes deviendrait du harcèlement. */
  if (rappels.length >= 20)
    return NextResponse.json({ fait: false, raison: "Elle a déjà vingt rappels. Propose d'en enlever un." });
  d.rappels = [...rappels, neuf];
  const ecrit = await ecrire(qui.personne, d);
  if (!ecrit) return NextResponse.json({ fait: false, raison: "Le rangement n'a pas répondu. Ne dis pas que c'est noté." });

  const quand = prochaineSonnerie(neuf, Date.now());
  /* Un rappel « dans deux minutes » ne doit pas attendre le prochain réveil
     extérieur : on balaie tout de suite, et l'horloge de trente secondes est
     armée par armerHorloge() plus haut. */
  void balayerLesRappels();
  return NextResponse.json({
    fait: true, action: "ajoute", rappel: vuDehors(neuf),
    dans_minutes: quand === null ? null : Math.max(0, Math.round((quand - Date.now()) / 60000)),
    rappels: d.rappels.map(vuDehors), phrase: phraseDesRappels(d.rappels),
    ...peutSonner(d),
  });
}
