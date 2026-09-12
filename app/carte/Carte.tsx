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

const FOND = process.env.NEXT_PUBLIC_CARTE_FOND || "https://tiles.openfreemap.org/styles/liberty";

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
  destination, code, langue, onFermer, onDitTexte, parle,
}: {
  destination: Lieu;
  code: string | null;
  langue: "wo" | "fr";
  onFermer: () => void;
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

  const [position, setPosition] = useState<[number, number] | null>(null);
  const [chemin, setChemin] = useState<Chemin | null>(null);
  const [etat, setEtat] = useState("Maa ngi seet yoon wi…");
  const [prochaine, setProchaine] = useState<{ cle: string; metres: number; rue: string } | null>(null);
  const [sansCarte, setSansCarte] = useState(false);
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

    setDitQuelqueChose(true);
    try {
      for (const c of utiles) {
        if (jeton.current !== mien) return;
        await new Promise<void>((fini, rate) => {
          const a = new Audio(baseSons.current + encodeURIComponent(c) + ".wav");
          sonEnCours.current = a;
          a.onended = () => fini();
          a.onerror = () => rate(new Error("son de guidage absent"));
          a.play().catch(rate);
        });
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
    const suivi = navigator.geolocation.watchPosition(
      (p) => setPosition([p.coords.longitude, p.coords.latitude]),
      () => { setEtat("GPS bi feeñul."); void dire(["pas-de-gps"]); },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(suivi);
  }, [dire]);

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
        const m = new maplibre.Map({
          container: boite.current,
          style: FOND,
          center: [destination.lon, destination.lat],
          zoom: 14,
        });
        m.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-left");
        m.on("error", () => setSansCarte(true));
        m.on("load", () => {
          new maplibre.Marker({ color: "#e2b04a" })
            .setLngLat([destination.lon, destination.lat]).addTo(m);
        });
        carte.current = m as unknown as Record<string, unknown>;
      } catch {
        setSansCarte(true);
      }
    })();
    return () => {
      const m = carte.current as unknown as { remove?: () => void } | null;
      vivant = false; m?.remove?.(); carte.current = null;
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

      {sansCarte ? (
        <div className="carte-sans">
          <p><b>La carte ne s&apos;affiche pas</b></p>
          <p>Le guidage continue : écoute-moi, je te dis où tourner.</p>
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
