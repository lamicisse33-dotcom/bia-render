/* ── LE GUIDAGE : DES MANŒUVRES AUX PHRASES DE BIA ──────────────────────────

   Lamine, le 11 septembre 2026 : « BIA doit pouvoir guider une personne pour
   qu'elle se retrouve, comme Google Maps, Waze… elle se retire pour laisser
   la carte, mais on peut continuer à parler avec elle. »

   Ce fichier ne parle à personne et ne dessine rien. Il fait une seule chose,
   et c'est la seule qui mérite une épreuve : traduire ce qu'un calculateur
   d'itinéraire renvoie — « turn sharp left », « exit roundabout » — en une
   phrase que BIA a déjà enregistrée de sa voix.

   POURQUOI CE N'EST PAS DU TEXTE LIBRE. Fabriquer la voix prend deux secondes
   fixes plus 36 millisecondes par signe, mesuré sur le vrai serveur. À
   50 km/h, trois secondes font quarante mètres : le carrefour est passé. Donc
   chaque manœuvre doit tomber sur une CLÉ du répertoire de guidage, ou sur
   rien. Une manœuvre qu'on ne sait pas nommer se TAIT — elle ne s'improvise
   pas.

   POURQUOI LES RUES NE SONT PAS NOMMÉES. Mesuré le 11 septembre 2026 sur
   OpenStreetMap, Plateau et Grand Dakar : 15 445 tronçons de route, 2 128
   nommés — 14 %. Dans les rues de quartier, 10 %. Et sur un itinéraire réel
   Sandaga → université, 4 étapes sur 10 n'avaient aucun nom. Le guidage est
   donc géométrique : « dans cent mètres, tourne à droite ». C'est de toute
   façon ainsi qu'on guide quelqu'un ici. */

import { GUIDAGE } from "./guidage-textes";

/** Ce qu'une étape devient une fois traduite en phrases de BIA. */
export type Etape = {
  /** La clé de la manœuvre dans le répertoire de guidage, ou null si on ne
      sait pas la nommer — dans ce cas BIA se taira sur cette étape. */
  manoeuvre: string | null;
  /** Mètres à parcourir sur cette étape avant la manœuvre suivante. */
  metres: number;
  /** Le nom de la rue quand il existe. Affiché, jamais dit : une rue sur sept
      seulement en a un, et un nom lu par une voix enregistrée n'existe pas. */
  rue: string;
  /** Les points de la ligne à tracer sur la carte. */
  trace: Array<[number, number]>;
};

export type Chemin = {
  metres: number;
  secondes: number;
  etapes: Etape[];
  trace: Array<[number, number]>;
};

/* ── LES DOUZE DISTANCES ────────────────────────────────────────────────────

   On n'annonce que ces valeurs, parce que seules celles-là sont enregistrées.
   Et on annonce TOUJOURS PAR EN DESSOUS : à 180 mètres on dit « cent
   cinquante », jamais « deux cents ». Annoncer plus loin que la réalité fait
   manquer le virage ; annoncer plus près fait seulement tourner un peu tôt. */
const DISTANCES: Array<[number, string]> = [
  [50, "d-50"],
  [100, "d-100"],
  [150, "d-150"],
  [200, "d-200"],
  [300, "d-300"],
  [400, "d-400"],
  [500, "d-500"],
  [700, "d-700"],
  [1000, "d-1km"],
  [2000, "d-2km"],
  [3000, "d-3km"],
  [5000, "d-5km"],
];

/* Sous ce seuil, on ne dit plus une distance : on dit « léegi », maintenant.

   IL VAUT CINQUANTE, ET PAS TRENTE. Je l'avais mis à trente, et l'épreuve a
   trouvé la faille : entre 31 et 49 mètres, la plus petite distance
   enregistrée est « cinquante mètres » — donc BIA annonçait le virage PLUS
   LOIN qu'il n'était, et on le manquait. Le seuil doit être égal à la plus
   petite distance qu'on sait dire, sinon la règle « jamais par au-dessus » se
   troue juste là. Et à 50 km/h, cinquante mètres font trois secondes : c'est
   exactement le moment de dire « maintenant ». */
export const SEUIL_MAINTENANT = 50;

/** La clé de la distance à annoncer, ou "d-maintenant" si on y est. */
export function distanceVersCle(metres: number): string {
  if (metres <= SEUIL_MAINTENANT) return "d-maintenant";
  let choisie = DISTANCES[0][1];
  for (const [seuil, cle] of DISTANCES) {
    if (metres >= seuil) choisie = cle;
  }
  return choisie;
}

/* ── DES MANŒUVRES AUX PHRASES ──────────────────────────────────────────────

   Le vocabulaire d'un calculateur d'itinéraire est fini : une quinzaine de
   types, huit modificateurs. Tout ce qui n'est pas dans cette table renvoie
   null, et BIA se taira plutôt que d'inventer. C'est voulu : sur la route,
   une instruction fausse est pire que pas d'instruction. */
const COTE: Record<string, { droite: string; gauche: string }> = {
  turn: { droite: "droite", gauche: "gauche" },
  serre: { droite: "serre-droite", gauche: "serre-gauche" },
  fort: { droite: "fort-droite", gauche: "fort-gauche" },
  rond: { droite: "rond-point-droite", gauche: "rond-point-gauche" },
  bout: { droite: "bout-de-rue-droite", gauche: "bout-de-rue-gauche" },
  reste: { droite: "reste-droite", gauche: "reste-gauche" },
  arrive: { droite: "arrive-droite", gauche: "arrive-gauche" },
};

function parLeCote(famille: keyof typeof COTE, modificateur: string): string | null {
  const m = String(modificateur || "").toLowerCase();
  if (m.includes("right")) return COTE[famille].droite;
  if (m.includes("left")) return COTE[famille].gauche;
  return null;
}

export function manoeuvreVersCle(type: string, modificateur = ""): string | null {
  const t = String(type || "").toLowerCase();
  const m = String(modificateur || "").toLowerCase();

  if (t === "depart") return "allons-y";
  if (t === "arrive") return parLeCote("arrive", m) || "arrive";

  if (m === "uturn") return "demi-tour";

  if (t === "turn" || t === "continue") {
    if (m === "straight" || !m) return "tout-droit";
    if (m.startsWith("slight")) return parLeCote("serre", m);
    if (m.startsWith("sharp")) return parLeCote("fort", m);
    return parLeCote("turn", m);
  }

  if (t === "new name") return "tout-droit";
  if (t === "merge") return "rejoins-la-voie";
  if (t === "on ramp" || t === "off ramp" || t === "ramp") return "prends-la-bretelle";
  if (t === "fork") return m === "straight" ? "tout-droit" : parLeCote("serre", m);
  if (t === "end of road") return parLeCote("bout", m);
  if (t === "use lane") return parLeCote("reste", m);

  if (t === "roundabout" || t === "rotary" || t === "roundabout turn") {
    if (m === "straight" || !m) return "rond-point-tout-droit";
    return parLeCote("rond", m);
  }
  /* On est DANS le rond-point : la sortie a déjà été annoncée à l'entrée.
     Répéter ferait parler BIA au milieu du carrefour, quand il faut regarder
     la route et pas écouter. */
  if (t === "exit roundabout" || t === "exit rotary") return null;

  /* « notification », et tout ce qu'un calculateur inventera demain. */
  return null;
}

/* Une table qui désigne une phrase inexistante enverrait BIA chercher un
   fichier absent, et elle se tairait sans qu'on sache pourquoi. On le vérifie
   au chargement, une fois, et on le dit fort. */
const CLES_CONNUES = new Set(GUIDAGE.map((p) => p.cle));
export const CLES_MANQUANTES: string[] = [
  ...new Set([
    ...Object.values(COTE).flatMap((c) => [c.droite, c.gauche]),
    "allons-y", "arrive", "demi-tour", "tout-droit", "rejoins-la-voie",
    "prends-la-bretelle", "rond-point-tout-droit", "d-maintenant",
    ...DISTANCES.map(([, c]) => c),
  ]),
].filter((c) => !CLES_CONNUES.has(c));

/* ── LIRE LA RÉPONSE D'UN CALCULATEUR D'ITINÉRAIRE ─────────────────────────

   Le format est celui d'OSRM, que parlent aussi Valhalla et la plupart des
   serveurs libres. On ne garde que ce qui sert : la manœuvre, la distance, le
   nom de rue s'il existe, et la ligne à tracer. */
type BrutOSRM = {
  code?: string;
  routes?: Array<{
    distance: number;
    duration: number;
    geometry?: { coordinates?: Array<[number, number]> };
    legs?: Array<{
      steps?: Array<{
        distance: number;
        name?: string;
        maneuver?: { type?: string; modifier?: string };
        geometry?: { coordinates?: Array<[number, number]> };
      }>;
    }>;
  }>;
};

export function lireChemin(brut: unknown): Chemin | null {
  const d = brut as BrutOSRM;
  if (!d || d.code !== "Ok" || !d.routes?.length) return null;
  const r = d.routes[0];
  const etapes: Etape[] = [];
  for (const leg of r.legs || []) {
    for (const s of leg.steps || []) {
      etapes.push({
        manoeuvre: manoeuvreVersCle(s.maneuver?.type || "", s.maneuver?.modifier || ""),
        metres: Math.round(s.distance || 0),
        rue: String(s.name || "").trim(),
        trace: s.geometry?.coordinates || [],
      });
    }
  }
  return {
    metres: Math.round(r.distance || 0),
    secondes: Math.round(r.duration || 0),
    etapes,
    trace: r.geometry?.coordinates || etapes.flatMap((e) => e.trace),
  };
}

/* ── OÙ EN EST-ON SUR LE CHEMIN ────────────────────────────────────────────

   Mètres entre deux points, à la surface de la Terre. La formule de
   haversine ; à l'échelle d'un carrefour, l'approximation ne coûte rien. */
export function metresEntre(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * rad;
  const dLon = (b[0] - a[0]) * rad;
  const lat1 = a[1] * rad, lat2 = b[1] * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Le point du tracé le plus proche, et la distance qui nous en sépare. */
export function surLeChemin(position: [number, number], trace: Array<[number, number]>) {
  let meilleur = 0;
  let ecart = Infinity;
  for (let i = 0; i < trace.length; i++) {
    const d = metresEntre(position, trace[i]);
    if (d < ecart) { ecart = d; meilleur = i; }
  }
  return { indice: meilleur, ecart: Math.round(ecart) };
}

/* ── QUAND PARLER, ET QUAND SE TAIRE ──────────────────────────────────────

   Deux annonces par manœuvre, pas plus : une de loin pour anticiper, une au
   moment de tourner. Un guidage bavard finit coupé, et un guidage coupé ne
   guide plus.

   L'annonce lointaine se déclenche à la distance enregistrée la plus proche
   AU-DESSOUS de ce qui reste — donc on dit « cent cinquante mètres » à 150
   mètres pile, pas à 180. */
export const ECART_HORS_CHEMIN = 60;

export type Annonce = { distance: string | null; manoeuvre: string; loin: boolean };

export function annonceA(metresAvant: number, manoeuvre: string | null, dejaDites: Set<string>): Annonce | null {
  if (!manoeuvre) return null;

  if (metresAvant <= SEUIL_MAINTENANT) {
    const marque = `${manoeuvre}|maintenant`;
    if (dejaDites.has(marque)) return null;
    dejaDites.add(marque);
    return { distance: "d-maintenant", manoeuvre, loin: false };
  }

  /* De loin : une seule fois, à la première distance enregistrée franchie. */
  const cle = distanceVersCle(metresAvant);
  const marque = `${manoeuvre}|loin`;
  if (dejaDites.has(marque)) return null;
  /* On n'annonce pas de très loin une manœuvre qui viendra dans cinq
     kilomètres : ce serait oublié avant d'arriver. */
  if (metresAvant > 700) return null;
  dejaDites.add(marque);
  return { distance: cle, manoeuvre, loin: true };
}
