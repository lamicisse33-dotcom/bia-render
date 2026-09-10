/* ── LE BRUIT QU'ELLE FAIT QUAND ELLE ÉCRIT ─────────────────────────────────

   Demandé par Lamine le 10 septembre 2026 : « quand tu lui demandes d'écrire
   quelque chose, il doit y avoir un petit son qui montre que ta demande est en
   train d'être exécutée. Sinon on ne peut pas savoir que la chose s'exécute. »

   Il a raison, et c'est le défaut le plus coûteux de l'attente : entre la
   demande et le papier, il ne se passait RIEN. Ni son, ni mouvement. Dix
   secondes de silence, et on croit que l'application est morte — on touche
   ailleurs, on recharge, on perd tout.

   AUCUN FICHIER SON. Le bruit est fabriqué par le téléphone lui-même : un
   petit choc de touche, très court, répété irrégulièrement. Trois raisons :
   il marche tout de suite sans rien enregistrer ni télécharger ; il ne coûte
   pas un octet de réseau, ce qui compte ici ; et surtout il n'est jamais deux
   fois identique, alors qu'une boucle enregistrée s'entend au bout de trois
   secondes et devient agaçante.

   IL RESTE DISCRET, exprès. Ce n'est pas une machine à écrire de cinéma :
   c'est le bruit de quelqu'un qui travaille dans la pièce d'à côté. Il doit
   se remarquer sans couvrir la voix de BIA. */

type Frappe = { arreter: () => void };

let encours: Frappe | null = null;

/** Le contexte audio, fabriqué au dernier moment : en créer un au chargement
    de la page est refusé par les navigateurs tant que personne n'a touché
    l'écran. Ici, on arrive toujours après un geste. */
function contexte(): AudioContext | null {
  try {
    type Fenetre = Window & { webkitAudioContext?: typeof AudioContext };
    const C = window.AudioContext || (window as Fenetre).webkitAudioContext;
    if (!C) return null;
    return new C();
  } catch { return null; }
}

/**
 * Commence le bruit de frappe. Rappeler ne l'empile pas : il n'y a jamais
 * qu'une frappe à la fois, sinon deux services lancés coup sur coup
 * donneraient une mitraillette.
 */
export function frapper(): Frappe {
  if (encours) return encours;

  const ctx = contexte();
  if (!ctx) {
    const rien = { arreter: () => { encours = null; } };
    encours = rien;
    return rien;
  }

  const sortie = ctx.createGain();
  sortie.gain.value = 0.16;          // discret : elle parle par-dessus
  sortie.connect(ctx.destination);

  let vivant = true;
  let minuteur: ReturnType<typeof setTimeout> | null = null;

  /* Une touche : un choc bref et sourd. Un bruit blanc très court passé dans
     un filtre passe-bas, avec une enveloppe qui tombe en trente millisecondes
     — c'est ce qui fait « toc » plutôt que « bip ». */
  const touche = () => {
    if (!vivant) return;
    const duree = 0.03;
    const n = Math.floor(ctx.sampleRate * duree);
    const tampon = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = tampon.getChannelData(0);
    for (let i = 0; i < n; i++) {
      // Le bruit s'éteint tout seul : sans ça, on entend un clic à la coupure.
      d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2.4;
    }
    const source = ctx.createBufferSource();
    source.buffer = tampon;

    const filtre = ctx.createBiquadFilter();
    filtre.type = "lowpass";
    // Chaque touche sonne un peu différemment : une vraie main n'est pas
    // régulière, et l'oreille repère immédiatement ce qui l'est.
    filtre.frequency.value = 900 + Math.random() * 900;

    const volume = ctx.createGain();
    volume.gain.value = 0.6 + Math.random() * 0.5;

    source.connect(filtre); filtre.connect(volume); volume.connect(sortie);
    source.start();
  };

  const suivante = () => {
    if (!vivant) return;
    touche();
    /* Le rythme d'une vraie frappe : autour de neuf touches par seconde, avec
       de temps en temps une hésitation — c'est l'irrégularité qui rend le
       bruit crédible, pas la vitesse. */
    const pause = 70 + Math.random() * 90 + (Math.random() < 0.12 ? 260 : 0);
    minuteur = setTimeout(suivante, pause);
  };
  suivante();

  const frappe: Frappe = {
    arreter() {
      if (!vivant) return;
      vivant = false;
      if (minuteur) clearTimeout(minuteur);
      // On baisse au lieu de couper net : une coupure franche s'entend.
      try {
        sortie.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
        setTimeout(() => { try { ctx.close(); } catch {} }, 400);
      } catch { try { ctx.close(); } catch {} }
      encours = null;
    },
  };
  encours = frappe;
  return frappe;
}

/** Arrête la frappe, où qu'elle ait été lancée. */
export function arreterFrappe() {
  encours?.arreter();
}

/* ── LA CLOCHE DE FIN ───────────────────────────────────────────────────────

   « Est-ce que le travail est fini ? Ça doit sonner. » — Lamine, le 10
   septembre 2026.

   Le bruit de frappe dit qu'elle travaille ; il fallait le contraire, un son
   qui dit que c'est prêt. Deux notes qui montent, très courtes, claires : on
   les reconnaît d'une pièce à côté sans les confondre avec une notification
   de téléphone.

   Fabriqué ici aussi, sans fichier. Deux sinus, une quinte — do puis sol —
   avec une enveloppe douce : c'est ce qui fait « ding » et non « bip ». */
export function sonnerFini() {
  const ctx = contexte();
  if (!ctx) return;
  const sortie = ctx.createGain();
  sortie.gain.value = 0.22;
  sortie.connect(ctx.destination);

  const note = (hz: number, debut: number, duree: number) => {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = hz;
    const g = ctx.createGain();
    const t = ctx.currentTime + debut;
    /* L'attaque n'est pas instantanée et l'extinction est longue : une note
       coupée net claque, une note qui s'éteint sonne. */
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(1, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
    o.connect(g); g.connect(sortie);
    o.start(t); o.stop(t + duree + 0.05);
  };

  note(784, 0, 0.28);      // sol
  note(1175, 0.11, 0.42);  // ré au-dessus — la quinte, qui « ouvre »
  setTimeout(() => { try { ctx.close(); } catch {} }, 1200);
}
