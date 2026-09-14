"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Chemin } from "@/lib/carte";
import { ECART_HORS_CHEMIN, annonceA, surLeChemin, metresEntre } from "@/lib/carte";
import { GUIDAGE } from "@/lib/guidage-textes";

/* ── LA CARTE, ET LE VISAGE QUI SE RETIRE ───────────────────────────────────

   Lamine, le 11 septembre 2026 :

     « BIA doit pouvoir guider une personne pour qu'elle se retrouve, comme
       Google Maps, Waze… elle retire totalement de l'écran, elle t'affiche la
       carte mais on peut continuer à parler avec elle, mais on ne le voit
       pas ; elle se retire pour laisser la carte pour plus de visibilité. »

   C'est exactement ça, et le mot juste est le sien : elle se RETIRE, elle ne
   disparaît pas. Il reste une pastille qui bat quand elle parle, pour qu'on
   sache qu'elle est là. La conversation, dessous, n'est pas démontée : le
   micro reste ouvert, on lui parle par-dessus la carte, et elle répond.

   ── POURQUOI LE TÉLÉPHONE JOUE LES SONS LUI-MÊME ──────────────────────────

   Parce qu'une instruction de guidage ne peut pas attendre. Mesuré sur le
   vrai serveur : fabriquer la voix prend deux secondes fixes plus 36
   millisecondes par signe. À 50 km/h, trois secondes font quarante mètres —
   le carrefour est passé. Les phrases sont donc jouées depuis les fichiers
   déjà enregistrés, dont le dossier nous est donné au calcul de
   l'itinéraire. Aucun aller-retour, aucun centime, et ça marche même si la
   clé de la voix meurt.

TANT QU'UN FICHIER MANQUE, on retombe sur la voix ordinaire. C'est lent,
   mais ça parle : la carte a pu être essayée avant qu'un seul son soit
   acheté. Les quarante-neuf phrases ont été corrigées par Lamine le
   12 septembre 2026 et le verrou est levé ; elles s'enregistrent au prochain
   appui sur « Regarder ce qui manque ».

   ── CE QUI EST DÉLIBÉRÉMENT ABSENT ────────────────────────────────────────

   PAS DE NOM DE RUE DIT À VOIX HAUTE. Mesuré le 11 septembre sur
   OpenStreetMap, Plateau et Grand Dakar : 15 445 tronçons, 2 128 nommés —
   14 %, et 10 % dans les rues de quartier. Le nom s'AFFICHE quand il existe ;
   il ne se dit pas. Le guidage est géométrique : « dans cent mètres, tourne à
   droite ». C'est de toute façon ainsi qu'on guide quelqu'un ici.

   PAS DE MINUTES PROMISES. Un calculateur d'itinéraire ne connaît pas les
   embouteillages de Dakar. Annoncer « douze minutes » puis en mettre
   quarante, c'est mentir deux fois : sur l'heure, et sur ce qu'elle sait. */

export type Lieu = {
  dit: string;
  lat: number;
  lon: number;
  /* false = le résultat sent l'à-peu-près. On ne le cache pas, on le MONTRE
     comme douteux : cacher reviendrait à choisir à la place de quelqu'un qui
     connaît Dakar mieux que la base de données. */
  sur?: boolean;
};

/* ── LE FOND VECTORIEL, QUI NE VIENT PAS À DAKAR ────────────────────────────

   Mesuré avec Lamine le 14 septembre 2026, à trois heures d'une
   démonstration. Deux adresses ouvertes à la main sur son téléphone :

     tile.openstreetmap.org/12/1849/1879.png   → la presqu'île s'affiche
     tiles.openfreemap.org/styles/liberty      → rien

   Le verdict est net et il ne se devinait pas : depuis son réseau, le
   serveur du fond vectoriel est injoignable. On avait donc passé deux jours
   sur un écran noir dont la cause n'était ni dans le code ni dans le
   téléphone. Une mesure de dix secondes a tranché ce que deux soirées de
   raisonnement n'avaient pas su trancher.

   L'ordre est donc inversé : les IMAGES d'abord, le vectoriel en secours. */
const FOND_VECTORIEL = "https://tiles.openfreemap.org/styles/liberty";

/* ── UN SECOND FOND, QUAND LE PREMIER NE VIENT PAS ──────────────────────────

   Lamine, le 14 septembre 2026, à quatre heures d'une démonstration : « quand
   je lui demande de m'amener à Sandaga, elle dit d'accord, mais il me montre
   une carte noire. »

   Le fond habituel est une carte VECTORIELLE : le téléphone télécharge un
   fichier de style, puis des données de formes qu'il dessine lui-même. C'est
   beau et léger, mais ça tient à un seul serveur — et si ce serveur est
   injoignable depuis le réseau où l'on se trouve, il ne reste rien à
   regarder. Un écran noir.

   Le secours ci-dessous est une carte D'IMAGES : de simples tuiles PNG, le
   plus vieux et le plus robuste des formats de carte. Aucun fichier de style
   à aller chercher, aucun dessin à faire — si une seule image arrive, on voit
   quelque chose.

   CE N'EST PAS UNE SOLUTION DÉFINITIVE, et il faut l'écrire : ces tuiles sont
   servies par la fondation OpenStreetMap, qui demande qu'on n'en abuse pas.
   Pour un produit qui grandit, il faudra un fournisseur à nous. Pour ce soir,
   mieux vaut une carte servie par des bénévoles qu'un rectangle noir. */
/* Les tuiles d'images : de simples PNG, le plus vieux et le plus robuste des
   formats de carte. Aucun fichier de style à aller chercher, aucun dessin à
   faire — si une seule image arrive, on voit quelque chose. C'est maintenant
   le fond PAR DÉFAUT, parce que c'est celui qui arrive.

   CE N'EST PAS DÉFINITIF, et il faut l'écrire : ces tuiles sont servies par
   la fondation OpenStreetMap, qui demande qu'on n'en abuse pas. Pour un
   produit qui grandit il faudra un fournisseur à nous — Lamine paie déjà
   Google, et Google sert aussi des cartes. C'est le chantier d'après. */
const FOND_IMAGES = {
  version: 8 as const,
  sources: {
    osm: {
      type: "raster" as const,
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap",
    },
  },
  layers: [{ id: "osm", type: "raster" as const, source: "osm" }],
};

/* On garde la porte ouverte : poser NEXT_PUBLIC_CARTE_FOND dans Render
   remplace le fond par celui qu'on veut, sans toucher au code. */
const FOND: string | typeof FOND_IMAGES = process.env.NEXT_PUBLIC_CARTE_FOND || FOND_IMAGES;

/* Ce qu'on lit en bas quand on peut regarder. Jamais dit à voix haute : le
   texte affiché et le son enregistré sont deux choses séparées. */
const EN_FRANCAIS: Record<string, string> = {
  droite: "Tourne à droite", gauche: "Tourne à gauche", "tout-droit": "Continue tout droit",
  "serre-droite": "Serre à droite", "serre-gauche": "Serre à gauche",
  "fort-droite": "Tourne franchement à droite", "fort-gauche": "Tourne franchement à gauche",
  "reste-droite": "Reste à droite", "reste-gauche": "Reste à gauche",
  "demi-tour": "Fais demi-tour",
  "rond-point-droite": "Au rond-point, sors à droite",
  "rond-point-gauche": "Au rond-point, sors à gauche",
  "rond-point-tout-droit": "Au rond-point, tout droit",
  "bout-de-rue-droite": "Au bout de la rue, à droite",
  "bout-de-rue-gauche": "Au bout de la rue, à gauche",
  "prends-la-bretelle": "Prends la bretelle", "rejoins-la-voie": "Rejoins la grande route",
  arrive: "Tu es arrivé", "arrive-droite": "C'est sur ta droite", "arrive-gauche": "C'est sur ta gauche",
};

const FLECHE: Record<string, string> = {
  droite: "↱", gauche: "↰", "tout-droit": "↑", "serre-droite": "↗", "serre-gauche": "↖",
  "fort-droite": "⤼", "fort-gauche": "⤻", "demi-tour": "↩",
  "rond-point-droite": "↻", "rond-point-gauche": "↺", "rond-point-tout-droit": "↑",
  "bout-de-rue-droite": "↱", "bout-de-rue-gauche": "↰",
  "prends-la-bretelle": "↗", "rejoins-la-voie": "↗",
  arrive: "◎", "arrive-droite": "◎", "arrive-gauche": "◎",
  "reste-droite": "↑", "reste-gauche": "↑",
};

const TEXTE_DE = new Map(GUIDAGE.map((p) => [p.cle, p]));

export default function Carte({
  destination, code, langue, onFermer, onDitTexte, onPrete, parle,
}: {
  destination: Lieu;
  code: string | null;
  langue: "wo" | "fr";
  onFermer: () => void;
  /** ── QUAND LA CARTE EST VRAIMENT LA ────────────────────────────────────

      Lamine, le 14 septembre 2026 : « il faut couper le micro quand la carte
      s'affiche, pour le remettre une fois qu'elle est affichée totalement. »

      Le telephone a besoin de savoir QUAND. Pas a l'ouverture de l'ecran —
      la carte n'est alors qu'un rectangle vide — mais quand le fond est
      peint et les deux points poses.

      ELLE PREVIENT AUSSI QUAND ELLE RENONCE, et ce n'est pas un detail : si
      elle ne prevenait qu'en cas de reussite, une carte qui ne vient jamais
      laisserait le micro ferme pour toujours. On previent donc dans les deux
      cas, une seule fois. */
  onPrete: () => void;
  /** Le repli, quand les sons ne sont pas encore enregistrés : elle le dit
      avec sa voix ordinaire. Lent, mais jamais muet. */
  onDitTexte: (texte: string) => void;
  /** Vrai quand BIA parle par ailleurs — la pastille bat aussi pour ça. */
  parle: boolean;
}) {
  const boite = useRef<HTMLDivElement | null>(null);
  const carte = useRef<Record<string, unknown> | null>(null);
  const dejaDites = useRef<Set<string>>(new Set());
  const baseSons = useRef<string>("");
  const sonEnCours = useRef<HTMLAudioElement | null>(null);
  const jeton = useRef(0);
  /* Le fond de carte a-t-il fini de se charger, et de quoi le surveiller. */
  const charge = useRef(false);
  /* On ne previent qu'UNE fois, quoi qu'il arrive ensuite : le micro ne se
     rouvre pas deux fois, et un basculement de fond n'est pas une arrivee. */
  const prevenu = useRef(false);
  const prevenirUneFois = useCallback(() => {
    if (prevenu.current) return;
    prevenu.current = true;
    onPrete();
  }, [onPrete]);
  const montre = useRef<ReturnType<typeof setTimeout> | null>(null);
  const regard = useRef<ResizeObserver | null>(null);
  /* ── DEUX POINTS SUR LA CARTE, ET UN SEUL CADRAGE ────────────────────────

     Lamine, le 14 septembre 2026 : « le lieu demande doit etre marque sur la
     carte et se mettre a clignoter. La carte doit se pointer directement sur
     le lieu que tu as demande, et elle doit etre capable en meme temps de te
     montrer ou tu es toi. »

     Trois choses, et elles vont ensemble. Quelqu'un qui regarde une carte de
     guidage cherche toujours les memes reperes : ou je vais, ou je suis, et
     comment l'un mene a l'autre. L'itineraire etait trace, mais ses deux
     bouts n'etaient pas marques — on voyait un trait dore sans savoir lequel
     de ses bouts on etait.

     LE CADRAGE NE SE FAIT QU'UNE FOIS. Ensuite c'est la position qui commande
     la vue, parce qu'en roulant on veut voir devant soi, pas la carte
     entiere. */
  const marqueurArrivee = useRef<{ remove: () => void } | null>(null);
  const marqueurMoi = useRef<{ setLngLat: (p: [number, number]) => unknown; remove: () => void } | null>(null);
  const cadre = useRef(false);
  const maplibreRef = useRef<typeof import("maplibre-gl") | null>(null);

  const [position, setPosition] = useState<[number, number] | null>(null);
  const [chemin, setChemin] = useState<Chemin | null>(null);
  const [etat, setEtat] = useState("Maa ngi seet yoon wi…");
  const [prochaine, setProchaine] = useState<{ cle: string; metres: number; rue: string } | null>(null);
  const [sansCarte, setSansCarte] = useState(false);
  /* Vrai dès qu'on est passé au fond de secours : on ne bascule qu'une fois. */
  const secours = useRef(false);
  /* Ce qui a manqué, dit en clair sous la carte au lieu d'un noir muet. */
  const [motifCarte, setMotifCarte] = useState("");
  /* Pourquoi la position manque — en français, en petit, pour celui qui répare. */
  const [motifGps, setMotifGps] = useState("");
  const [provisoire, setProvisoire] = useState(false);
  const [ditQuelqueChose, setDitQuelqueChose] = useState(false);

  /* ── DIRE UNE PHRASE ENREGISTRÉE ─────────────────────────────────────────
     Plusieurs clés s'enchaînent : « ci cent mètres » puis « tourné ci
     ndeyjoor ». Une nouvelle annonce coupe la précédente — en conduisant, la
     dernière information est la seule qui compte. */
  const dire = useCallback(async (cles: string[]) => {
    const utiles = cles.filter(Boolean);
    if (!utiles.length) return;

    const mien = ++jeton.current;
    sonEnCours.current?.pause();
    sonEnCours.current = null;

    const enTexte = () => {
      const dit = utiles
        .map((c) => TEXTE_DE.get(c))
        .map((p) => (p ? (langue === "fr" ? p.francais : p.wolof) : ""))
        .filter(Boolean)
        .join(" ");
      if (dit) onDitTexte(dit);
    };

    if (!baseSons.current) { enTexte(); return; }

    /* ── LE LÉGER D'ABORD, L'ORIGINAL SI BESOIN ────────────────────────────

       Le MP3 pèse six fois moins que le WAV : au volant, avec un réseau qui
       vient et qui va, c'est exactement là que ça compte. Mais s'il manque —
       conversion pas encore passée, dépôt raté — le WAV est toujours là, et
       une instruction lourde vaut infiniment mieux qu'un carrefour manqué. */
    const jouer = (adresse: string) => new Promise<void>((fini, rate) => {
      const a = new Audio(adresse);
      sonEnCours.current = a;
      a.onended = () => fini();
      a.onerror = () => rate(new Error("son de guidage absent"));
      a.play().catch(rate);
    });

    setDitQuelqueChose(true);
    try {
      for (const c of utiles) {
        if (jeton.current !== mien) return;
        const base = baseSons.current + encodeURIComponent(c);
        try { await jouer(base + ".mp3"); }
        catch { await jouer(base + ".wav"); }
      }
    } catch {
      /* Les fichiers ne sont pas encore achetés, ou l'un manque : on parle
         quand même, avec la voix lente. Et on ne réessaiera plus les
         fichiers de ce trajet, pour ne pas attendre à chaque virage. */
      baseSons.current = "";
      enTexte();
    } finally {
      if (jeton.current === mien) { setDitQuelqueChose(false); sonEnCours.current = null; }
    }
  }, [langue, onDitTexte]);

  useEffect(() => () => { sonEnCours.current?.pause(); jeton.current++; }, []);

  /* ── LA POSITION, EN CONTINU ─────────────────────────────────────────────
     On ne demande pas une position : on la SUIT. Sans ça il n'y a pas de
     guidage, juste un dessin. */
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setEtat("Sama telefon bi amul GPS.");
      void dire(["pas-de-gps"]);
      return;
    }
    /* ── « GPS BI FEEÑUL » DISAIT TROIS CHOSES À LA FOIS ──────────────────

       Lamine, le 14 septembre 2026 : la carte s'ouvre sur Sandaga et l'écran
       annonce que le GPS ne répond pas. Une seule phrase couvrait trois
       situations qui ne se réparent pas du tout pareil :

         1. le téléphone REFUSE la position — il faut l'autoriser dans les
            réglages, et aucune attente n'y changera rien ;
         2. la position n'est pas DISPONIBLE — dedans, entre deux murs ;
         3. le délai est DÉPASSÉ — et c'est le cas le plus fréquent, parce
            qu'on demandait la haute précision, celle qui va chercher les
            satellites. À l'intérieur d'une maison, elle ne vient pas.

       Sur le troisième, on abandonnait au bout de quinze secondes alors que
       la position approchée — celle des antennes et du wifi — arrive en une
       seconde et suffit largement pour partir. On demande donc la précise, et
       si elle ne vient pas, on se rabat sur l'approchée au lieu de renoncer.

       Le motif exact s'affiche en petit, en français : il ne sert pas à celui
       qui roule, il sert à celui qui répare. */
    /* Huit secondes, pas quinze : passé ce délai, la précise ne viendra plus,
       et quinze secondes d'attente devant quelqu'un c'est déjà trop. */
    const PRECIS: PositionOptions = { enableHighAccuracy: true, maximumAge: 2000, timeout: 8000 };
    let vivantGps = true;
    let retour: ReturnType<typeof setTimeout> | null = null;
    let suivi = 0;
    let replie = false;
    /* ── « QUAND TU AVANCES, ELLE RECULE » ─────────────────────────────────

       Lamine, le 13 septembre 2026, en marchant dehors avec la carte ouverte.

       CE QUI SE PASSAIT. Le suivi précis a un délai de huit secondes. En
       marchant, un seul relevé qui dépasse ce délai suffit à faire basculer
       sur le suivi APPROCHÉ — et celui-ci acceptait une position vieille
       d'UNE MINUTE (`maximumAge: 60000`). J'avais écrit ce chiffre en pensant
       à quelqu'un d'ARRÊTÉ : pour savoir dans quelle rue on est, une minute
       fait l'affaire. Pour quelqu'un qui MARCHE, une position d'il y a une
       minute est l'endroit où il ÉTAIT. Le point revient donc en arrière, à
       chaque fois que le téléphone ressert son souvenir.

       Et rien ne l'en empêchait : on posait le point à chaque relevé, sans
       jamais regarder s'il était plus RÉCENT que le précédent, ni s'il était
       plus juste. Une mesure par le réseau, précise à deux kilomètres près,
       écrasait une mesure GPS précise à cinq mètres.

       TROIS GARDES, ET ELLES SONT SIMPLES :

         1. un relevé plus VIEUX que celui qu'on a déjà est jeté. Le temps ne
            remonte pas ;
         2. un relevé BEAUCOUP plus flou que le précédent est jeté aussi, tant
            que le bon n'a pas quinze secondes — passé ce délai, mieux vaut un
            point flou que pas de point ;
         3. la minute de mémoire tombe à dix secondes. En marchant, dix
            secondes valent déjà une dizaine de mètres.

       Et une quatrième, à part : une seule mesure lente ne condamne plus tout
       le trajet à l'approché. On retente le précis une minute plus tard. */
    let derniereMesure = 0;
    let dernierePrecision = Infinity;
    /* Déclarée ici, au-dessus de poser() qui la remet à faux quand le GPS
       revient : un tunnel ne dure pas, et on a le droit de le dire une fois
       de plus s'il se reperd vraiment. */
    let plainteDite = false;

    const poser = (p: GeolocationPosition) => {
      const quand = p.timestamp || Date.now();
      const precision = Number.isFinite(p.coords.accuracy) ? p.coords.accuracy : 9999;
      /* Le temps ne remonte pas. C'est la garde qui répare son défaut. */
      if (quand < derniereMesure) return;
      /* Un point cinq fois plus flou que le précédent ne dit rien de neuf —
         sauf si le précédent commence à dater. */
      const vieillit = Date.now() - derniereMesure > 15000;
      if (!vieillit && precision > Math.max(dernierePrecision * 5, 150)) return;
      derniereMesure = quand;
      dernierePrecision = precision;
      /* Le GPS est revenu : si on le reperd pour de bon plus tard, on aura le
         droit de le dire une fois de plus. Un tunnel ne dure pas. */
      plainteDite = false;
      setMotifGps("");
      setPosition([p.coords.longitude, p.coords.latitude]);
    };

    /* ── LA PLAINTE QUI TUAIT LE GUIDAGE ──────────────────────────────────

       Lamine, le 14 septembre 2026, après avoir roulé pour de vrai : « durant
       tout le trajet la carte n'a rien dit, j'ai eu beaucoup de virages, je
       n'ai pas entendu une seule voix. »

       J'ai roulé à mon tour — un vrai navigateur, un faux GPS qu'on déplace
       de cinquante mètres toutes les six dixièmes de seconde — et le relevé
       de ce qui est parti à la voix dit tout :

         allons-y, d-300, droite, PAS-DE-GPS, d-maintenant, PAS-DE-GPS ×4,
         presque-arrive, PAS-DE-GPS ×3, arrive

       Six « pas-de-gps » AU MILIEU des instructions. Et dire() coupe
       toujours ce qui parle avant de parler — c'est voulu, une instruction
       périmée ne doit pas couvrir la suivante. Donc chaque plainte TUAIT
       l'instruction en cours, une fraction de seconde après son début. Des
       débuts de mots, puis plus rien.

       LA CAUSE : le suivi précis a huit secondes pour rendre chaque relevé.
       En roulant — un tunnel, un immeuble, un virage — il en rate un de
       temps en temps. Ce n'est PAS « le GPS ne marche pas » : c'est un
       relevé lent, alors que le précédent date de deux secondes.

       DEUX RÈGLES, DONC :

         1. tant qu'on a eu une position il y a moins de vingt secondes, on
            ne se plaint PAS. On note le motif en petit sur l'écran, pour
            celui qui répare, et on laisse l'instruction finir ;
         2. et la plainte ne se dit qu'UNE fois par trajet. Répéter « je n'ai
            pas de GPS » à quelqu'un qui conduit ne lui apprend rien la
            deuxième fois, et l'empêche d'entendre son virage. */
    const seplaindre = (cles: string[]) => {
      if (Date.now() - derniereMesure < 20000) return;
      if (plainteDite) return;
      plainteDite = true;
      void dire(cles);
    };

    const perdu = (err: GeolocationPositionError) => {
      if (err.code === 1) {
        setEtat("GPS bi feeñul.");
        setMotifGps("Le téléphone n'autorise pas la position. Réglages → Safari → Position.");
        /* Celle-là se dit tout de suite : ce n'est pas un relevé lent, c'est
           une porte fermée, et rien ne la rouvrira sans la personne. */
        if (!plainteDite) { plainteDite = true; void dire(["pas-de-gps"]); }
        return;
      }
      /* Pas encore essayé sans la haute précision : on tente, sans rien dire.
         Annoncer une panne qu'on est en train de réparer ne sert personne. */
      if (!replie) {
        replie = true;
        setMotifGps("Position précise indisponible — je prends l'approchée.");
        try { navigator.geolocation.clearWatch(suivi); } catch { }
        suivi = navigator.geolocation.watchPosition(
          poser,
          () => {
            setMotifGps("Ni le GPS ni le réseau ne donnent la position.");
            if (Date.now() - derniereMesure >= 20000) setEtat("GPS bi feeñul.");
            seplaindre(["pas-de-gps"]);
          },
          /* DIX SECONDES, PAS SOIXANTE. Voir la garde plus haut : une minute
             de mémoire, c'est l'endroit où l'on était il y a une minute. */
          { enableHighAccuracy: false, maximumAge: 10000, timeout: 30000 },
        );
        /* Une mesure lente ne condamne pas tout le trajet. On retente le
           précis une minute plus tard ; s'il répond, il reprend la main. */
        retour = setTimeout(() => {
          if (!vivantGps) return;
          try { navigator.geolocation.clearWatch(suivi); } catch { }
          replie = false;
          suivi = navigator.geolocation.watchPosition(poser, perdu, PRECIS);
        }, 60000);
        return;
      }
      setMotifGps(err.code === 2 ? "Position indisponible ici." : "Le GPS n'a pas répondu à temps.");
      /* L'écran ne dit « pas de GPS » que si on n'a VRAIMENT plus rien : sinon
         on efface une instruction pour une alerte fausse. */
      if (Date.now() - derniereMesure >= 20000) setEtat("GPS bi feeñul.");
      seplaindre(["pas-de-gps"]);
    };

    suivi = navigator.geolocation.watchPosition(poser, perdu, PRECIS);
    return () => {
      vivantGps = false;
      if (retour) clearTimeout(retour);
      try { navigator.geolocation.clearWatch(suivi); } catch { }
    };
  }, [dire]);

  /* ── OU JE SUIS, ET LE PREMIER CADRAGE ───────────────────────────────────

     Le point bleu suit la position a chaque mesure. Et la premiere fois qu'on
     connait les deux bouts, on cadre pour qu'ils tiennent tous les deux a
     l'ecran : c'est la seule vue qui repond d'un coup aux deux questions
     qu'on se pose en ouvrant une carte. Ensuite, la position reprend la main. */
  useEffect(() => {
    const m = carte.current as unknown as {
      fitBounds?: (b: [[number, number], [number, number]], o?: unknown) => void;
    } | null;
    const maplibre = maplibreRef.current;
    if (!m || !maplibre || !position) return;

    if (!marqueurMoi.current) {
      const moi = document.createElement("div");
      moi.className = "pin-moi";
      moi.setAttribute("aria-label", "Ou tu es");
      moi.innerHTML = '<span class="pin-halo"></span><span class="pin-coeur"></span>';
      marqueurMoi.current = new maplibre.Marker({ element: moi, anchor: "center" })
        .setLngLat(position).addTo(m as never) as never;
    } else {
      marqueurMoi.current.setLngLat(position);
    }

    if (!cadre.current && m.fitBounds) {
      cadre.current = true;
      const ouest = Math.min(position[0], destination.lon);
      const est = Math.max(position[0], destination.lon);
      const sud = Math.min(position[1], destination.lat);
      const nord = Math.max(position[1], destination.lat);
      try {
        m.fitBounds([[ouest, sud], [est, nord]], {
          /* De la place en haut pour le panneau de manoeuvre, en bas pour le
             nom de la destination : sinon un des deux points se cache dessous. */
          padding: { top: 120, bottom: 190, left: 60, right: 60 },
          duration: 900, maxZoom: 16,
        });
      } catch { }
    }
  }, [position, destination.lat, destination.lon]);

  /* ── LE FOND DE CARTE ────────────────────────────────────────────────────
     Chargé seulement ici, et seulement quand on ouvre la carte : la
     bibliothèque pèse lourd, et personne ne doit la télécharger pour dire
     bonjour. */
  useEffect(() => {
    let vivant = true;
    (async () => {
      try {
        const maplibre = await import("maplibre-gl");
        if (!vivant || !boite.current) return;

        /* ── LE SECOND FIL, SANS QUOI RIEN NE SE CHARGE ──────────────────

           MapLibre ne dessine pas les tuiles dans la page : il ouvre un
           second fil d'exécution qui va les chercher et les découpe. Il
           trouve normalement ce fichier tout seul, par `import.meta.url` —
           mais Next remplace ça, à la construction, par le chemin du DISQUE
           de Render. MapLibre voit que ce n'est pas une adresse web, renvoie
           une chaîne vide, et ouvre `new Worker("")` : le navigateur essaie
           alors de faire tourner la page HTML comme du JavaScript. Ça rate
           sans un mot — pas une tuile demandée, pas une erreur, pas
           d'événement « load ». Juste le fond noir de .carte pendant que la
           carte attend pour toujours.

           C'est ça qu'a vu Lamine le 12 septembre 2026 : « le map n'affiche
           pas la carte, c'est écran noir. » Vérifié dans le paquet
           construit, à la ligne près.

           Les deux fichiers sont posés dans public/maplibre/ à chaque
           construction — voir outils/poser-le-worker.mjs. */
        if (typeof maplibre.setWorkerUrl === "function") {
          maplibre.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
        }

        const m = new maplibre.Map({
          container: boite.current,
          style: FOND as unknown as string,
          center: [destination.lon, destination.lat],
          zoom: 14,
        });
        carte.current = m as unknown as Record<string, unknown>;
        m.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-left");
        /* Une erreur ne condamne plus la carte : on essaie l'autre fond. */
        const basculer = (pourquoi: string) => {
          if (secours.current || !vivant) return;
          /* ── UNE TUILE MANQUANTE N'EST PAS UNE CARTE MORTE ─────────────

             Défaut introduit par moi ce matin, et trouvé le soir même : le
             fond d'images signale chaque tuile qui manque — un carré de mer
             absent, un niveau de zoom pas encore rendu — et j'écoutais ces
             signaux comme s'ils disaient que le fond entier avait échoué. Au
             PREMIER carré manquant, on basculait donc sur le fond vectoriel,
             celui qui justement n'arrive pas à Dakar. La carte s'affichait
             une demi-seconde, puis redevenait noire.

             La règle est simple : une fois que la carte a chargé, elle est
             vivante. Les erreurs qui suivent ne concernent que des morceaux,
             et on ne rebâtit pas la maison parce qu'une tuile est tombée. */
          if (charge.current) return;
          secours.current = true;
          setMotifCarte(pourquoi.slice(0, 80));
          console.error("BIA — fond de carte injoignable, on passe aux images :", pourquoi);
          try {
            /* Le secours est maintenant l'autre fond : si les images ne
               viennent pas, on tente le vectoriel — et inversement quand
               quelqu'un a posé NEXT_PUBLIC_CARTE_FOND. */
            m.setStyle((FOND === FOND_IMAGES
              ? FOND_VECTORIEL
              : FOND_IMAGES) as unknown as string);
            /* Le second fond a droit à sa propre montre : s'il ne vient pas
               non plus, alors seulement on avoue. */
            if (montre.current) clearTimeout(montre.current);
            montre.current = setTimeout(() => {
              if (vivant && !charge.current) { setSansCarte(true); prevenirUneFois(); }
            }, 6000);
          } catch {
            setSansCarte(true);
            prevenirUneFois();
          }
        };
        m.on("error", (e) => {
          const quoi = e?.error?.message || String(e || "");
          console.error("BIA — la carte :", quoi);
          /* ── ON NOTE TOUJOURS, ON DÉCIDE ENSUITE ────────────────────────

             Le motif était posé à l'intérieur du basculement, donc il
             n'existait que dans le cas où l'on basculait — et il ne
             s'affichait que si la carte s'était déclarée morte. Deux
             conditions pour voir une information qui sert justement à
             comprendre pourquoi rien ne se voit.

             Lamine m'a envoyé quatre captures d'un écran noir aujourd'hui,
             et aucune ne portait la moindre trace de ce qui manquait. On
             note d'abord, on décide après. */
          setMotifCarte((deja) => deja || quoi.slice(0, 90));
          basculer(quoi || "le fond n'a pas répondu");
        });
        maplibreRef.current = maplibre;
        m.on("load", () => {
          charge.current = true;
          /* LE FOND EST PEINT. Les deux points se posent dans les lignes qui
             suivent, sans attendre quoi que ce soit — on peut prevenir. */
          prevenirUneFois();
          /* L'ARRIVEE, ET SON HALO QUI BAT. Un marqueur immobile se confond
             avec les cent autres symboles d'une carte ; celui-ci respire,
             donc l'oeil le trouve tout de suite. Le dessin est a nous : le
             marqueur par defaut de la bibliotheque ne sait pas battre. */
          const pastille = document.createElement("div");
          pastille.className = "pin-arrivee";
          pastille.setAttribute("aria-label", "La destination");
          pastille.innerHTML = '<span class="pin-halo"></span><span class="pin-coeur"></span>';
          marqueurArrivee.current = new maplibre.Marker({ element: pastille, anchor: "center" })
            .setLngLat([destination.lon, destination.lat]).addTo(m);
        });

        /* ── UNE BOÎTE DE ZÉRO PIXEL DONNE LE MÊME ÉCRAN NOIR ────────────
           MapLibre mesure sa boîte une fois, à l'ouverture. Si elle vaut
           encore 0 × 0 à cet instant — une animation qui vient de finir, un
           téléphone qui tourne — il ne demande aucune tuile et n'en
           redemandera jamais. On le remesure donc à chaque changement de
           taille. C'est deux lignes, et ça couvre une famille entière de
           pannes muettes. */
        const oeil = new ResizeObserver(() => { try { m.resize(); } catch { } });
        if (boite.current) oeil.observe(boite.current);
        regard.current = oeil;

        /* ── ET SI ÇA SE TAIT QUAND MÊME ────────────────────────────────
           Une panne silencieuse est pire qu'une panne : on regarde un
           rectangle noir sans savoir s'il faut attendre. Au bout de quinze
           secondes sans « load », on l'avoue et le guidage continue à la
           voix — c'est lui qui compte, la carte n'est que le décor. */
        /* SIX SECONDES, PAS QUINZE. Quinze secondes de rectangle noir devant
           quelqu'un à qui on montre l'application, c'est déjà perdu — il a eu
           le temps de conclure que ça ne marche pas. À six secondes on tente
           l'autre fond ; si lui non plus ne vient pas, on l'avoue et le
           guidage continue à la voix, qui est ce qui compte vraiment. */
        montre.current = setTimeout(() => {
          if (vivant && !charge.current) basculer("rien n'est venu en six secondes");
        }, 6000);
      } catch (err) {
        console.error("BIA — la carte n'a pas pu s'ouvrir :", err);
        setSansCarte(true);
        prevenirUneFois();
      }
    })();
    return () => {
      const m = carte.current as unknown as { remove?: () => void } | null;
      vivant = false;
      if (montre.current) { clearTimeout(montre.current); montre.current = null; }
      regard.current?.disconnect(); regard.current = null;
      try { marqueurArrivee.current?.remove(); } catch { }
      try { marqueurMoi.current?.remove(); } catch { }
      marqueurArrivee.current = null; marqueurMoi.current = null;
      maplibreRef.current = null;
      cadre.current = false;
      charge.current = false;
      m?.remove?.(); carte.current = null;
    };
  }, [destination.lat, destination.lon]);

  /* ── LE CHEMIN ───────────────────────────────────────────────────────────
     Calculé une fois, et recalculé seulement si on s'en écarte vraiment.
     Recalculer à chaque seconde brûlerait le quota et la batterie pour rien. */
  const calculer = useCallback(async (de: [number, number]) => {
    if (!code) { setEtat("Il faut ton code."); return; }
    setEtat("Maa ngi seet yoon wi…");
    void dire(["je-cherche-le-chemin"]);
    try {
      const r = await fetch(
        `/api/chemin?delat=${de[1]}&delon=${de[0]}&verslat=${destination.lat}&verslon=${destination.lon}`,
        { headers: { "x-bia-code": code } },
      );
      const d = await r.json() as {
        chemin?: Chemin | null; panne?: boolean; provisoire?: boolean;
        base_sons?: { wo: string; fr: string };
      };
      if (d.provisoire) setProvisoire(true);
      if (d.base_sons) baseSons.current = d.base_sons[langue] || d.base_sons.wo || "";
      if (!d.chemin) {
        setEtat(d.panne ? "Réseau bi amul." : "Gisuma yoon bu dem fa.");
        void dire([d.panne ? "pas-de-reseau" : "pas-de-chemin"]);
        return;
      }
      dejaDites.current = new Set();
      setChemin(d.chemin);
      setEtat("");
      void dire(["allons-y", "regarde-la-route"]);
    } catch {
      setEtat("Réseau bi amul.");
      void dire(["pas-de-reseau"]);
    }
  }, [code, destination.lat, destination.lon, dire, langue]);

  const calculEnCours = useRef(false);
  useEffect(() => {
    if (!position || chemin || calculEnCours.current) return;
    calculEnCours.current = true;
    void calculer(position).finally(() => { calculEnCours.current = false; });
  }, [position, chemin, calculer]);

  /* ── LE TRACÉ SUR LA CARTE ───────────────────────────────────────────── */
  useEffect(() => {
    const m = carte.current as unknown as {
      isStyleLoaded?: () => boolean; getSource?: (id: string) => unknown;
      addSource?: (id: string, s: unknown) => void; addLayer?: (l: unknown) => void;
      fitBounds?: (b: number[][], o: unknown) => void;
    } | null;
    if (!m || !chemin || !m.isStyleLoaded?.()) return;
    const donnees = { type: "Feature", geometry: { type: "LineString", coordinates: chemin.trace } };
    const source = m.getSource?.("yoon") as { setData?: (d: unknown) => void } | undefined;
    if (source?.setData) source.setData(donnees);
    else {
      m.addSource?.("yoon", { type: "geojson", data: donnees });
      m.addLayer?.({
        id: "yoon", type: "line", source: "yoon",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#e2b04a", "line-width": 7, "line-opacity": 0.9 },
      });
    }
    const lons = chemin.trace.map((c) => c[0]);
    const lats = chemin.trace.map((c) => c[1]);
    m.fitBounds?.(
      [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]],
      { padding: 70, duration: 800 },
    );
  }, [chemin]);

  /* ── OÙ EN EST-ON, ET QUAND PARLER ──────────────────────────────────────
     C'est ici que le guidage existe vraiment. Tout le reste est du décor. */
  useEffect(() => {
    if (!position || !chemin) return;

    const m = carte.current as unknown as { easeTo?: (o: unknown) => void } | null;
    m?.easeTo?.({ center: position, duration: 400 });

    const ou = surLeChemin(position, chemin.trace);

    /* SORTI DU CHEMIN. On ne recalcule pas au premier écart : un GPS de
       téléphone saute de vingt mètres à l'arrêt. Soixante mètres, c'est une
       rue manquée, pas du bruit. */
    if (ou.ecart > ECART_HORS_CHEMIN) {
      setEtat("Génn nga ci yoon wi.");
      void dire(["sorti-du-chemin"]);
      setChemin(null);
      return;
    }
    setEtat("");

    /* Sur quelle étape sommes-nous, et combien reste-t-il avant la manœuvre
       suivante — mesuré le long du tracé, pas à vol d'oiseau. */
    let iEtape = 0;
    let debutEtape = 0;
    for (const e of chemin.etapes) {
      const finEtape = debutEtape + Math.max(1, e.trace.length - 1);
      if (ou.indice <= finEtape) break;
      debutEtape = finEtape;
      iEtape++;
    }
    const etape = chemin.etapes[iEtape];
    if (!etape) return;
    const suivante = chemin.etapes[iEtape + 1];
    const cible = suivante || etape;

    const finIndice = Math.min(chemin.trace.length - 1, debutEtape + Math.max(1, etape.trace.length - 1));
    let parcouru = 0;
    for (let i = ou.indice; i < finIndice; i++) {
      parcouru += metresEntre(chemin.trace[i], chemin.trace[i + 1]);
    }
    const restant = Math.round(parcouru);

    setProchaine({ cle: cible.manoeuvre || "", metres: restant, rue: cible.rue });

    /* L'ARRIVÉE passe avant tout : sur la dernière étape, on ne parle plus de
       virage. */
    if (iEtape >= chemin.etapes.length - 2 && restant < 300) {
      if (!dejaDites.current.has("presque")) {
        dejaDites.current.add("presque");
        void dire(["presque-arrive"]);
      }
      if (restant < 40 && !dejaDites.current.has("arrive")) {
        dejaDites.current.add("arrive");
        const fin = chemin.etapes[chemin.etapes.length - 1];
        void dire([fin.manoeuvre || "arrive"]);
      }
      return;
    }

    const a = annonceA(restant, cible.manoeuvre, dejaDites.current);
    if (a) void dire([a.distance, a.manoeuvre].filter(Boolean) as string[]);
  }, [position, chemin, dire]);

  const bat = parle || ditQuelqueChose;

  return (
    <div className="carte">
      <div className="carte-fond" ref={boite} aria-label="La carte" />

      {/* Le motif seul, quand la carte ne s'est pas déclarée morte mais que
          quelque chose a tout de même manqué. C'est le seul moyen de savoir,
          depuis un téléphone, ce qui s'est passé — il n'y a pas de console à
          ouvrir sur un iPhone. */}
      {motifCarte && !sansCarte ? (
        <p className="carte-sans-motif carte-motif-seul">carte : {motifCarte}</p>
      ) : null}
      {sansCarte ? (
        <div className="carte-sans">
          <p><b>La carte ne s&apos;affiche pas</b></p>
          <p>Le guidage continue : écoute-moi, je te dis où tourner.</p>
          {/* Le motif, en petit. Un écran qui dit « ça ne marche pas » sans
              dire pourquoi fait chercher pendant une heure du mauvais côté —
              on a déjà perdu deux soirées comme ça cette semaine. */}
          {motifCarte ? <p className="carte-sans-motif">({motifCarte})</p> : null}
        </div>
      ) : null}

      {/* ── ELLE S'EST RETIRÉE, MAIS ELLE EST LÀ ─────────────────────────
          La pastille bat quand elle parle. C'est tout ce qui reste d'elle à
          l'écran, et c'est voulu : la carte a besoin de la place. */}
      <button type="button" className={bat ? "carte-pastille parle" : "carte-pastille"}
        onClick={onFermer} aria-label="Revenir à BIA">
        <span className="carte-rond" />
        <span className="carte-mot">BIA</span>
      </button>

      {prochaine?.cle ? (
        <div className="carte-manoeuvre">
          <span className="carte-fleche">{FLECHE[prochaine.cle] || "→"}</span>
          <span className="carte-metres">
            {prochaine.metres < 50 ? "maintenant" : `${prochaine.metres} m`}
          </span>
          <span className="carte-quoi">
            {EN_FRANCAIS[prochaine.cle] || ""}
            {prochaine.rue ? <em> — {prochaine.rue}</em> : null}
          </span>
        </div>
      ) : null}

      <div className="carte-bas">
        {etat ? <p className="carte-etat">{etat}</p> : null}
        {motifGps ? <p className="carte-sans-motif">{motifGps}</p> : null}
        <p className="carte-ou">
          <b>{destination.dit}</b>
          {chemin ? <> · {(chemin.metres / 1000).toFixed(1)} km</> : null}
        </p>
        {/* Le micro n'est jamais coupé : on lui parle par-dessus la carte.
            Ce bouton ne fait que ramener son visage. */}
        <button type="button" className="carte-revenir" onClick={onFermer}>
          Ramène-moi BIA
        </button>
        {provisoire ? (
          <p className="carte-avis">
            Itinéraires calculés par un serveur de démonstration — à remplacer
            avant d&apos;ouvrir au public.
          </p>
        ) : null}
      </div>
    </div>
  );
}
