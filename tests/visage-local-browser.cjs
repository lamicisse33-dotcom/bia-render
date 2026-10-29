/* ── LE DEUXIÈME VISAGE DE BIA, MESURÉ DANS UN VRAI NAVIGATEUR À 375 px ────

   Lamine, le 29 octobre 2026 : « Mesure sur iPhone à 375 px : poids
   téléchargé, images par seconde, décalage bouche-son […] vérifie que le
   personnage Runway, Khalam Rapide, la carte, l'écriture plein écran et le
   mot au-dessus du micro ne bougent pas. »

   ── CE QUE CETTE ÉPREUVE MESURE VRAIMENT ──────────────────────────────────

   Une vraie page BIA, un vrai AudioContext, un vrai son qui se décode et se
   joue, et la VRAIE enveloppe sonore de app/page.tsx — celle des tranches de
   75 ms — qui commande `face`. La bouche du visage local n'est donc pas
   pilotée par l'épreuve : elle suit le son, comme sur le téléphone.

   Le son est synthétique (des bouffées de syllabes), parce qu'un son de
   Lamine ne peut pas vivre dans un dépôt public. C'est écrit à la fin.    */
const { spawn } = require('child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('assert/strict');
const PORT = Number(process.env.BIA_PORT || 3141);
const BASE = `http://127.0.0.1:${PORT}`;
let serveur, navigateur;

/* ── DU SON QUI RESSEMBLE À DE LA PAROLE ───────────────────────────────────
   Du silence ferait une bouche fermée du début à la fin, et l'épreuve
   passerait au vert en ne prouvant rien. Il faut des syllabes : des bouffées
   d'énergie séparées de creux, pour que l'enveloppe monte et descende et que
   la bouche ait quelque chose à suivre. */
function wavParole(ms = 2600, sr = 16000) {
  const n = Math.floor(sr * ms / 1000), b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8);
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    /* Quatre syllabes par seconde, d'amplitudes différentes : l'enveloppe
       doit traverser plusieurs seuils, sinon une seule forme suffirait. */
    const syllabe = Math.max(0, Math.sin(2 * Math.PI * 4 * t));
    const souffle = 0.35 + 0.65 * Math.abs(Math.sin(2 * Math.PI * 0.6 * t));
    let v = 0;
    for (let h = 2; h <= 14; h++) v += Math.sin(2 * Math.PI * 150 * h * t) / h;
    const e = Math.max(-1, Math.min(1, 0.95 * souffle * Math.pow(syllabe, 1.6) * v / 2.2));
    b.writeInt16LE(Math.round(e * 32000), 44 + i * 2);
  }
  return b.toString('base64');
}

const ETAT = { ecoute: 'runpod', voix: 'runpod', version: 'epreuve-visage-local',
  fin_de_parole: { silence_fin_parole_ms: 1200 },
  briques_conversation: { patience_brique_ms: 1200, premier_segment_apres_ms: 600, segment_ms: 1500 } };

const FAUX_MICRO = `
 window.__micros=0;
 /* Le compteur de bouches et l'instant où le son est VRAIMENT parti. On
    accroche AudioBufferSourceNode.start : c'est la seule horloge commune
    entre le son et l'image. */
 window.__bouches=[]; window.__sonDepart=null;
 (function(){
  const partir=window.AudioBufferSourceNode&&window.AudioBufferSourceNode.prototype.start;
  if(partir)window.AudioBufferSourceNode.prototype.start=function(...a){
   /* Le faux micro joue AUSSI un tampon, et c'est LUI qui partait en
      premier : mesurer depuis son départ donnait 3,5 s de « décalage
      bouche-son » qui n'étaient que le temps du tour entier. On ne garde
      donc que les sons que BIA fait sortir, jamais celui qu'elle écoute. */
   if(this.buffer&&!this.buffer.__micro&&this.buffer.duration>0.5&&window.__sonDepart===null)window.__sonDepart=performance.now();
   return partir.apply(this,a);
  };
 })();
 const voix=(ctx,secondes)=>{
  const sr=ctx.sampleRate,buf=ctx.createBuffer(1,Math.floor(sr*secondes),sr),d=buf.getChannelData(0),f0=150;
  buf.__micro=true;
  for(let i=0;i<d.length;i++){
   const t=i/sr; let v=0;
   for(let h=2;h<=20;h++)v+=Math.sin(2*Math.PI*f0*h*t)/h;
   d[i]=0.9*(0.7+0.3*Math.sin(2*Math.PI*3.5*t))*v/2.6;
  }
  return buf;
 };
 navigator.mediaDevices.getUserMedia=async()=>{
  const ctx=new (window.AudioContext||window.webkitAudioContext)();
  try{await ctx.resume();}catch{}
  const dest=ctx.createMediaStreamDestination();
  if(++window.__micros<=1){
   const src=ctx.createBufferSource();src.buffer=voix(ctx,2.2);
   const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=1200;bp.Q.value=0.6;
   src.connect(bp);bp.connect(dest);src.start();
  }
  return dest.stream;
 };
 try{localStorage.setItem('bia-code','EPREUVE2026');localStorage.setItem('bia-numero','+221771234567');}catch{}
`;

function attendreLeServeur() {
  return new Promise((bon, mal) => {
    const fin = Date.now() + 120000;
    const essai = () => fetch(BASE + '/', { cache: 'no-store' })
      .then(r => { if (r.status < 500) return bon(); throw Error('pas prêt'); })
      .catch(() => { if (Date.now() > fin) return mal(Error('le serveur local ne répond pas')); setTimeout(essai, 500); });
    essai();
  });
}

(async () => {
  serveur = spawn('node_modules/.bin/next', ['start', '-p', String(PORT)], { stdio: ['ignore', 'pipe', 'pipe'] });
  await attendreLeServeur();
  navigateur = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });

  const contexte = await navigateur.newContext({ viewport: { width: 375, height: 812 } });
  const page = await contexte.newPage();
  const erreurs = []; page.on('pageerror', e => erreurs.push(e.message));

  /* Le poids téléchargé, compté sur le réseau et non deviné : on additionne
     ce que le navigateur a VRAIMENT reçu pour le visage local. */
  const poids = new Map();
  const manquants = new Set();
  page.on('response', async r => {
    const c = new URL(r.url()).pathname;
    if (!c.startsWith('/personnages/')) return;
    /* Les six boucles n'existent pas encore : leurs adresses rendent une page
       « introuvable ». Compter le poids d'un 404 comme un poids téléchargé
       gonflerait le chiffre d'une soixantaine de kilo-octets qui ne sont pas
       le personnage. On ne compte que ce qui est vraiment servi. */
    if (r.status() !== 200) { manquants.add(c); return; }
    try { poids.set(c, (await r.body()).length); } catch { /* servie depuis le cache */ }
  });

  let briquesServies = 0;
  await page.route('**/api/**', async route => {
    const chemin = new URL(route.request().url()).pathname;
    const json = (d, s = 200) => route.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(d) });
    if (chemin === '/api/acces' || chemin === '/api/codes') return json({ ok: true, maitre: true });
    if (chemin === '/api/etat') return json(ETAT);
    if (chemin === '/api/rappels') return json({ rappels: [] });
    if (chemin === '/api/prises-validees') return json({ prises: [] });
    if (chemin === '/api/sons-courants') return json({ sons: [], attendus: 0 });
    if (chemin === '/api/ecouter/morceau') return json({ recu: 0 });
    if (chemin === '/api/anticipation/segment' || chemin === '/api/ecouter')
      return json({ texte: 'Nanga def ?', texte_brut: 'Nanga def ?', suggestions_ecriture: [] });
    if (chemin === '/api/chat') return json({ reply: 'Maa ngi fi rekk, papa.', source: 'epreuve' });
    if (chemin === '/api/anticipation/briques') {
      let corps = {}; try { corps = JSON.parse(route.request().postData() || '{}'); } catch {}
      if (corps.action) return json({ ok: true });
      if (!briquesServies++) return json({ preparation: { id: 'ep1', continuer: false,
        brique: { numero: 0, texte: 'Maa ngi fi rekk, papa.', audio: wavParole(), langue: 'wo', voice: 'female' } } });
      return json({ preparation: { id: 'ep1', termine: true } });
    }
    if (/^\/api\/(voix|chatterbox-test|piper-web)/.test(chemin)) return json({ erreur: 'epreuve' }, 503);
    return json({});
  });
  await page.addInitScript(FAUX_MICRO);

  await page.goto(BASE + '/?mode=khalam', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button.microphone', { timeout: 30000 });

  const rapport = {};

  /* ── CE QUI NE DOIT PAS BOUGER, RELEVÉ AVANT ───────────────────────────
     On photographie l'état des cinq choses qu'il a nommées AVANT de toucher
     au personnage, pour les comparer après. Un « ça n'a pas bougé » qui ne
     compare rien ne vaut rien. */
  const releve = async () => page.evaluate(() => ({
    motAuDessusDuMicro: (document.querySelector('.micro-et-mode .mode-actuel') || {}).textContent || '',
    personnageExistant: document.querySelectorAll('.portrait .avatar').length,
    boutonDiscussion: !!document.querySelector('[aria-label="Ouvrir la discussion écrite"]'),
    boutonMicro: !!document.querySelector('button.microphone'),
    boutonMoi: !!document.querySelector('.papier-ouvrir'),
  }));
  const avant = await releve();

  /* ── CHOISIR LE DEUXIÈME VISAGE ────────────────────────────────────────── */
  await page.click('.papier-ouvrir');
  await page.getByRole('button', { name: 'Changer de personnage' }).click();
  const choix = page.getByRole('button', { name: 'Bia — visage local (essai)' });
  await choix.waitFor({ state: 'visible', timeout: 20000 });
  await choix.click();
  await page.waitForSelector('[data-visage-local="oui"]', { timeout: 30000 });
  rapport.selectionnable = true;

  /* Le personnage existant n'est pas remplacé en douce : ses couches
     `.avatar` sont toujours là, et c'est PortraitTenue — l'autre habillage —
     qui cède la place. */
  assert.equal(await page.locator('[data-visage-local="oui"]').count(), 1);
  assert.equal(await page.locator('.presence:not([data-visage-local]) .visage').count(), 0,
    'les deux visages ne doivent jamais être affichés en même temps');

  await page.getByRole('button', { name: 'Fermer le choix' }).click().catch(() => {});
  await page.keyboard.press('Escape').catch(() => {});

  /* ── LA BOUCHE SUIT LE SON ─────────────────────────────────────────────── */
  await page.evaluate(() => {
    window.__bouches = []; window.__sonDepart = null;
    const img = document.querySelector('[data-visage-local="oui"] img');
    if (!img) throw new Error('la bouche du visage local est absente');
    new MutationObserver(() => {
      window.__bouches.push({ t: performance.now(), src: img.getAttribute('src') });
    }).observe(img, { attributes: true, attributeFilter: ['src'] });
  });

  await page.waitForSelector('button.microphone', { timeout: 10000 });
  await page.click('button.microphone');
  /* Le tour complet : le faux micro parle, l'oreille rend du texte, la
     brique arrive avec son son, le son se joue, la bouche suit. */
  await page.waitForFunction(() => window.__bouches.length > 6, null, { timeout: 90000 });
  await page.waitForTimeout(2600);

  const mesure = await page.evaluate(() => {
    const b = window.__bouches;
    const formes = [...new Set(b.map(x => (x.src || '').split('/').pop()))];
    const duree = b.length > 1 ? b[b.length - 1].t - b[0].t : 0;
    /* L'écart le plus court entre deux bouches : il ne doit jamais descendre
       sous les 40 ms du pas, sinon la boucle d'animation s'emballerait. */
    let minEcart = Infinity;
    for (let i = 1; i < b.length; i++) minEcart = Math.min(minEcart, b[i].t - b[i - 1].t);
    return {
      changements: b.length,
      formes_distinctes: formes.length,
      formes,
      duree_ms: Math.round(duree),
      changements_par_seconde: duree > 0 ? +(b.length / (duree / 1000)).toFixed(1) : 0,
      ecart_min_ms: Math.round(minEcart),
      decalage_bouche_son_ms: window.__sonDepart === null ? null : Math.round(b[0].t - window.__sonDepart),
    };
  });
  rapport.bouche = mesure;

  assert(mesure.changements > 6, 'la bouche n’a presque pas bougé : ' + JSON.stringify(mesure));
  assert(mesure.formes_distinctes >= 3,
    'la bouche n’a pris que ' + mesure.formes_distinctes + ' forme(s) : elle ne suit pas le son');
  /* Le pas est de 40 ms. Un écart plus court voudrait dire que la boucle
     d'animation ignore son horloge — et vingt-cinq images par seconde
     deviendraient soixante, payées en batterie pour rien. */
  assert(mesure.ecart_min_ms >= 35,
    'deux bouches à ' + mesure.ecart_min_ms + ' ms : le pas de 40 ms n’est pas respecté');
  assert(mesure.changements_par_seconde <= 25.5,
    mesure.changements_par_seconde + ' bouches par seconde : au-dessus des 25 demandées');

  /* ── LE POIDS TÉLÉCHARGÉ ───────────────────────────────────────────────── */
  const parDossier = {};
  for (const [c, n] of poids) {
    const d = c.includes('/bouches-') ? 'bouches' : c.includes('/boucles-') ? 'boucles' : 'portrait';
    parDossier[d] = (parDossier[d] || 0) + n;
  }
  rapport.poids_ko = Object.fromEntries(Object.entries(parDossier).map(([k, v]) => [k, Math.round(v / 1024)]));
  rapport.poids_total_ko = Math.round([...poids.values()].reduce((a, b) => a + b, 0) / 1024);
  rapport.fichiers_absents = manquants.size;

  /* ── ET RIEN D'AUTRE N'A BOUGÉ ─────────────────────────────────────────── */
  const apres = await releve();
  assert.deepEqual(apres, avant, 'quelque chose a bougé autour du personnage : '
    + JSON.stringify({ avant, apres }));
  rapport.rien_na_bouge = apres;

  /* La carte et l'écriture plein écran : on vérifie qu'elles sont toujours
     atteignables, pas qu'elles s'ouvrent — elles ont leurs propres épreuves. */
  rapport.carte_et_ecriture = await page.evaluate(() => ({
    carte_dans_la_page: !!document.querySelector('.papier-ouvrir'),
    ecriture_plein_ecran_libre: !document.querySelector('.ecrit-plein'),
  }));

  const graves = erreurs.filter(t => !/503|epreuve|Failed to load resource|AudioContext|NotAllowedError|onnxruntime|cpuid/i.test(t));
  assert.equal(graves.length, 0, 'erreurs de page : ' + graves.slice(0, 3).join(' | '));
  rapport.erreurs = graves.length;

  console.log(JSON.stringify(rapport));
  await contexte.close();
  await navigateur.close(); serveur.kill(); process.exit(0);
})().catch(async e => {
  console.error(e);
  if (navigateur) await navigateur.close();
  if (serveur) serveur.kill();
  process.exit(1);
});

/* ── CE QUE CETTE ÉPREUVE NE DIT PAS ───────────────────────────────────────

   LA BATTERIE SUR DIX MINUTES N'EST PAS ICI, et je ne peux pas l'inventer :
   je n'ai pas d'iPhone. Un navigateur sans écran, sans radio et sans batterie
   ne mesure pas une dépense de batterie. La marche à suivre est dans le
   rapport ; c'est Lamine qui la relève, sur son téléphone.

   LE POIDS DES BOUCLES EST ZÉRO AUJOURD'HUI, parce que les six vidéos
   n'existent pas encore : il manque la clé RUNWAY_API_KEY. Ce que le poids
   mesure ici, ce sont les huit bouches et le portrait. Le chiffre des boucles
   se lira le jour où elles seront fabriquées, sans toucher à cette épreuve.

   LE SON EST SYNTHÉTIQUE : des bouffées de syllabes, pas la voix de Kha. La
   bouche suit donc une enveloppe crédible, pas la vraie. Qu'elle tombe JUSTE
   sur du wolof ne se juge qu'à l'oreille et à l'œil, sur le téléphone — et
   c'est la raison d'être du deuxième personnage : les comparer. */
