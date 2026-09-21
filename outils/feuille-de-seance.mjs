/* ── LA FEUILLE DE SÉANCE : CE QU'IL FAUT ENREGISTRER POUR UNE VOIX ──────────
 *
 * 21 septembre 2026. Lamine me confie le moteur wolof après ChatGPT. Ce que
 * j'ai trouvé sur le Mac : UN enregistrement de Didi de 73 secondes, dont
 * 37 secondes de parole en 8 morceaux, transcrits par une oreille
 * automatique qui se trompe (« na ngë def », « lë rendezvous et prévue
 * demeure »). Huit entraînements ont tourné là-dessus. Aucun ne pouvait
 * donner une voix : un affinage de SpeechT5 demande des CENTAINES de phrases
 * propres, avec leur texte exact.
 *
 * Ce fichier fabrique la liste à enregistrer, à partir des textes wolof que
 * Lamine a DÉJÀ relus pour BIA (répertoire, base, services, guidage,
 * nombres) — je n'écris pas son wolof, je le rassemble. Sortie : un tableau
 * (.tsv) et une page à imprimer, une ligne par phrase, avec le nom du
 * fichier attendu en face. La même feuille sert pour Kha comme pour Didi :
 * seul le préfixe change.
 *
 *   node outils/feuille-de-seance.mjs DIDI  [dossier de sortie]
 *
 * Règles de studio, écrites sur la page : même micro, même pièce, même
 * distance ; une phrase par fichier ; on garde les respirations ; pas de
 * normalisation ; 48 kHz mono, 24 bits ; le fichier s'appelle exactement
 * comme la ligne. Le texte de la ligne est le texte qu'on dit — pas une
 * variante. C'est ce qui permet ensuite de mesurer la compréhension avec une
 * oreille (Soynade) sans que personne ne relise à la main.               */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");
const prefixe = (process.argv[2] || "VOIX").replace(/[^A-Z0-9]/gi, "").toUpperCase() || "VOIX";
const sortie = process.argv[3] || join(racine, "outils", "feuille-de-seance");

/* Les fichiers de textes relus, dans l'ordre où on veut les enregistrer :
   d'abord ce que BIA dit le plus souvent. */
const SOURCES = [
  ["lib/repertoire-textes.ts", "répertoire"],
  ["lib/base-textes.ts", "base"],
  ["lib/services-textes.ts", "services"],
  ["lib/guidage-textes.ts", "guidage"],
  ["lib/blagues-textes.ts", "blagues"],
  ["lib/nombres-textes.ts", "nombres"],
];

/* On lit `wolof: "…"` (et le `francais: "…"` le plus proche, pour la
   colonne de sens), en respectant les guillemets échappés. */
const CHAMP = /(wolof|francais|cle)\s*:\s*"((?:[^"\\]|\\.)*)"/g;
const normaliser = (t) => t.toLowerCase().replace(/[.,!?;:«»"'…()]/g, " ").replace(/\s+/g, " ").trim();

const lignes = [];
const vues = new Set();
for (const [fichier, groupe] of SOURCES) {
  let texte;
  try { texte = readFileSync(join(racine, fichier), "utf8"); } catch { continue; }
  let cle = "", francais = "";
  for (const m of texte.matchAll(CHAMP)) {
    const champ = m[1], valeur = m[2].replace(/\\"/g, "\"").replace(/\\n/g, " ").trim();
    if (champ === "cle") { cle = valeur; francais = ""; continue; }
    if (champ === "francais") {
      francais = valeur;
      /* Dans le répertoire, le français vient APRÈS le wolof : on le
         rattache à la ligne qu'on vient de poser, si elle est de la même clé. */
      const derniere = lignes[lignes.length - 1];
      if (derniere && derniere.cle === cle && !derniere.francais) derniere.francais = valeur;
      continue;
    }
    /* wolof */
    const n = normaliser(valeur);
    if (!n || n.length < 2 || vues.has(n)) continue;
    /* Un mot seul (les nombres) se dit aussi : on le garde, il fabrique la
       prononciation des chiffres. */
    vues.add(n);
    lignes.push({ groupe, cle, wolof: valeur, francais });
  }
}

const num = (i) => String(i + 1).padStart(4, "0");
const tsv = ["fichier\tgroupe\tcle\twolof\tfrancais",
  ...lignes.map((l, i) => [`${prefixe}-${num(i)}.wav`, l.groupe, l.cle, l.wolof, l.francais].map((c) => String(c || "").replace(/\t/g, " ")).join("\t"))].join("\n") + "\n";

const html = `<!doctype html><html lang="fr"><meta charset="utf-8"><title>Feuille de séance ${prefixe}</title>
<style>body{font:16px/1.5 -apple-system,Helvetica,Arial;margin:24px;max-width:900px}h1{font-size:22px}
.regles{background:#f5f5f5;padding:12px 16px;border-radius:8px}table{border-collapse:collapse;width:100%;margin-top:16px}
td,th{border-bottom:1px solid #ddd;padding:8px 6px;vertical-align:top;text-align:left}td.f{font-family:ui-monospace,Menlo,monospace;white-space:nowrap;font-size:13px;color:#555}
td.w{font-size:19px}td.fr{color:#666;font-size:13px}tr.g td{background:#fafafa;font-weight:600;color:#333}
@media print{.regles{page-break-after:always}tr{page-break-inside:avoid}}</style>
<h1>Feuille de séance — ${prefixe} — ${lignes.length} phrases</h1>
<div class="regles"><b>Règles, à lire avant d'appuyer sur REC.</b><ul>
<li>Même micro, même pièce, même distance du début à la fin. Si la séance se fait en deux fois, tout pareil la deuxième fois.</li>
<li><b>Une phrase par fichier</b>, nommé exactement comme la colonne « fichier ». 48 kHz, mono, 24 bits, WAV.</li>
<li>On dit <b>le texte de la ligne</b>, tel quel — pas une variante, pas une amélioration. Si une ligne est mal écrite, on la corrige <i>sur la feuille</i> avant de la dire, et on garde la feuille corrigée.</li>
<li>Voix naturelle, comme on parle à quelqu'un en face. Pas de voix « de lecture ». Les nombres se disent comme on les dit à Dakar.</li>
<li>On garde les respirations ; pas de filtre, pas de compression, pas de normalisation. Une demi-seconde de silence avant et après.</li>
<li>Une prise ratée : on la refait, on garde la bonne, on jette l'autre. Jamais deux prises sous le même nom.</li>
<li>Consentement écrit et signé avant la première phrase (modèle dans le dossier du projet).</li>
</ul></div>
<table><tr><th>fichier</th><th>phrase à dire</th><th>sens</th></tr>
${(() => { let g = ""; return lignes.map((l, i) => {
  const tete = l.groupe !== g ? `<tr class="g"><td colspan="3">${(g = l.groupe)}</td></tr>` : "";
  const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return `${tete}<tr><td class="f">${prefixe}-${num(i)}.wav</td><td class="w">${esc(l.wolof)}</td><td class="fr">${esc(l.francais)}</td></tr>`;
}).join("\n"); })()}
</table></html>`;

mkdirSync(sortie, { recursive: true });
writeFileSync(join(sortie, `feuille-${prefixe}.tsv`), tsv);
writeFileSync(join(sortie, `feuille-${prefixe}.html`), html);
const parGroupe = {};
for (const l of lignes) parGroupe[l.groupe] = (parGroupe[l.groupe] || 0) + 1;
console.log(`${lignes.length} phrases → ${sortie}/feuille-${prefixe}.{tsv,html}`);
console.log(Object.entries(parGroupe).map(([g, n]) => `  ${g} : ${n}`).join("\n"));
