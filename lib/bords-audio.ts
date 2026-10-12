/** Only digital zero is silence we can safely remove without speech recognition.
 * A quiet consonant, breath or word must survive, on every channel. */
export function bordsAudio(canaux: readonly ArrayLike<number>[], hz: number) {
  const longueur = canaux[0]?.length || 0;
  if (!Number.isFinite(hz) || hz <= 0 || canaux.some(c => c.length !== longueur))
    throw Error('format_audio');
  const muet = (i: number) => canaux.every(c => c[i] === 0);
  let debut = 0, fin = longueur;
  while (debut < fin && muet(debut)) debut++;
  while (fin > debut && muet(fin - 1)) fin--;
  // Keep a wholly silent clip intact; callers can explicitly reject it.
  if (debut === fin) return {debut: 0, fin: longueur, silencieux: true};
  const marge = Math.round(hz * .025);
  return {debut: Math.max(0, debut - marge), fin: Math.min(longueur, fin + marge), silencieux: false};
}

export function sansSilence(ctx: BaseAudioContext, brut: AudioBuffer): AudioBuffer {
  const canaux = Array.from({length: brut.numberOfChannels}, (_, c) => brut.getChannelData(c));
  const {debut, fin} = bordsAudio(canaux, brut.sampleRate);
  if (debut === 0 && fin === brut.length) return brut;
  const coupe = ctx.createBuffer(brut.numberOfChannels, fin - debut, brut.sampleRate);
  canaux.forEach((c, i) => coupe.copyToChannel(c.slice(debut, fin), i));
  return coupe;
}
