/* ── POURQUOI BIA « N'A PLUS DE MÉMOIRE » : LES SIX CISEAUX ────────────────

   Lamine, 24 octobre 2026 : « BIA n'a plus de mémoire et se perd dans les
   discussions. » Mesuré sur /api/etat avant de toucher à quoi que ce soit,
   champ `memoire_transmise.derniere` :

     historique_tours   12        ← le téléphone en envoie 32 à 40
     souvenirs_signes   1799      ← 12 540 souvenirs existent
     lexique_signes     1898
     lecons_signes         0
     devoirs_signes        0      ← 125 devoirs, 74 actifs
     instructions_signes  9111

   LA CAUSE EST UN SEUL DRAPEAU. `app/api/chat/route.ts` appelle la
   conversation avec `rapide:true`, et dans ce mode lib/conversation-groq.ts
   coupe tout : le fil aux 12 DERNIERS messages, le budget à 6 000 signes, les
   souvenirs à 1 800, le lexique à 2 200, les leçons à 2 000, le contexte à
   1 800. La fenêtre du fil est pourtant calculée à 32 messages avec un
   plafond serveur de 40 (lib/fenetre-du-fil.ts) : le téléphone envoyait, le
   serveur jetait les trois quarts.

   Six messages d'échange de mémoire, c'est exactement « elle se perd dans la
   discussion ».

   CE QUE ÇA COÛTE, ET IL FAUT LE DIRE AVANT. Le socle est mis en cache ; le
   FIL NE L'EST PAS. Passer de 12 à 40 messages ajoute environ 5 000 à 6 000
   signes par tour, soit ~1 500 jetons d'entrée payés plein tarif à chaque
   phrase. C'est la dépense que AVANT-DE-DIRE-QUE-C-EST-BON.md raconte
   (« 36 000 jetons envoyés pour 114 reçus ») — donc chaque valeur est ici,
   bornée, publiée dans /api/etat et réglable depuis Render sans déploiement.

   RETOUR EN ARRIÈRE, une variable chacun :
     BIA_FIL_MESSAGES=12  BIA_FIL_SIGNES=6000  BIA_SOUVENIRS_SIGNES=1800
     BIA_LEXIQUE_SIGNES=2200  BIA_LECONS_SIGNES=2000  BIA_CONTEXTE_SIGNES=1800
     BIA_LIVE_HISTORIQUE=12  BIA_LIVE_COMPRESSION=18000

   MODULE SANS AUCUN IMPORT, exprès : même leçon que lib/premier-segment.ts et
   lib/diffusion.ts — une épreuve qui rend un module factice ferait arriver
   `undefined` et un réglage NaN couperait la mémoire en silence. */

const borne = (v: string | undefined, defaut: number, min: number, max: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? Math.round(n) : defaut;
};

/** Messages du fil gardés par le serveur en mode rapide. */
export const filRapideMessages = () => borne(process.env.BIA_FIL_MESSAGES, 40, 4, 80);
/** Budget de signes pour le fil. */
export const filRapideSignes = () => borne(process.env.BIA_FIL_SIGNES, 24000, 2000, 60000);
/** Extrait de souvenirs transmis. */
export const souvenirsSignes = () => borne(process.env.BIA_SOUVENIRS_SIGNES, 4500, 500, 20000);
/** Extrait de lexique transmis. */
export const lexiqueSignes = () => borne(process.env.BIA_LEXIQUE_SIGNES, 2800, 500, 20000);
/** Extrait de leçons transmis. */
export const leconsSignes = () => borne(process.env.BIA_LECONS_SIGNES, 2800, 500, 20000);
/** Fin du contexte conservée. */
export const contexteSignes = () => borne(process.env.BIA_CONTEXTE_SIGNES, 3600, 500, 20000);

/* ── KHALAM RAPIDE ────────────────────────────────────────────────────────

   La connexion rapide gardait 12 tours (`slice(-12)` dans
   lib/gemini-live-client.ts) et laissait Google compresser le contexte à
   partir de 18 000 jetons vers 9 000. Compresser, c'est RÉSUMER : et un
   résumé relu au tour suivant devient un souvenir faux, exactement ce que
   lib/souvenirs.ts refuse depuis le début. On remonte donc le déclencheur et
   on garde plus de tours intacts avant toute compression. */
export const liveHistoriqueTours = () => borne(process.env.BIA_LIVE_HISTORIQUE, 40, 4, 80);
export const liveCompressionJetons = () => borne(process.env.BIA_LIVE_COMPRESSION, 60000, 8000, 200000);
export const liveCompressionCible = () => Math.round(liveCompressionJetons() / 2);

/* ── L'ACCÈS TOTAL DE KHALAM RAPIDE, ET CE QU'IL COÛTE ─────────────────────

   Lamine, 24 octobre 2026 : « elle doit avoir accès TOTAL ». Ces budgets
   décident ce qui part dans la consigne de session : devoirs, ce qu'elle sait
   de KHALAM, la fiche produits, la vitrine, les fiches de connaissances.

   CE QUE ÇA COÛTE, et ce n'est pas le même coût que le fil : la consigne de
   session est payée UNE FOIS à l'ouverture, pas à chaque phrase. Une session
   plus chère à ouvrir, pas plus chère à tenir. Les tailles réellement parties
   sont publiées dans /api/gemini-live/session.

   Retour en arrière : BIA_LIVE_DEVOIRS=0 coupe les devoirs, et ainsi de
   suite — chacun a sa variable. */
export const liveDevoirsSignes = () => borne(process.env.BIA_LIVE_DEVOIRS, 40000, 0, 200000);
export const liveFichesSignes = () => borne(process.env.BIA_LIVE_FICHES, 12000, 0, 60000);
export const liveLexiqueCorrections = () => borne(process.env.BIA_LIVE_CORRECTIONS, 300, 0, 2000);

export const reglagesMemoire = () => ({
  revision: 'memoire-elargie-v1',
  fil_messages: filRapideMessages(),
  fil_signes: filRapideSignes(),
  souvenirs_signes: souvenirsSignes(),
  lexique_signes: lexiqueSignes(),
  lecons_signes: leconsSignes(),
  contexte_signes: contexteSignes(),
  live_historique_tours: liveHistoriqueTours(),
  live_compression_jetons: liveCompressionJetons(),
  live_devoirs_signes: liveDevoirsSignes(),
  live_fiches_signes: liveFichesSignes(),
  live_corrections_exactes: liveLexiqueCorrections(),
  avant_le_24_octobre: {fil_messages: 12, fil_signes: 6000, souvenirs_signes: 1800, lexique_signes: 2200, lecons_signes: 2000, contexte_signes: 1800, live_historique_tours: 12, live_compression_jetons: 18000},
  cout: 'Le socle est mis en cache, le fil ne l’est pas : chaque message gardé en plus est payé plein tarif à chaque tour. Lire depense et memoire_transmise avant de monter davantage.',
});
