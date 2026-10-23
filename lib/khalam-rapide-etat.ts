/* ── KHALAM RAPIDE : LA SEULE MESURE QUI COMPTE, DÉCLARÉE PAR LE TÉLÉPHONE ──

   Décision de Lamine le 23 octobre 2026 : Khalam Rapide devient la connexion
   par défaut pour tout le monde, et son délai doit se lire dans /api/etat.

   CE QU'ON MESURE : de la fin de SA parole au premier son de BIA, tel que le
   navigateur l'a vécu — y compris le temps que le haut-parleur met à démarrer
   (le client ajoute l'avance de planification de l'AudioContext). C'est le
   seul chiffre que RÈGLE 1 de AVANT-DE-DIRE-QUE-C-EST-BON.md accepte pour
   dire qu'une écoute ou une voix va plus vite : il vient de ses oreilles.

   CE QU'ON NE MESURE PAS, et qu'on n'en déduira pas : le silence de fin de
   parole décidé par la détection d'activité de la connexion rapide, et le
   réseau de son téléphone. Les deux sont dedans sans être séparés.

   Durées et compteurs seulement. Aucun texte, aucune transcription, aucun
   son, aucun code d'accès ne passe par ici. */

type Mesure = { ms: number; quand: string };
type Etat = { mesures: Mesure[]; tours: number; refusees: number; doublons: number; vus: Map<string, number>; basculements: { vers_rapide: number; vers_khalam: number } };
const g = globalThis as typeof globalThis & { biaKhalamRapide?: Etat };
const etat: Etat = (g.biaKhalamRapide ??= { mesures: [], tours: 0, refusees: 0, doublons: 0, vus: new Map<string, number>(), basculements: { vers_rapide: 0, vers_khalam: 0 } });

const BORNE_MS = 60000;
const SESSIONS_AU_PLUS = 200;

/* ── LE FILET, CETTE FOIS SOUS LE BON TROU ─────────────────────────────────

   Première version : je bornais les valeurs impossibles. Le 23 octobre à
   22:28, neuf mesures d'une même réponse sont passées — toutes dans les
   bornes, toutes fausses. `mesures_refusees` affichait 0 pendant que le
   champ était pollué. C'est RÈGLE 4 mot pour mot : « un filet doit être posé
   sous le défaut réel ».

   Le défaut réel était le DOUBLON DE TOUR, pas la valeur aberrante. Le
   navigateur numérote donc ses tours (session + rang), et un tour déjà vu
   est refusé et compté à part. Un seuil de temps n'aurait pas marché : avec
   Khalam Rapide ouverte à tout le monde, deux personnes peuvent mesurer
   dans la même seconde sans que ce soit un doublon.

   La table des sessions est bornée : la plus ancienne part quand elle
   déborde. Aucun identifiant de personne ici — un jeton tiré au hasard par
   le navigateur, sans lien avec un code d'accès. */

/** Le téléphone dit combien de temps il a attendu le premier son. Rien d'autre. */
export function noterKhalamRapide(d: Record<string, unknown>) {
  if (d.etape === "bascule") {
    if (d.vers === "rapide") etat.basculements.vers_rapide += 1;
    else if (d.vers === "khalam") etat.basculements.vers_khalam += 1;
    return;
  }
  const ms = Number(d.ms);
  /* Une mesure hors bornes est refusée et COMPTÉE : un compteur muet est ce
     qui a caché six jours de wolof refusé (RÈGLE 3). */
  if (d.etape !== "premier_son" || !Number.isFinite(ms) || ms < 0 || ms > BORNE_MS) { etat.refusees += 1; return; }
  const session = String(d.session ?? "").slice(0, 40), tour = Number(d.tour);
  /* Une mesure sans numéro de tour vient d'un téléphone qui n'a pas encore
     la nouvelle page : on la refuse plutôt que de la mélanger. */
  if (!/^[a-z0-9]{4,40}$/.test(session) || !Number.isSafeInteger(tour) || tour < 1) { etat.refusees += 1; return; }
  const dernier = etat.vus.get(session);
  if (dernier !== undefined && tour <= dernier) { etat.doublons += 1; return; }
  etat.vus.delete(session);
  etat.vus.set(session, tour);
  while (etat.vus.size > SESSIONS_AU_PLUS) etat.vus.delete(etat.vus.keys().next().value as string);
  etat.tours += 1;
  etat.mesures.push({ ms: Math.round(ms), quand: new Date().toISOString() });
  etat.mesures = etat.mesures.slice(-90);
}

const mediane = (n: number[]) => {
  const a = [...n].sort((x, y) => x - y), m = Math.floor(a.length / 2);
  return a.length ? (a[m] + a[(a.length - 1) >> 1]) / 2 : null;
};

export function resumeKhalamRapide() {
  const ms = etat.mesures.map((m) => m.ms);
  return {
    revision: "khalam-rapide-par-defaut-v1",
    defaut_pour_tous: true,
    tours_mesures: etat.tours,
    mesures_refusees: etat.refusees,
    tours_en_double_refuses: etat.doublons,
    telephones_mesures: etat.vus.size,
    fin_de_parole_au_premier_son: {
      mediane_ms: mediane(ms),
      minimum_ms: ms.length ? Math.min(...ms) : null,
      maximum_ms: ms.length ? Math.max(...ms) : null,
      derniers_ms: etat.mesures.slice(-12),
    },
    basculements: { ...etat.basculements },
    limite:
      "Mesure navigateur déclarée : de la fin de sa parole au premier son, avance de planification audio comprise. " +
      "Une seule mesure par tour, armée par une parole entendue pendant qu'elle se tait : un tour où on lui coupe la parole n'est pas mesuré. " +
      "Le silence de fin de parole décidé par la détection d'activité et le réseau du téléphone sont dedans sans être séparés. " +
      "Aucun texte, transcription ni son n'est exporté.",
  };
}
