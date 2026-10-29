/* ── « SATIN BLEU NUIT — LOCAL » : L'ANCIENNE BOUCHE NE RESSORT JAMAIS ─────

   Lamine, le 29 octobre 2026 : « ces vidéos ont déjà été branchées et la
   bouche ne suivait pas le son — normal, elles ont une bouche animée filmée
   dedans. Donc : ne compte jamais sur leur bouche. […] capture trois images
   clés (début, milieu, fin de phrase) pour me montrer que l'ancienne bouche
   ne ressort jamais. »

   ── COMMENT ON LE PROUVE, ET PAS SEULEMENT ON L'AFFIRME ───────────────────

   La bouche composée n'est pas posée À CÔTÉ de la vidéo : le canevas de
   BoucheSatin REDESSINE l'image de la vidéo puis pose la bouche dessus, et
   la vidéo elle-même reste dessous. Tant que ce canevas est opaque et
   couvre le cadre, la bouche filmée n'est plus à l'écran du tout.

   On ne se fie donc pas à l'intention : on exige que le canevas soit
   visible et opaque aux trois instants, on relève l'ouverture qu'il a
   peinte, et on garde trois images que Lamine peut regarder. */
const { spawn } = require('child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('assert/strict');
const PORT = Number(process.env.BIA_PORT || 3155);
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
  const S = process.env.BIA_IMAGES || '/tmp';

  const releve = async () => page.evaluate(() => ({
    motAuDessusDuMicro: (document.querySelector('.micro-et-mode .mode-actuel') || {}).textContent || '',
    personnageExistant: document.querySelectorAll('.portrait .avatar').length,
    boutonDiscussion: !!document.querySelector('[aria-label="Ouvrir la discussion écrite"]'),
    boutonMicro: !!document.querySelector('button.microphone'),
    boutonMoi: !!document.querySelector('.papier-ouvrir'),
  }));
  const avant = await releve();

  /* ── CHOISIR « SATIN BLEU NUIT — LOCAL » ───────────────────────────────── */
  await page.click('.papier-ouvrir');
  await page.getByRole('button', { name: 'Changer de personnage' }).click();
  const choix = page.getByRole('button', { name: 'Bia satin bleu nuit — local (bouche sur le son)' });
  await choix.waitFor({ state: 'visible', timeout: 20000 });
  await choix.click();
  await page.waitForSelector('[data-bia-habillage="satin-local"]', { timeout: 30000 });
  rapport.selectionnable = true;

  /* Les deux autres satins ne sont PAS à l'écran en même temps. */
  assert.equal(await page.locator('[data-bia-habillage="satin-anime"]').count(), 0,
    'le satin d’origine ne doit pas être affiché en même temps que le local');
  assert.equal(await page.locator('[data-bia-habillage="satin-local"]').count(), 1);

  await page.getByRole('button', { name: 'Fermer le choix' }).click().catch(() => {});
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(500);

  /* ── UNE PHRASE, ET TROIS IMAGES PENDANT QU'ELLE PARLE ─────────────────── */
  await page.waitForSelector('button.microphone', { timeout: 10000 });
  await page.click('button.microphone');

  /* On attend que le canevas de la bouche se mette à peindre : c'est le
     signal que le son joue et que la bouche le suit. */
  await page.waitForFunction(() => {
    const c = document.querySelector('canvas[data-bia-bouche-audio="oui"]');
    return c && c.dataset.peint && getComputedStyle(c).visibility === 'visible';
  }, null, { timeout: 90000 });

  const cadre = page.locator('[data-bia-habillage="satin-local"] .cadre, [data-bia-habillage="satin-local"]').first();
  const etatBouche = () => page.evaluate(() => {
    const c = document.querySelector('canvas[data-bia-bouche-audio="oui"]');
    const v = document.querySelector('video[data-video-visible="oui"]');
    const s = c ? getComputedStyle(c) : null;
    return {
      canevas_visible: !!c && s.visibility === 'visible',
      canevas_opacite: c ? Number(c.style.opacity || s.opacity) : null,
      ouverture_peinte: c ? Number(c.dataset.ouverture || -1) : null,
      age_du_son_ms: c ? Number(c.dataset.audioAge || -1) : null,
      sequence_jouee: v ? v.dataset.sequence : null,
      instant_video_s: v ? +Number(v.currentTime).toFixed(2) : null,
    };
  });

  const images = [];
  for (const [n, nom] of [[0, 'debut'], [1, 'milieu'], [2, 'fin']]) {
    if (n) await page.waitForTimeout(900);
    const e = await etatBouche();
    const fichier = S + '/satin-local-' + nom + '.png';
    await cadre.screenshot({ path: fichier });
    images.push({ instant: nom, ...e });
    /* L'EXIGENCE : à chacun des trois instants, le canevas qui redessine la
       vidéo ET pose la bouche doit être visible et pleinement opaque. S'il
       ne l'est pas, c'est la bouche filmée qu'on voit. */
    assert.equal(e.canevas_visible, true, nom + ' : le canevas de la bouche n’est pas visible');
    assert.equal(e.canevas_opacite, 1, nom + ' : le canevas n’est pas opaque (' + e.canevas_opacite + ')');
    assert(e.age_du_son_ms >= 0 && e.age_du_son_ms < 200,
      nom + ' : la bouche ne suit plus le son (âge ' + e.age_du_son_ms + ' ms)');
  }
  rapport.images_cles = images;

  /* ── LA PRISE RESTE DANS SA FENÊTRE CALME ──────────────────────────────
     Recopiées de lib/animation-satin.ts, qui les tient de la mesure
     (outils/passages-calmes.cjs). Hors de ces fenêtres, la bouche filmée
     s'ouvre plus grand que ce qu'on sait poser dessus. */
  const CALMES = { ecoute:[0,3.21], parole:[1.29,4.50], joie:[6.13,9.33],
    rire:[6.67,9.88], coeurs:[1.25,4.46], bisou:[2.17,5.38] };
  for (const i of images) {
    if (!i.sequence_jouee || i.instant_video_s === null) continue;
    const f = CALMES[i.sequence_jouee];
    assert(f, 'prise inconnue : ' + i.sequence_jouee);
    assert(i.instant_video_s >= f[0] - 0.2 && i.instant_video_s <= f[1] + 0.2,
      i.instant + ' : la vidéo joue à ' + i.instant_video_s + ' s, hors de la fenêtre calme '
      + f[0] + '→' + f[1] + ' s de « ' + i.sequence_jouee + ' »');
  }
  rapport.fenetres_calmes_respectees = true;

  const apres = await releve();
  assert.deepEqual(apres, avant, 'quelque chose a bougé autour du personnage : '
    + JSON.stringify({ avant, apres }));
  rapport.rien_na_bouge = apres;

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
