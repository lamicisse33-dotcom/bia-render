/** Sélection visuelle uniquement. Aucun accès au micro ou à la voix. */
export const SATIN_ID = 'satin-anime' as const;
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
  preparation = new Promise<void>((resolve, reject) => {
    const img = new Image();
    const limite = setTimeout(() => reject(new Error('Chargement du personnage trop long')), 20000);
    img.onerror = () => { clearTimeout(limite); reject(new Error('Personnage indisponible')); };
    img.onload = () => {
      const p = typeof img.decode === 'function' ? img.decode() : Promise.resolve();
      p.then(() => { clearTimeout(limite); resolve(); }, e => { clearTimeout(limite); reject(e); });
    };
    img.src = SATIN_POSTER;
  });
  void preparation.catch(() => { preparation = undefined; });
  return preparation;
}
