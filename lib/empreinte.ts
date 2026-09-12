/* ── L'EMPREINTE DU TEXTE DIT ────────────────────────────────────────────────

   Lamine, le 12 septembre 2026 : « il faut vérifier est-ce que vraiment elle
   lit le répertoire correctement, c'est-à-dire les mots corrigés. »

   Un son s'appelle par sa CLÉ — « wo/salut.mp3 » — jamais par son texte. Donc
   un texte corrigé après enregistrement s'affiche corrigé et se DIT comme
   avant, et rien dans l'application ne pouvait s'en apercevoir.

   Huit signes calculés sur le texte suffisent à le voir. Ce fichier ne
   contient que ça, et il est ici — dans lib, pas dans une route — parce que
   DEUX endroits en ont besoin et qu'ils doivent calculer la même chose :

     — la route d'enregistrement, pour savoir quoi refaire ;
     — l'adresse du son, pour que le téléphone n'écoute pas sa vieille copie.

   Le second est le plus vicieux, et sans lui tout le reste est inutile. Les
   sons sont rangés dans le cache du navigateur sous leur adresse, et cette
   adresse est déclarée IMMUABLE — c'est ce qui les rend instantanés. Refaire
   le fichier chez Supabase ne changerait donc rien à ce qu'on entend : le
   téléphone continuerait de jouer l'ancien, pour toujours, sans jamais
   redemander. L'empreinte entre donc dans l'adresse. Texte changé, adresse
   changée, cache manqué, son neuf. Et texte inchangé, adresse inchangée :
   on ne retélécharge rien pour rien.

   CE N'EST PAS DE LA CRYPTOGRAPHIE et ça n'a pas à l'être : on ne se défend
   pas contre quelqu'un qui voudrait fabriquer deux textes de même empreinte,
   on veut juste voir qu'un texte a bougé.                                   */

/** Une empreinte courte et stable d'un texte, en huit signes. */
export function empreinteDe(texte: string): string {
  const t = String(texte || "").replace(/\s+/g, " ").trim();
  let a = 0x811c9dc5, b = 0x01000193;
  for (let i = 0; i < t.length; i++) {
    a = ((a ^ t.charCodeAt(i)) * b) >>> 0;
    b = (b + 0x9e3779b9) >>> 0;
  }
  return (a.toString(36) + t.length.toString(36)).slice(0, 8);
}
