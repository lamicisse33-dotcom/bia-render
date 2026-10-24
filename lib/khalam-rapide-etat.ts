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
type Echo = { coupures_pendant_parole: number; coupures_au_silence: number; trames_retenues: number; trames_laissees: number; echo_plancher: number; tours: number; arrets: Record<string, number>; code_fermeture: number; versions: Record<string, number> };
type Etat = { mesures: Mesure[]; tours: number; refusees: number; doublons: number; vus: Map<string, number>; basculements: { vers_rapide: number; vers_khalam: number }; echo: Echo };
const g = globalThis as typeof globalThis & { biaKhalamRapide?: Etat };
const etat: Etat = (g.biaKhalamRapide ??= { mesures: [], tours: 0, refusees: 0, doublons: 0, vus: new Map<string, number>(), basculements: { vers_rapide: 0, vers_khalam: 0 }, echo: { coupures_pendant_parole: 0, coupures_au_silence: 0, trames_retenues: 0, trames_laissees: 0, echo_plancher: 0, tours: 0, arrets: {}, code_fermeture: 0, versions: {} } });

const BORNE_MS = 60000;
const SESSIONS_AU_PLUS = 200;
const NOMS_ARRET = new Set(["alphabet", "fermeture", "fermeture_pendant_parole", "veille", "erreur"]);

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
  /* ── ELLE SE COUPE ELLE-MÊME : LE COMPTE, AVANT LE REMÈDE ────────────────
     Lamine, 24 octobre 2026. Une coupure survenue PENDANT qu'elle parlait est
     une interruption d'elle-même jusqu'à preuve du contraire ; une coupure
     dans le silence vient bien de la personne. Les deux sont comptées à part,
     sinon on ne saurait pas si le remède soigne ou s'il empêche la personne
     de la couper pour de vrai. */
  if (d.etape === "echo") {
    const n = (k: string, max: number) => { const v = Number(d[k]); return Number.isFinite(v) && v >= 0 && v <= max ? Math.round(v) : 0; };
    etat.echo = {
      coupures_pendant_parole: Math.max(etat.echo.coupures_pendant_parole, n("coupures_pendant_parole", 10000)),
      coupures_au_silence: Math.max(etat.echo.coupures_au_silence, n("coupures_au_silence", 10000)),
      trames_retenues: Math.max(etat.echo.trames_retenues, n("trames_retenues", 10000000)),
      trames_laissees: Math.max(etat.echo.trames_laissees, n("trames_laissees", 10000000)),
      echo_plancher: n("echo_plancher", 1000),
      tours: etat.echo.tours + 1,
      /* ── CHAQUE ARRÊT PORTE SON NOM ──────────────────────────────────────
         alphabet, fermeture, fermeture_pendant_parole, veille, erreur. Un
         arrêt sans nom est un arrêt qu'on cherchera encore demain. */
      arrets: (() => {
        const vus = { ...etat.echo.arrets };
        const recus = d.arrets;
        if (recus && typeof recus === "object" && !Array.isArray(recus)) {
          for (const [nom, fois] of Object.entries(recus as Record<string, unknown>)) {
            if (!NOMS_ARRET.has(nom)) continue;
            const v = Number(fois);
            if (Number.isInteger(v) && v >= 0 && v <= 10000) vus[nom] = Math.max(vus[nom] || 0, v);
          }
        }
        return vus;
      })(),
      code_fermeture: n("code_fermeture", 5000) || etat.echo.code_fermeture,
      /* LA VERSION QUE LE TÉLÉPHONE A CHARGÉE. Le 24 octobre, un zéro pouvait
         vouloir dire « pas d'écho » comme « ancien code en cache » : deux
         causes, un seul chiffre, donc aucune cause nommée. */
      versions: (() => {
        const v = String(d.version || "").slice(0, 20);
        const vus = { ...etat.echo.versions };
        if (/^[0-9a-f]{6,20}$/.test(v)) vus[v] = (vus[v] || 0) + 1;
        return vus;
      })(),
    };
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
    /* `coupures_pendant_parole` élevé = elle se coupe elle-même.
       `coupures_au_silence` = la personne la coupe, et c'est voulu.
       `trames_retenues` = l'écho filtré ; `trames_laissees` = ce qui est passé
       malgré le filtre, donc de vraies voix. */
    echo: { ...etat.echo, plancher_pour_mille: etat.echo.echo_plancher,
      /* Si `tours` vaut zéro, AUCUNE mesure n'est arrivée : le téléphone n'a
         pas le code, ou n'a pas fini un tour. Ne rien conclure de zéros qui
         n'ont jamais été écrits. */
      mesure_recue: etat.echo.tours > 0 },
    limite:
      "Mesure navigateur déclarée : de la fin de sa parole au premier son, avance de planification audio comprise. " +
      "Une seule mesure par tour, armée par une parole entendue pendant qu'elle se tait : un tour où on lui coupe la parole n'est pas mesuré. " +
      "Le silence de fin de parole décidé par la détection d'activité et le réseau du téléphone sont dedans sans être séparés. " +
      "Aucun texte, transcription ni son n'est exporté.",
  };
}
