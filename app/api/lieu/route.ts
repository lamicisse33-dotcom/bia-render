import { NextRequest, NextResponse } from "next/server";
import { verifierCode } from "@/lib/codes";
import { noterPanne } from "@/lib/panne";

/* ── TROUVER UN ENDROIT, ET DIRE QUAND ON N'EST PAS SÛR ─────────────────────

   Lamine, le 11 septembre 2026, en lisant ce que j'avais trouvé pour
   « Station Total Ouakam » :

     « WARI n'existe plus depuis plusieurs années, près de dix ans. »

   C'est la leçon de cette route, et elle vaut plus que le code. J'avais pris
   ce résultat pour une imprécision de recherche. C'était pire : la base de
   données est PÉRIMÉE. OpenStreetMap place encore, à Ouakam, une agence
   fermée depuis dix ans.

   Mesuré le même soir, dix endroits de Dakar demandés comme un Dakarois les
   nomme : les dix ont renvoyé quelque chose, et TROIS se sont trompés en
   silence — « Hôpital Principal » a renvoyé son parking, « Gare de Thiaroye »
   un poste de santé, « Station Total Ouakam » cette agence fermée. Et « 12
   rue Carnot » renvoie la rue, jamais le numéro : les numéros de maison
   n'existent pas ici.

   LE DANGER N'EST DONC PAS DE NE PAS TROUVER. C'est de trouver à côté sans le
   dire. Une carte qui envoie quelqu'un chez un commerce fermé depuis dix ans
   est pire qu'une carte vide.

   CE QUE FAIT CETTE ROUTE, EN CONSÉQUENCE :

     1. elle rend PLUSIEURS candidats, jamais un seul — c'est la personne qui
        tranche, à voix haute, avant qu'on démarre ;
     2. elle marque « sûr: false » quand le résultat sent le à-peu-près : un
        parking, un distributeur, une boutique là où on demandait un lieu ;
     3. elle dit franchement quand elle n'a rien, pour que BIA demande un
        repère au lieu d'inventer.

   ── CE QUI MANQUE ENCORE, ET QUI VAUT PLUS QUE TOUT LE RESTE ──────────────

   Les vrais repères de Dakar — ce qui a fermé, ce qui a changé de nom, ce que
   les gens appellent « le rond-point de la mosquée » — ne sont dans aucune
   base. Le jour où KHALAM tient sa propre liste, vérifiée par des gens qui
   vivent là, BIA trouvera là où les autres se trompent. La table REPERES
   ci-dessous est le début de cette liste : elle passe AVANT la recherche
   publique, et elle est faite pour grandir. */

const NOMINATIM = process.env.CARTE_LIEUX || "https://nominatim.openstreetmap.org";

/* ── POURQUOI GOOGLE PASSE DEVANT, DEPUIS LE 14 SEPTEMBRE 2026 ──────────────

   Lamine : « il faut que la carte puisse montrer tout Dakar. Je lui ai
   demandé de m'amener à Ouakam » — et BIA a répondu qu'elle ne trouvait pas
   l'endroit. Ouakam n'est pas un lieu-dit : c'est une des communes de Dakar,
   cent mille habitants.

   La base publique ne peut pas être seule en première ligne. Elle est tenue
   par des bénévoles, elle limite chaque adresse à une requête par seconde, et
   elle refuse volontiers les serveurs qu'elle ne connaît pas — un refus qui
   ressemble, vu du téléphone, à « cet endroit n'existe pas ».

   La clé Google est déjà là, elle sert aux vidéos. On s'en sert donc aussi
   pour les lieux : quelques centimes pour mille recherches, et Dakar entier
   répond. La base publique reste derrière, comme filet — si la clé manque ou
   si Google refuse, rien ne change par rapport à hier.

   ET L'ORDRE NE BOUGE PAS POUR AUTANT : les repères de KHALAM passent
   toujours en premier. Une liste vérifiée par quelqu'un qui vit là gagne
   contre n'importe quelle base mondiale — c'est la leçon du 11 septembre, et
   elle tient. */
const GOOGLE = () => String(process.env.GOOGLE_CLE || "").trim();

/* Google rend un « type » d'emplacement. ROOFTOP et RANGE_INTERPOLATED sont
   des points précis ; APPROXIMATE est le centre d'un quartier ou d'une ville
   — ce qui est exactement ce qu'on veut pour « amène-moi à Ouakam », mais pas
   pour une adresse. On le dit franchement au lieu de le cacher. */
async function chezGoogle(quoi: string): Promise<Candidat[] | null> {
  const cle = GOOGLE();
  if (!cle) return null;
  /* On ancre la recherche sur Dakar : « Ouakam » seul pourrait exister
     ailleurs, et un Dakarois ne précise jamais sa ville. */
  const adresse = "https://maps.googleapis.com/maps/api/geocode/json"
    + `?address=${encodeURIComponent(quoi)}`
    + "&components=country:SN&language=fr&region=sn"
    + `&key=${encodeURIComponent(cle)}`;
  const r = await fetch(adresse, { cache: "no-store" });
  if (!r.ok) throw new Error(`Google lieux ${r.status}`);
  const d = await r.json() as {
    status?: string;
    results?: Array<{
      formatted_address?: string;
      partial_match?: boolean;
      geometry?: { location?: { lat?: number; lng?: number }; location_type?: string };
    }>;
  };
  /* ZERO_RESULTS est une vraie réponse : Google a cherché et n'a rien. On
     rend une liste vide, et le filet public tentera sa chance. */
  if (d.status && d.status !== "OK" && d.status !== "ZERO_RESULTS") {
    throw new Error(`Google lieux : ${d.status}`);
  }
  return (d.results || []).slice(0, 4)
    .filter((x) => x.geometry?.location?.lat != null && x.geometry?.location?.lng != null)
    .map((x) => ({
      dit: String(x.formatted_address || "").split(",").slice(0, 3).join(",").trim(),
      lat: Number(x.geometry!.location!.lat),
      lon: Number(x.geometry!.location!.lng),
      /* Un à-peu-près assumé : Google le dit lui-même avec partial_match. */
      sur: !x.partial_match,
      source: "publique" as const,
    }));
}
/* Nominatim demande qu'on se nomme, et c'est la moindre des politesses pour
   un service gratuit tenu par des bénévoles. */
/* -- LE TIRET QUI EMPECHAIT TOUTE RECHERCHE, DEUX JOURS DURANT --------------

   Trouve le 14 septembre 2026 a 18h10, dans « L'etat de BIA », apres une
   apres-midi entiere d'hypotheses :

     Cannot convert argument to a ByteString because the character at
     index 24 has a value of 8212 which is greater than 255.

   Le caractere 8212, c'est le TIRET CADRATIN. Il etait ici meme, a l'index 24
   de cette ligne. Un en-tete HTTP ne transporte que des caracteres Latin-1 ;
   `fetch` refuse donc d'envoyer la requete et leve une exception AVANT que
   quoi que ce soit ne parte sur le reseau.

   Consequence : ni Nominatim ni Photon n'ont JAMAIS ete appeles. Le message
   « je n'arrive pas a chercher, le reseau ne repond pas » etait exact au mot
   pres -- sauf que le reseau n'etait pas en cause. C'etait une ponctuation.

   J'ai accuse successivement : la base publique, le reseau de Dakar, le
   serveur de Render, une tuile manquante, un deploiement en retard, la
   politique de Nominatim envers les serveurs inconnus. Six hypotheses, toutes
   defendables, toutes fausses. La bonne etait dans une chaine que j'avais
   ecrite moi-meme, et elle attendait dans le journal des pannes depuis le
   debut.

   La lecon, deux fois dans la meme journee : on mesure, on ne devine pas.

   On garde donc de l'ASCII pur ici, et on le rend infaillible juste dessous. */
const QUI = nettoyerPourEnTete("BIA/KHALAM (khalam.app) - assistante vocale wolof, Dakar");

/* Tout caractere au-dela de Latin-1 fait echouer la requete entiere. Plutot
   que de compter sur ma vigilance -- elle a manque deux jours -- on filtre. */
function nettoyerPourEnTete(texte: string): string {
  const REMPLACE: Record<string, string> = {
    "\u2014": "-", "\u2013": "-", "\u2018": "'", "\u2019": "'",
    "\u201C": '"', "\u201D": '"', "\u00A0": " ", "\u2026": "...",
  };
  return texte
    .replace(/[^\u0000-\u00FF]/g, (c) => REMPLACE[c] ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

/* ── LES REPÈRES DE KHALAM ──────────────────────────────────────────────────

   Écrits à la main, vérifiés par quelqu'un qui y vit. Ils gagnent contre la
   recherche publique, toujours. Trois pour commencer — ceux que j'ai pu
   vérifier moi-même sur la base publique le 11 septembre. Les autres
   attendent Lamine : c'est SA connaissance de Dakar qui remplit cette table,
   et c'est ce que personne d'autre ne peut copier. */
type Repere = { noms: string[]; lat: number; lon: number; dit: string };

const REPERES: Repere[] = [
  {
    noms: ["universite cheikh anta diop", "ucad", "universite de dakar", "fann universite"],
    lat: 14.6836, lon: -17.4677,
    dit: "l'Université Cheikh Anta Diop, à Fann",
  },
  {
    noms: ["marche sandaga", "sandaga"],
    lat: 14.6767, lon: -17.4467,
    dit: "le marché Sandaga, au Plateau",
  },
  {
    noms: ["rond point liberte 6", "liberte 6", "rond point liberte six"],
    lat: 14.7126, lon: -17.4560,
    dit: "le rond-point Liberté 6",
  },
];

/* Les mots qui trahissent un à-peu-près : on a demandé un lieu, la base rend
   son parking ou la boutique d'à côté. Ce sont exactement les trois erreurs
   trouvées le 11 septembre. */
const SENT_LE_A_PEU_PRES = new Set([
  "parking", "bank", "atm", "bureau_de_change", "money_transfer",
  "convenience", "kiosk", "vending_machine", "bench", "waste_basket",
  "recreation_ground", "doctors", "pharmacy", "shop",
]);

function sansAccent(s: string) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

export type Candidat = {
  dit: string;
  lat: number;
  lon: number;
  /** false = le résultat sent l'à-peu-près ; BIA doit demander confirmation
      avec plus d'insistance, ou proposer le suivant. */
  sur: boolean;
  source: "khalam" | "publique";
};

export async function GET(request: NextRequest) {
  /* Chercher un lieu coûte une requête chez un service gratuit, pas de
     l'argent — mais on garde la porte fermée quand même : sans code, on ne
     laisse pas un inconnu se servir du quota de Lamine. */
  const verdict = verifierCode(request.headers.get("x-bia-code"));
  if (!verdict.ok) return NextResponse.json({ erreur: "code" }, { status: 401 });

  const quoi = String(request.nextUrl.searchParams.get("quoi") || "").trim().slice(0, 120);
  if (quoi.length < 2) return NextResponse.json({ candidats: [] });

  /* 1. LES REPÈRES DE KHALAM D'ABORD. Vérifiés par un humain d'ici, donc ils
        gagnent — c'est tout l'intérêt de les avoir. */
  const cherche = sansAccent(quoi);
  const aNous = REPERES.filter((r) =>
    r.noms.some((n) => cherche === n || cherche.includes(n) || n.includes(cherche)));
  if (aNous.length) {
    return NextResponse.json({
      candidats: aNous.map((r) => ({ dit: r.dit, lat: r.lat, lon: r.lon, sur: true, source: "khalam" as const })),
    });
  }

  /* 2. GOOGLE, quand la clé est là. Il connaît les communes de Dakar. */
  let pannesDeRecherche = "";
  try {
    const parGoogle = await chezGoogle(quoi);
    if (parGoogle && parGoogle.length) return NextResponse.json({ candidats: parGoogle });
  } catch (err) {
    /* Google qui refuse n'est pas une raison de se taire : on note, et on
       passe au filet. C'est le seul moyen de voir, depuis /api/etat, que la
       clé est absente ou que l'API n'est pas activée. */
    pannesDeRecherche = (err as Error).message.slice(0, 200);
    noterPanne("recherche de lieu (Google)", pannesDeRecherche, "carte");
  }

  /* 3. PHOTON — GRATUIT, SANS COMPTE ET SANS CARTE ─────────────────────────

     Lamine, le 14 septembre 2026 à dix-huit heures, deux heures avant de
     montrer BIA : Google lui demande d'enregistrer une carte bancaire pour
     activer la recherche de lieux. Sa carte est bloquée — volontairement,
     pour se protéger d'un autre prélèvement — et une démonstration n'est pas
     le moment de la débloquer dans l'urgence.

     Photon lit les mêmes données qu'OpenStreetMap mais par un autre chemin et
     un autre serveur : pas de clé, pas d'inscription, pas de carte. On lui
     donne le centre de Dakar comme point d'ancrage, pour qu'« Ouakam » ne
     ramène pas un homonyme à l'autre bout du monde, et on ne garde que le
     Sénégal.

     Il passe AVANT Nominatim parce que Nominatim refuse volontiers les
     serveurs qu'il ne connaît pas — c'est ce qu'on a vu tout l'après-midi. */
  try {
    const centre = "&lat=14.72&lon=-17.45&zoom=12&location_bias_scale=0.6";
    const chezPhoton = `https://photon.komoot.io/api/?q=${encodeURIComponent(quoi)}&lang=fr&limit=6${centre}`;
    const r = await fetch(chezPhoton, { headers: { "user-agent": QUI }, cache: "no-store" });
    if (!r.ok) throw new Error(`Photon ${r.status}`);
    const d = await r.json() as {
      features?: Array<{
        geometry?: { coordinates?: [number, number] };
        properties?: Record<string, string>;
      }>;
    };
    const trouves: Candidat[] = (d.features || [])
      .filter((f) => f.properties?.countrycode === "SN" && f.geometry?.coordinates)
      .map((f) => {
        const p = f.properties || {};
        /* Ce qui se DIT : le nom, puis le quartier ou la ville. La suite
           administrative ne se prononce pas. */
        const morceaux = [p.name, p.district || p.city, p.state]
          .filter((x, i, t) => x && t.indexOf(x) === i);
        return {
          dit: morceaux.slice(0, 3).join(", "),
          lon: Number(f.geometry!.coordinates![0]),
          lat: Number(f.geometry!.coordinates![1]),
          sur: !SENT_LE_A_PEU_PRES.has(String(p.osm_value || "")),
          source: "publique" as const,
        };
      })
      .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lon) && c.dit);
    if (trouves.length) return NextResponse.json({ candidats: trouves });
  } catch (err) {
    pannesDeRecherche = (err as Error).message.slice(0, 200);
    noterPanne("recherche de lieu (Photon)", pannesDeRecherche, "carte");
  }

  /* 4. LE DERNIER FILET : Nominatim. */
  try {
    const adresse = `${NOMINATIM.replace(/\/$/, "")}/search`
      + `?q=${encodeURIComponent(quoi)}&format=json&limit=4&countrycodes=sn&addressdetails=1`;
    const r = await fetch(adresse, {
      headers: { "user-agent": QUI, "accept-language": "fr" },
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`recherche de lieu ${r.status}`);
    const brut = await r.json() as Array<{
      display_name?: string; lat?: string; lon?: string; type?: string; class?: string;
    }>;

    const candidats: Candidat[] = brut
      .filter((x) => x.lat && x.lon)
      .map((x) => ({
        /* On garde les deux ou trois premiers morceaux du nom : « Marché
           Sandaga, Rue Braconnier, Dakar-Plateau » se dit, la suite
           administrative ne se dit pas. */
        dit: String(x.display_name || "").split(",").slice(0, 3).join(",").trim(),
        lat: Number(x.lat), lon: Number(x.lon),
        sur: !SENT_LE_A_PEU_PRES.has(String(x.type || "")) && !SENT_LE_A_PEU_PRES.has(String(x.class || "")),
        source: "publique" as const,
      }));

    return NextResponse.json({ candidats });
  } catch (err) {
    noterPanne("recherche de lieu", (err as Error).message.slice(0, 200), "carte");
    /* On ne renvoie pas une liste vide comme si on avait cherché : BIA doit
       pouvoir dire « le réseau n'a pas répondu », pas « je n'ai pas trouvé ».
       Les deux phrases n'appellent pas la même réaction. */
    return NextResponse.json({ candidats: [], panne: true });
  }
}
