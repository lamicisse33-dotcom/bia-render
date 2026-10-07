/** Confirmation sur plusieurs syllabes, avec une tolérance aux consonnes et pauses brèves. */
export function creerDetectionInterruption() {
  const fenetre: Array<{ energie: number; voix: number; duree: number }> = [];
  return (audible: boolean, vocale: boolean, pasMs: number): boolean => {
    fenetre.push({ energie: audible ? pasMs : 0, voix: audible && vocale ? pasMs : 0, duree: pasMs });
    while (fenetre.reduce((n, x) => n + x.duree, 0) > 600) fenetre.shift();
    const energie = fenetre.reduce((n, x) => n + x.energie, 0);
    const voix = fenetre.reduce((n, x) => n + x.voix, 0);
    return audible && energie >= 300 && voix >= 120;
  };
}

/** Une porte levée ne suffit pas : le tour peut avoir été annulé pendant l'attente. */
export async function attendreSonTour(
  actuel: () => boolean,
  porte: () => { attendre: Promise<void> } | null,
): Promise<boolean> {
  while (actuel()) {
    const p = porte();
    if (!p) return true;
    await p.attendre;
  }
  return false;
}
