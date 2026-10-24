/* ── L'ÉCRAN QUI S'ÉTEINT PENDANT QUE BIA EST LÀ ───────────────────────────

   Lamine, le 24 octobre 2026 : « l'écran du téléphone passe en veille pendant
   que BIA est affichée, alors que c'était réglé hier. »

   CE QUE DIT LA MESURE, lue sur /api/etat → veille, son iPhone réel :

     appareil   iOS 18.7 Safari installée
     tenu       8        relache  3        refuse  3
     motifs     NotAllowedError
     dernier    relache                ← l'état courant : plus de verrou

   AUCUN COMMIT N'A TOUCHÉ CE FICHIER. `git log` sur lib/veille-native.ts ne
   montre rien depuis le 22 octobre. Ce qui a changé hier, c'est que Khalam
   Rapide est devenue la connexion PAR DÉFAUT : elle ouvre et ferme deux
   AudioContext et le microphone à chaque session, et se met en pause après
   90 secondes de silence. Chacune de ces transitions fait relâcher le verrou
   par iOS — la cause est une conséquence, pas une ligne cassée.

   ET DEUX DÉFAUTS RÉELS ICI, QUI RENDAIENT LA PERTE DÉFINITIVE :

   1. ON CROYAIT TENIR UN VERROU PERDU. La seule vérification était
      `verrou.released`. Quand iOS relâche sans mettre ce drapeau à jour — ou
      sans émettre l'événement `release` — l'ancien code prenait la branche
      « j'ai déjà un verrou », reprogrammait dans 30 secondes, et refaisait le
      même constat indéfiniment. L'écran s'éteignait et AUCUN retour, aucune
      touche ne le rallumait.

   2. LA REPRISE N'AVAIT PAS DE GESTE. `NotAllowedError`, sur iOS, c'est une
      demande sans activation de l'utilisateur. Après un relâchement, la
      reprise automatique à 1 seconde arrivait donc sans geste et était
      refusée ; le repli passait à 15 secondes, puis échouait pareil. Pendant
      qu'il écoute BIA parler, il ne touche rien : la reprise ne venait jamais.

   CE QUI CHANGE, et c'est exactement ce qu'il a demandé — « re-demandé quand
   on revient sur l'onglet, sur iPhone comme sur Android » :

     — tout geste (pointerdown, touchend, click, keydown) REDEMANDE le verrou
       sans se croire sur parole, et relâche l'ancien ;
     — le battement périodique redemande aussi, au lieu de supposer. Un verrou
       silencieusement perdu devient impossible : au pire on le reprend trente
       secondes plus tard ;
     — le retour de visibilité redemande, comme avant.

   CE QUE ÇA COÛTE : un appel d'API toutes les trente secondes tant que BIA
   est à l'écran. C'est une fonction du navigateur, pas un réseau, pas un
   modèle : ça ne coûte ni jeton ni octet. La batterie, elle, se vide — mais
   c'est le but, et le verrou tombe dès qu'on quitte BIA.

   ET LE COMPTEUR A PARLÉ AVANT MOI. `refuse: 3` avec `NotAllowedError` et
   `dernier: relache` disaient tout ; il n'y avait qu'à les lire. */

type Verrou = {
  released?: boolean;
  release: () => Promise<void>;
  addEventListener?: (type: string, fn: () => void) => void;
};

/** Les événements qui portent une activation de l'utilisateur : eux seuls
    peuvent faire accepter une reprise par iOS. */
const GESTES = ['pointerdown', 'touchend', 'click', 'keydown'];
/** Les retours à la page, qui n'ont pas d'activation mais changent l'état. */
const RETOURS = ['visibilitychange', 'pageshow', 'focus'];
/** Battement de vérification : on redemande plutôt que de supposer. */
const BATTEMENT_MS = 30000;
/** Après un refus, on réessaie — un geste, lui, passe devant. */
const APRES_REFUS_MS = 15000;

/** One native lock at a time. Never play silent media alongside BIA's voice. */
export function maintenirEcranEveille(o: {
  api?: { request: (type: 'screen') => Promise<Verrou> };
  visible: () => boolean;
  noter: (event: 'tenu' | 'refuse' | 'relache' | 'api_absente', detail?: string) => void;
  ecouter: (event: string, fn: () => void) => () => void;
  planifier?: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
  annuler?: (id: ReturnType<typeof setTimeout>) => void;
}) {
  let vivant = true, verrou: Verrou | null = null, enCours = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const planifier = o.planifier || setTimeout, annuler = o.annuler || clearTimeout;

  const programmer = (ms: number) => {
    if (timer !== undefined) annuler(timer);
    timer = undefined;
    if (vivant && o.visible()) timer = planifier(() => { timer = undefined; void tenir(); }, ms);
  };

  const lacher = (ancien: Verrou | null) => {
    if (ancien) void ancien.release().catch(() => {});
  };

  /** Demander le verrou. On ne suppose JAMAIS qu'on le tient encore : c'est
      ce qui laissait l'écran s'éteindre sans retour possible. */
  const tenir = async () => {
    if (!vivant || !o.visible() || !o.api || enCours) return;
    enCours = true;
    const precedent = verrou;
    try {
      const nouveau = await o.api.request('screen');
      if (!vivant || !o.visible()) { await nouveau.release(); verrou = null; return; }
      /* Le nouveau tient : l'ancien n'a plus de raison d'être. iOS n'en garde
         qu'un de toute façon, et en laisser traîner un empêche de savoir
         lequel compte. */
      if (precedent && precedent !== nouveau) lacher(precedent);
      verrou = nouveau;
      o.noter('tenu');
      let libere = false;
      nouveau.addEventListener?.('release', () => {
        if (libere) return;
        libere = true;
        if (vivant) o.noter('relache');
        /* Relâché : on ne garde pas une référence morte, et on redemande
           tout de suite. Un geste, s'il arrive avant, passera devant. */
        if (verrou === nouveau) { verrou = null; programmer(1000); }
      });
      programmer(BATTEMENT_MS);
    } catch (e) {
      /* NotAllowedError = demande sans geste, ou page pas pleinement active.
         On garde l'ancien verrou s'il existe — il tient peut-être encore —
         et on réessaie ; le prochain geste redemandera tout de suite. */
      if (vivant) o.noter('refuse', e instanceof Error ? e.name : 'refus');
      programmer(APRES_REFUS_MS);
    } finally {
      enCours = false;
    }
  };

  const changer = () => {
    if (!o.visible()) {
      if (timer !== undefined) annuler(timer);
      timer = undefined;
      const ancien = verrou; verrou = null; lacher(ancien);
      return;
    }
    void tenir();
  };

  /* Un geste redemande IMMÉDIATEMENT : c'est la seule chose qu'iOS accepte
     après un refus, et c'est le chemin de retour que Lamine a demandé. */
  const geste = () => { if (vivant && o.visible()) void tenir(); };

  const fins = [
    ...RETOURS.map((e) => o.ecouter(e, changer)),
    ...GESTES.map((e) => o.ecouter(e, geste)),
  ];

  if (!o.api) o.noter('api_absente'); else void tenir();

  return () => {
    vivant = false;
    fins.forEach((f) => f());
    if (timer !== undefined) annuler(timer);
    timer = undefined;
    const ancien = verrou; verrou = null; lacher(ancien);
  };
}
