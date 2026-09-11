/* ── LA POSER, SANS LA DÉFORMER ─────────────────────────────────────────────

   Lamine, le 11 septembre 2026 : « il faut ralentir de 30 % la vitesse de la
   voix de BIA, elle doit être beaucoup plus posée. Elle est trop agressive,
   elle parle très vite. »

   C'est la deuxième fois qu'il le demande. La première, le 10 septembre, j'ai
   baissé le `cfg_weight` d'Oolel Voices de 0,28 à 0,22 — le seul réglage qui
   agit sur le débit. Ça n'a pas suffi, et en allant lire la documentation du
   modèle j'ai compris pourquoi on n'irait pas plus loin par là :

     « The documentation does not mention an explicit speed or rate
       parameter. » — Chatterbox, dont Oolel Voices est dérivé.

   IL N'Y A PAS DE RÉGLAGE DE VITESSE. Ni chez le modèle, ni derrière. Le
   `cfg_weight` influence le débit, mais indirectement, et en dessous de 0,2 il
   ne ralentit plus : il détériore la voix. Le champ `speed` que j'avais
   ajouté « au cas où » ne repose sur rien — je l'ai laissé, désactivé, mais il
   ne faut pas compter dessus.

   ON RALENTIT DONC LE SON LUI-MÊME, ICI, SUR LE TÉLÉPHONE. Gratuit, exact,
   sans un signe envoyé à Soynade, et réglable sans redéployer.

   ── POURQUOI PAS SIMPLEMENT « JOUER PLUS LENTEMENT » ──────────────────────

   Parce que ce serait la voix de Kha, en plus grave. Ralentir une bande de
   30 % descend toutes les fréquences de 30 % : sa voix deviendrait celle
   d'une autre femme, plus grande et plus lourde. Après le travail qu'elle a
   fait pour enregistrer cette voix, c'est hors de question.

   ── CE QU'ON FAIT À LA PLACE : WSOLA ──────────────────────────────────────

   On découpe le son en fenêtres qui se chevauchent, et on les REPOSE plus
   espacées qu'on ne les a prises. La parole dure plus longtemps, mais chaque
   fenêtre garde sa hauteur : la voix reste exactement la même, elle prend
   seulement son temps.

   Le piège, c'est le raccord. Reposer les fenêtres n'importe où fait se
   contrarier les ondes entre elles — la voix prend un timbre métallique, un
   écho de salle de bains. WSOLA cherche donc, autour de l'endroit théorique,
   le décalage où la nouvelle fenêtre RESSEMBLE LE PLUS à la suite naturelle
   de la précédente, et c'est là qu'il coupe. Les périodes de la voix
   s'alignent, et le raccord ne s'entend pas.

   C'est un vieux procédé, et c'est justement pour ça qu'on le prend : il est
   sûr, il coûte peu, et il tourne sans peine sur un téléphone d'entrée de
   gamme — celui de la plupart des gens à qui BIA parlera. */

/** Ce que Lamine a demandé : 30 % plus lent. */
export const VITESSE_POSEE = 0.7;

/* Une fenêtre de 48 ms : plus longue, les attaques de consonnes se dédoublent ;
   plus courte, les voyelles graves ne tiennent pas une période entière. */
const FENETRE_MS = 48;
/* On cherche le meilleur raccord à ± 7 ms. Une période de voix féminine fait
   entre 4 et 6 ms : cette fenêtre en contient toujours une, donc il existe
   toujours un décalage qui aligne. */
const CHERCHE_MS = 7;
/* La ressemblance se juge sur un échantillon, pas sur toute la fenêtre : deux
   cent cinquante-six points suffisent à reconnaître une période, et ça divise
   le travail du téléphone par cinq. */
const POINTS = 256;

/** Une fenêtre de Hann : elle monte et redescend, donc deux fenêtres
    superposées se recouvrent exactement — sans bosse ni trou de volume. */
function hann(n: number): Float32Array {
  const f = new Float32Array(n);
  for (let i = 0; i < n; i++) f[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
  return f;
}

/**
 * Étire un son sans toucher à sa hauteur.
 * @param entree  les échantillons
 * @param sr      la fréquence d'échantillonnage
 * @param vitesse 0,7 = 30 % plus lent. 1 = on ne touche à rien.
 */
export function etirer(entree: Float32Array, sr: number, vitesse: number): Float32Array {
  const v = Number.isFinite(vitesse) ? Math.min(Math.max(vitesse, 0.5), 2) : 1;
  // Sous un centième près de la vitesse normale, l'étirement ne s'entend pas
  // et ne vaut pas le calcul.
  if (Math.abs(v - 1) < 0.01 || entree.length < sr * 0.05) return entree;

  const N = Math.max(128, Math.round((FENETRE_MS / 1000) * sr));
  const moitie = Math.floor(N / 2);
  /* Le pas de SORTIE est fixe ; c'est le pas d'ENTRÉE qui change. On avance
     moins vite dans le son d'origine qu'on ne le repose : il s'allonge. */
  const pasSortie = moitie;
  const pasEntree = Math.max(1, Math.round(pasSortie * v));
  const cherche = Math.max(1, Math.round((CHERCHE_MS / 1000) * sr));
  const fenetre = hann(N);

  const longueur = Math.max(N, Math.ceil(entree.length / v) + N);
  const sortie = new Float32Array(longueur);
  const poids = new Float32Array(longueur);

  /* La « suite naturelle » : ce qui aurait dû venir après la fenêtre qu'on
     vient de poser, si on n'avait rien étiré. C'est à ça que la prochaine
     fenêtre doit ressembler. */
  let attendu: Float32Array | null = null;
  let lu = 0;        // où on en est dans le son d'origine
  let ecrit = 0;     // où on en est dans le son fabriqué
  // On compare un point sur `saut` : POINTS points répartis sur le recouvrement.
  const saut = Math.max(1, Math.floor(moitie / POINTS));

  while (lu + N < entree.length && ecrit + N < longueur) {
    let depart = lu;

    if (attendu) {
      /* LE CŒUR DE WSOLA. Autour de l'endroit théorique, on essaie chaque
         décalage et on garde celui qui ressemble le plus à la suite
         naturelle. Une simple somme de produits suffit : on ne cherche pas la
         meilleure corrélation au sens strict, seulement l'alignement des
         périodes — et c'est ce que ce produit mesure. */
      let meilleur = -Infinity;
      const min = Math.max(0, lu - cherche);
      const max = Math.min(entree.length - N - 1, lu + cherche);
      for (let d = min; d <= max; d += 2) {
        let somme = 0;
        for (let i = 0, j = 0; j < moitie; i++, j += saut) somme += attendu[j] * entree[d + j];
        if (somme > meilleur) { meilleur = somme; depart = d; }
      }
    }

    // On pose la fenêtre, adoucie aux deux bouts, et on l'additionne.
    for (let i = 0; i < N; i++) {
      const g = fenetre[i];
      sortie[ecrit + i] += entree[depart + i] * g;
      poids[ecrit + i] += g;
    }

    /* Ce qui suit VRAIMENT cette fenêtre dans le son d'origine : la prochaine
       devra y ressembler pour que le raccord soit inaudible. */
    const suite = depart + pasSortie;
    if (suite + moitie < entree.length) {
      attendu = entree.subarray(suite, suite + moitie);
    } else break;

    ecrit += pasSortie;
    lu = depart + pasEntree;
  }

  /* On divise par la somme des fenêtres au lieu de supposer qu'elle vaut un.
     Aux deux bouts du son, une seule fenêtre recouvre : sans cette division,
     le début et la fin seraient deux fois plus faibles. */
  const fin = Math.min(longueur, ecrit + N);
  const net = new Float32Array(fin);
  for (let i = 0; i < fin; i++) {
    const p = poids[i];
    net[i] = p > 1e-4 ? sortie[i] / p : 0;
  }
  return net;
}

/** La même chose, sur ce que le navigateur sait jouer. */
export function ralentir(ctx: BaseAudioContext, son: AudioBuffer, vitesse: number): AudioBuffer {
  const v = Number.isFinite(vitesse) ? vitesse : 1;
  if (Math.abs(v - 1) < 0.01) return son;

  const canaux: Float32Array[] = [];
  for (let c = 0; c < son.numberOfChannels; c++) {
    canaux.push(etirer(son.getChannelData(c), son.sampleRate, v));
  }
  const taille = Math.max(1, ...canaux.map((c) => c.length));
  const neuf = ctx.createBuffer(son.numberOfChannels, taille, son.sampleRate);
  for (let c = 0; c < canaux.length; c++) neuf.copyToChannel(canaux[c], c, 0);
  return neuf;
}

/* CE QUE LA PERSONNE PEUT RÉGLER ELLE-MÊME. La bonne vitesse ne se décide pas
   dans du code : elle s'écoute. Elle est donc gardée sur l'appareil et se
   change depuis la page de réglage, sans redéploiement et sans moi. */
export const CLE_VITESSE = "bia-vitesse";

export function vitesseChoisie(): number {
  try {
    const v = Number(localStorage.getItem(CLE_VITESSE));
    if (Number.isFinite(v) && v >= 0.5 && v <= 1) return v;
  } catch { /* navigateur privé : on garde la valeur par défaut */ }
  return VITESSE_POSEE;
}
