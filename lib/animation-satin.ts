/** Sélection visuelle uniquement. Aucun accès au micro ou à la voix. */
export const SATIN_ID = 'satin-anime' as const;
/** Le même personnage, ses mêmes vidéos — mais sa bouche filmée est
 *  entièrement recouverte par une bouche synchronisée sur le son joué.
 *  L'autre reste là, intacte : c'est la référence à comparer. */
export const SATIN_LOCAL_ID = 'satin-local' as const;
export const SATIN_BASE = '/personnages/satin-anime-20261028';
export const SATIN_POSTER = `${SATIN_BASE}/repos.webp`;
export const SEQUENCES_SATIN = ['ecoute', 'parole', 'joie', 'rire', 'coeurs', 'bisou'] as const;
export type SequenceSatin = typeof SEQUENCES_SATIN[number];
export function estSequenceSatin(v: unknown): v is SequenceSatin {
  return typeof v === 'string' && SEQUENCES_SATIN.some(s => s === v);
}
export function reactionSatin(face: string): SequenceSatin | null {
  if (/^coeur(?:_double)?_\d+$/.test(face)) return 'coeurs';
  if (/^bisou_\d+$/.test(face)) return 'bisou';
  if (/^(?:rire|fourire)(?:_|$)/.test(face)) return 'rire';
  return null;
}
export function sequenceParoleSatin(emotion: string): SequenceSatin {
  return /^(joie|rire|fourire|malice)$/.test(emotion) ? 'joie' : 'parole';
}
export function sequenceSatin({parle, ecoute, emotion = 'neutre', face = '', anime = true}: {
  parle: boolean; ecoute: boolean; emotion?: string; face?: string; anime?: boolean;
}): SequenceSatin | null {
  if (!anime) return null;
  // Une reprise de l'utilisateur prime même sur un ancien état « speaking ».
  if (ecoute) return 'ecoute';
  if (parle) return sequenceParoleSatin(emotion);
  return reactionSatin(face) || 'ecoute';
}
let preparation: Promise<void> | undefined;
export function chargerPosterSatin() {
  if (preparation) return preparation;
  preparation = Promise.all([SATIN_POSTER].map(src=>new Promise<void>((resolve, reject) => {
    const img = new Image();
    const limite = setTimeout(() => reject(new Error('Chargement du personnage trop long')), 20000);
    img.onerror = () => { clearTimeout(limite); reject(new Error('Personnage indisponible')); };
    img.onload = () => {
      const p = typeof img.decode === 'function' ? img.decode() : Promise.resolve();
      p.then(() => { clearTimeout(limite); resolve(); }, e => { clearTimeout(limite); reject(e); });
    };
    img.src = src;
  }))).then(()=>{});
  void preparation.catch(() => { preparation = undefined; });
  return preparation;
}

/** Fenêtre où les lèvres parlent réellement dans les prises validées.
 * Le début de la prise générique est une attente de plusieurs secondes. */
export function fenetreParoleSatin(clip: SequenceSatin): {debut: number; fin: number} | null {
  if (clip === 'parole') return {debut: 3.65, fin: 8.35};
  if (clip === 'joie') return {debut: 2, fin: 8.8};
  return null;
}

/* ── LES PASSAGES OÙ LA BOUCHE FILMÉE BOUGE LE MOINS ───────────────────────

   Lamine, le 29 octobre 2026 : « ces vidéos ont déjà été branchées et la
   bouche ne suivait pas le son — normal, elles ont une bouche animée filmée
   dedans. Donc : ne compte jamais sur leur bouche. […] Choisis comme fond de
   parole les passages où la bouche d'origine bouge le moins. »

   MESURÉ, pas choisi à l'œil. Le suivi image par image (levres.json) porte
   en cinquième colonne l'ouverture de la bouche D'ORIGINE. On a cherché,
   dans chaque prise, la fenêtre de 3,2 s dont l'ouverture MAXIMALE est la
   plus basse — le maximum et non la moyenne, parce qu'une seule image grande
   ouverte suffit à faire ressortir l'ancienne bouche.
   Voir outils/passages-calmes.cjs, qui recalcule ces nombres.

   Ouverture maximale dans la fenêtre retenue :
     ecoute  0,014   parole  0,120   joie  0,236
     rire    0,206   coeurs  0,078   bisou 0,069
   Le plafond de l'atlas des bouches composées est 0,2502 : aucune de ces
   fenêtres ne le dépasse, donc toutes sont recouvrables.

   CE QUI EST ÉCARTÉ, ET POURQUOI. Sur la prise entière, « rire » passe
   37,8 % de ses images au-dessus du plafond et « joie » 10 % : hors de ces
   fenêtres, la bouche filmée s'ouvre plus grand que ce qu'on sait poser
   dessus. On ne joue donc jamais ces prises en entier sur ce personnage. */
export const FENETRES_CALMES: Record<SequenceSatin, {debut: number; fin: number}> = {
  ecoute: {debut: 0, fin: 3.21},
  parole: {debut: 1.29, fin: 4.50},
  joie: {debut: 6.13, fin: 9.33},
  rire: {debut: 6.67, fin: 9.88},
  coeurs: {debut: 1.25, fin: 4.46},
  bisou: {debut: 2.17, fin: 5.38},
};
export function fenetreCalmeSatin(clip: SequenceSatin) { return FENETRES_CALMES[clip]; }
