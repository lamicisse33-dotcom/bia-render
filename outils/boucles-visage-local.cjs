#!/usr/bin/env node
/* ── FABRIQUER LES SIX BOUCLES DU VISAGE LOCAL ─────────────────────────────

   Usage :
     RUNWAYML_API_SECRET=... node outils/boucles-visage-local.cjs --devis
     RUNWAYML_API_SECRET=... node outils/boucles-visage-local.cjs --je-paie

   La variable est celle qui sert DÉJÀ à l'avatar Runway de BIA
   (lib/avatar-runway-serveur.ts) : il n'y en a aucune nouvelle à créer, et
   elle est déjà posée sur Render.

   ── POURQUOI PAS /v1/avatar_videos, QUE LAMINE AVAIT NOMMÉ ────────────────

   Vérifié dans la documentation Runway le 29 octobre 2026, pas supposé :
   `POST /v1/avatar_videos` fabrique une vidéo d'un avatar QUI PARLE à partir
   d'un script ou d'un son. Elle ne prend ni durée, ni format, ni proportion,
   et elle produit par construction une bouche QUI BOUGE.

   Or ce qu'il faut ici est l'exact contraire : des boucles de trois à quatre
   secondes, BOUCHE FERMÉE, en 720 × 720, sur lesquelles on compose notre
   propre bouche. Cette route-là ne peut donc pas les produire — et en plus
   elle exige de créer d'abord un avatar par `POST /v1/avatars`, dont les
   sorties expirent en 24 à 48 heures.

   La bonne route est `POST /v1/image_to_video`, modèle `gen4_turbo` : elle
   prend une image de départ, une proportion CARRÉE (960:960) et une durée
   (entier de 2 à 10 secondes). On descend ensuite à 720 × 720 ici.

   ── LA BOUCLE EXACTE ──────────────────────────────────────────────────────

   Aucun modèle vidéo ne garantit de revenir sur sa première image. On ne
   l'espère donc pas : on prend les deux premières secondes et on y recolle
   les mêmes à l'envers. Le retour à la première image est alors exact par
   construction, et ça ne coûte rien de plus.

   ── CE SCRIPT NE DÉPENSE RIEN SANS QU'ON LE LUI DISE ──────────────────────

   `--devis` demande le coût à Runway et s'arrête. Rien n'est généré, rien
   n'est facturé. Seul `--je-paie` lance vraiment les six fabrications.
   C'est la règle de Lamine : une dépense de serveur ne se décide pas toute
   seule.                                                                  */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const CLE = process.env.RUNWAYML_API_SECRET || "";
const VERSION = "2024-11-06";
const BASE = process.env.RUNWAY_BASE_URL || "https://api.dev.runwayml.com";
const PORTRAIT = "public/personnages/tenues-hd-20261028/vert-or-repos.webp";
const SORTIE = "public/personnages/boucles-20261029";

/* Les six états. Le même socle revient dans chaque consigne : c'est lui qui
   garde le MÊME personnage d'une boucle à l'autre. Si l'identité dérive, le
   visage local ne sera pas « le même personnage », et tout tombe. */
const SOCLE = "Same woman, same braided hair, same outfit, same jewellery, same black background, "
  + "same framing and camera, head and shoulders, fixed camera, no zoom, no cut, no text. "
  + "LIPS STAY CLOSED AND STILL throughout. Natural micro-movements only.";

const BOUCLES = [
  { id: "repos", consigne: "She rests quietly, calm and attentive. Slow natural blinking, barely perceptible breathing." },
  { id: "ecoute", consigne: "She listens to someone off camera. Slight attentive tilt of the head, gentle nod once, warm eyes." },
  { id: "parole", consigne: "She is speaking calmly to someone off camera: small natural head motion and eyebrow movement, engaged expression." },
  { id: "parole-joyeuse", consigne: "She is speaking cheerfully: brighter eyes, smiling cheeks, livelier head motion." },
  { id: "reflexion", consigne: "She is thinking: eyes drifting slightly to the side and back, a small thoughtful frown, then relaxing." },
  { id: "rire", consigne: "She is laughing warmly with closed lips: shoulders and head move with the laughter, eyes crinkle." },
];

function dire(...m) { console.log(...m); }

function imageDeDepart() {
  const octets = fs.readFileSync(PORTRAIT);
  /* Runway accepte une URI de données. Le portrait n'a donc pas besoin
     d'être publié quelque part pour servir de première image. */
  return "data:image/webp;base64," + octets.toString("base64");
}

async function runway(chemin, options = {}) {
  const r = await fetch(BASE + chemin, {
    ...options,
    headers: {
      "Authorization": "Bearer " + CLE,
      "X-Runway-Version": VERSION,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const texte = await r.text();
  let corps = null;
  try { corps = JSON.parse(texte); } catch { /* Runway a répondu autre chose que du JSON */ }
  if (!r.ok) throw new Error("Runway " + r.status + " : " + texte.slice(0, 400));
  return corps;
}

function corpsDeLaDemande(boucle, image) {
  return {
    model: "gen4_turbo",
    promptImage: image,
    ratio: "960:960",
    duration: 4,
    promptText: (SOCLE + " " + boucle.consigne).slice(0, 1000),
  };
}

async function lancer(boucle, image) {
  const t = await runway("/v1/image_to_video", { method: "POST", body: JSON.stringify(corpsDeLaDemande(boucle, image)) });
  return t.id;
}

async function attendre(id) {
  /* « Consumers of this API should not expect updates more frequent than
     once every five seconds for a given task. » On respecte. */
  for (;;) {
    const t = await runway("/v1/tasks/" + id);
    if (t.status === "SUCCEEDED") return t;
    if (t.status === "FAILED" || t.status === "CANCELLED") {
      throw new Error("Tâche " + id + " " + t.status + " : " + (t.failure || t.failureCode || "sans motif"));
    }
    await new Promise(r => setTimeout(r, 5000));
  }
}

function ffmpeg(args) {
  try { return execFileSync("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] }); }
  catch (e) { throw new Error("ffmpeg indisponible ou en échec : " + (e.stderr ? String(e.stderr).slice(-400) : e.message)); }
}

/** Deux secondes aller, les mêmes à l'envers : retour exact à la première
 *  image, sans rien espérer du modèle. Puis 720 × 720, H.264 et WebM. */
function boucler(entree, id) {
  const base = path.join(SORTIE, id);
  const filtre = "[0:v]trim=0:2,setpts=PTS-STARTPTS,scale=720:720:flags=lanczos,split[a][b];"
    + "[b]reverse[r];[a][r]concat=n=2:v=1:a=0[v]";
  ffmpeg(["-y", "-i", entree, "-filter_complex", filtre, "-map", "[v]", "-an",
    "-c:v", "libx264", "-profile:v", "main", "-pix_fmt", "yuv420p", "-crf", "26",
    "-movflags", "+faststart", base + ".mp4"]);
  ffmpeg(["-y", "-i", entree, "-filter_complex", filtre, "-map", "[v]", "-an",
    "-c:v", "libvpx-vp9", "-crf", "34", "-b:v", "0", "-row-mt", "1", base + ".webm"]);
  for (const f of [base + ".mp4", base + ".webm"]) {
    const ko = Math.round(fs.statSync(f).size / 1024);
    dire("   " + path.basename(f) + " — " + ko + " Ko" + (ko > 2048 ? "  ⚠ AU-DESSUS DE 2 Mo" : ""));
  }
}

(async () => {
  const devis = process.argv.includes("--devis");
  const paie = process.argv.includes("--je-paie");
  if (!devis && !paie) {
    dire("Choisis : --devis (ne dépense rien) ou --je-paie (lance les six fabrications).");
    process.exit(2);
  }
  if (!CLE) {
    dire("");
    dire("  LA CLÉ RUNWAY N'EST PAS DANS CE TERMINAL.");
    dire("");
    dire("  Elle existe déjà sur Render, sous le nom :");
    dire("");
    dire("      RUNWAYML_API_SECRET");
    dire("");
    dire("  (celle de l'avatar Runway de BIA — il n'y a RIEN de nouveau à créer).");
    dire("  Pour fabriquer les boucles depuis cet ordinateur, recopie-la une fois");
    dire("  dans le terminal :");
    dire("      RUNWAYML_API_SECRET=... node outils/boucles-visage-local.cjs --devis");
    dire("");
    dire("  AUCUNE clé n'est nécessaire au fonctionnement du visage local : les boucles");
    dire("  fabriquées une fois, rangées dans " + SORTIE + ", et servies comme des");
    dire("  fichiers ordinaires. Le serveur n'appelle jamais Runway.");
    process.exit(1);
  }

  const image = imageDeDepart();

  if (devis) {
    /* Runway rend `estimatedCost.credits` à la création. On ne peut pas
       l'obtenir sans créer la tâche — alors on en crée UNE SEULE, on lit son
       coût, et on multiplie par six. Une tâche de quatre secondes, c'est le
       devis le moins cher possible, et c'est honnête : je ne devine pas un
       prix, je le demande. */
    dire("Devis : une seule fabrication est lancée pour connaître le prix réel.");
    const t = await runway("/v1/image_to_video", { method: "POST", body: JSON.stringify(corpsDeLaDemande(BOUCLES[0], image)) });
    const credits = t.estimatedCost && t.estimatedCost.credits;
    dire("  tâche " + t.id);
    dire("  coût annoncé pour UNE boucle : " + credits + " crédits");
    dire("  donc pour les six : environ " + (credits * 6) + " crédits");
    dire("");
    dire("  Compare ce nombre à ton solde avant de lancer --je-paie.");
    dire("  (La tâche lancée pour ce devis sera facturée : c'est une vraie");
    dire("   fabrication. Elle servira de boucle « repos » si tu continues.)");
    return;
  }

  fs.mkdirSync(SORTIE, { recursive: true });
  const brut = path.join(SORTIE, "brut");
  fs.mkdirSync(brut, { recursive: true });

  for (const b of BOUCLES) {
    dire("→ " + b.id);
    const id = await lancer(b, image);
    const t = await attendre(id);
    const url = t.output && t.output[0];
    if (!url) throw new Error(b.id + " : aucune sortie");
    const octets = Buffer.from(await (await fetch(url)).arrayBuffer());
    const source = path.join(brut, b.id + ".mp4");
    fs.writeFileSync(source, octets);
    dire("   source " + Math.round(octets.length / 1024) + " Ko, coût " + (t.cost && t.cost.credits) + " crédits");
    boucler(source, b.id);
  }
  dire("");
  dire("Fait. Vérifie les six à l'œil avant de pousser : une boucle dont la");
  dire("bouche s'ouvre est inutilisable ici, et ça ne se voit qu'en regardant.");
})().catch(e => { console.error(String(e.message || e)); process.exit(1); });
