export const PROFILS_RAPIDITE = ['sonnet', 'haiku', 'haiku-optimise', 'segment-2500', 'sonnet-segment-1500'] as const;
export type ProfilRapidite = typeof PROFILS_RAPIDITE[number];
export function profilRapidite(v: unknown): ProfilRapidite | null {
  return PROFILS_RAPIDITE.includes(v as ProfilRapidite) ? v as ProfilRapidite : null;
}
export function profilRapiditeAutorise(v: unknown, maitre: boolean) {
  return maitre ? profilRapidite(v) : null;
}
export function modeleRapidite(profil: unknown, normal: string): string {
  const p = profilRapidite(profil);
  return p === 'sonnet' || p === 'sonnet-segment-1500' ? 'claude-sonnet-5-5' : p === 'haiku' || p === 'haiku-optimise' ? 'claude-haiku-5-5' : normal;
}
export function rapiditeOptimisee(profil: unknown) { return profil === 'haiku-optimise'; }
export function profilRapiditeNavigateur() {
  return typeof window === 'undefined' ? null : profilRapidite(new URL(window.location.href).searchParams.get('essai-rapidite'));
}
export function entetesRapidite(): Record<string, string> {
  const profil = profilRapiditeNavigateur();
  return profil ? {'x-bia-essai-rapidite': profil} : {};
}
export function segmentRapiditeMs(profil: unknown) { return profil === 'sonnet-segment-1500' ? 1500 : rapiditeOptimisee(profil) || profil === 'segment-2500' ? 2500 : 4000; }
