/* ── TROUVER UNE PHARMACIE — ET NE JAMAIS DIRE QU'ELLE EST DE GARDE ───────

   Plan de Lamine, 24 octobre 2026 : « pharmacies de garde […] pharmacie de
   garde la plus proche avec position + carte, source publique citée ».

   ── CE QUE JE PEUX FAIRE, ET CE QUE JE NE PEUX PAS ────────────────────────

   TROUVER LES PHARMACIES LES PLUS PROCHES : oui. OpenStreetMap les porte,
   avec leurs coordonnées, gratuitement et sans clé. Vérifié le 24 octobre
   sur le Plateau : huit pharmacies réelles, nommées, placées.

   SAVOIR LAQUELLE EST DE GARDE CE SOIR : NON. Le tour de garde est publié
   par l'Ordre des pharmaciens, chaque semaine, et aucune des sources
   testées ne répond :
     ordredespharmaciens.sn     connexion refusée
     pharmaciedegarde.sn        connexion refusée
     annuaire-pharmacies.sn     connexion refusée
     sante.gouv.sn              répond, mais ne publie pas le tour de garde
   Et la recherche web de BIA ne peut pas suppléer : BRAVE_CLE n'est pas
   posée sur le serveur — mesuré sur /api/etat, « trouver.moteur_images :
   pas de clé Brave ».

   ── POURQUOI C'EST UNE RÈGLE DE SÉCURITÉ, PAS UNE LIMITE TECHNIQUE ────────

   Envoyer quelqu'un à deux heures du matin vers une pharmacie fermée, en lui
   ayant dit qu'elle était de garde, c'est pire que de ne rien dire : il part
   avec un enfant qui a de la fièvre, il trouve un rideau baissé, et il a
   perdu la demi-heure qu'il aurait passée à appeler le 1515.

   BIA DIT DONC CE QU'ELLE SAIT — la plus proche, son nom, sa distance — ET
   CE QU'ELLE NE SAIT PAS : laquelle est de garde. `garde_connue` vaut
   toujours faux tant qu'aucune source de tour de garde ne répond, et la
   consigne de l'outil le lui fait dire.

   ── LA SOURCE EST CITÉE, PARCE QU'IL L'A DEMANDÉ ──────────────────────────

   OpenStreetMap, sous licence ODbL, interrogé par l'API Overpass. Les
   données sont tenues par des bénévoles : une pharmacie peut avoir fermé
   sans que la carte le sache. C'est écrit dans ce que l'outil rend.

   AUCUN IMPORT : ce fichier ne lit ni Supabase ni la mémoire, et une épreuve
   le charge seul. Rien de ce qui passe ici n'est gardé — la position sert au
   tour en cours et disparaît avec la requête (règle du 24 octobre sur
   l'orientation). */

export type Pharmacie = {
  nom: string;
  lat: number;
  lon: number;
  distance_m: number;
  /** Le téléphone SI OpenStreetMap le porte. Jamais deviné. */
  telephone: string | null;
  /** Les horaires SI la carte les porte — souvent absents, et on le dit. */
  horaires: string | null;
};

export const SOURCE = "OpenStreetMap (ODbL), par le même service de lieux que la carte de BIA";
/* Trois kilomètres : au-delà, « la plus proche » ne veut plus rien dire à
   pied, et une liste de vingt noms ne sert personne. */
const RAYON_M = 3000;
const AU_PLUS = 6;

/** Distance à vol d'oiseau, en mètres. La même formule que lib/orientation.ts. */
export function distanceM(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371000, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const m = Math.sin(dLat / 2) ** 2
    + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(m))));
}

/* ── LE FOURNISSEUR EST CELUI QUE LA CARTE UTILISE DÉJÀ ──────────────────

   Première version : l'API Overpass. Elle a rendu huit pharmacies du
   Plateau au premier essai, puis un 502, puis SIX expirations d'affilée sur
   trois positions. C'est un service public gratuit et chargé ; une pharmacie
   trouvée une fois sur sept n'est pas une fonction, c'est un hasard — et sur
   une urgence, le hasard est la mauvaise réponse.

   On prend donc Nominatim, que app/api/lieu/route.ts interroge DÉJÀ en
   production pour la carte, avec la même variable CARTE_LIEUX et le même
   en-tête d'agent. Vérifié le 24 octobre : dix pharmacies réelles de Dakar,
   nommées et placées, en une requête. Rien de nouveau à surveiller : si la
   carte marche, ceci marche. */

const NOMINATIM = process.env.CARTE_LIEUX || "https://nominatim.openstreetmap.org";
const QUI = "BIA/KHALAM (khalam.app) - assistante vocale wolof, Dakar";

/** Le cadre de recherche autour d'une position : environ trois kilomètres. */
function cadre(de: { lat: number; lon: number }) {
  const dLat = RAYON_M / 111320;
  const dLon = RAYON_M / (111320 * Math.max(0.2, Math.cos(de.lat * Math.PI / 180)));
  /* viewbox = gauche,haut,droite,bas */
  return `${de.lon - dLon},${de.lat + dLat},${de.lon + dLon},${de.lat - dLat}`;
}

type Trouvee = { name?: string; display_name?: string; lat?: string; lon?: string; category?: string; type?: string; extratags?: Record<string, string> };

/** Les pharmacies autour d'une position, de la plus proche à la plus loin. */
export async function pharmaciesAutour(de: { lat: number; lon: number }): Promise<Pharmacie[]> {
  const adresse = `${NOMINATIM}/search?q=pharmacie&format=jsonv2&limit=20&bounded=1`
    + `&viewbox=${encodeURIComponent(cadre(de))}&countrycodes=sn&extratags=1`;
  const r = await fetch(adresse, {
    headers: { "user-agent": QUI, accept: "application/json" },
    signal: AbortSignal.timeout(10000),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Nominatim ${r.status}`);
  const liste = await r.json() as Trouvee[];
  if (!Array.isArray(liste)) throw new Error("réponse illisible");
  return liste
    .map((t) => {
      const lat = Number(t.lat), lon = Number(t.lon);
      const nom = String(t.name || "").trim() || String(t.display_name || "").split(",")[0].trim();
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || !nom) return null;
      /* On ne garde QUE ce que la carte déclare pharmacie. « pharmacie » dans
         un nom de rue ou d'arrêt de bus en ferait une, et on enverrait
         quelqu'un devant un poteau. */
      if (t.category && t.category !== "amenity") return null;
      if (t.type && t.type !== "pharmacy" && t.type !== "chemist") return null;
      return {
        nom: nom.slice(0, 80),
        lat, lon,
        distance_m: distanceM(de, { lat, lon }),
        telephone: t.extratags?.phone || t.extratags?.["contact:phone"] || null,
        horaires: t.extratags?.opening_hours || null,
      };
    })
    .filter((p): p is Pharmacie => p !== null)
    .sort((a, b) => a.distance_m - b.distance_m)
    .slice(0, AU_PLUS);
}

/* ── LE TOUR DE GARDE ─────────────────────────────────────────────────────
   Aucune source ne répond aujourd'hui. Cette fonction existe pour que le
   jour où une source est trouvée, il n'y ait qu'ICI à écrire — et pour que
   `garde_connue` ne puisse pas devenir vrai par accident ailleurs. */
export function gardeConnue(): boolean {
  return false;
}

export const POURQUOI_PAS_DE_GARDE =
  "Je ne sais pas laquelle est de garde ce soir : le tour de garde est publié par l'Ordre des "
  + "pharmaciens et aucune source publique ne répond. Dis-le clairement, propose d'appeler le 1515, "
  + "et n'affirme JAMAIS qu'une pharmacie est de garde.";
