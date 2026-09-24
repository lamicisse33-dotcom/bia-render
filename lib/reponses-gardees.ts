/* ── LES RÉPONSES GARDÉES : MÊME QUESTION, MÊME RÉPONSE, MÊME SON GRATUIT ──

   Tranché par Lamine le 24 septembre 2026, « oui, avec garde-fous ». Les voix
   gardées (lib/voix-gardees.ts) ne rendent un son gratuit que si BIA redit
   EXACTEMENT le même texte. Or le cerveau reformule à chaque fois : la même
   question donnait une phrase un peu différente, donc un son neuf, payé.

   Désormais, quand une question revient MOT POUR MOT (après normalisation),
   BIA redonne la réponse de la première fois. Même texte → même son, déjà
   dans le seau : zéro jeton, zéro signe, et une réponse instantanée.

   LES GARDE-FOUS — on ne garde ni ne ressert :
     — une question qui ne se suffit pas à elle-même (« pourquoi ? », « et
       toi ? ») : la réponse d'hier parlait d'autre chose ;
     — une question sur la personne elle-même (je, moi, mon, sama, man…) ;
     — une question qui dépend du moment (heure, date, aujourd'hui, tey,
       suba, léegi…) ou de l'actualité (besoinDInternet) ;
     — une réponse qui porte un geste (carte, image, papier, appel…), une
       recherche sur Internet, ou le prénom de la personne ;
     — une question trop longue pour revenir telle quelle.

   CE QUI FAIT LA CLÉ : la question normalisée, la langue, ET une empreinte
   de la consigne (socle + registre). Quand Lamine change la consigne ou ce
   que BIA sait d'elle, toutes les réponses se renouvellent d'elles-mêmes.
   Le registre sépare aussi le maître (« papa ») des autres personnes.

   UNE CORRECTION PASSE TOUJOURS AVANT : correctionExacte() est regardée
   avant nous dans app/api/chat/route.ts. Une mauvaise réponse gardée se
   répare donc en la corrigeant, comme d'habitude.

   BIA_REPONSES_GARDEES=non éteint tout. */

import { createHash } from "node:crypto";
import { lexiqueConfig } from "./lexique";
import { normaliser } from "./normaliser";
import { besoinDInternet } from "./recherche";
import { SEAU, assurerLeSeau, entetes } from "./voix-gardees";

const PREFIXE = "reponses";
const LECTURE_MS = 700;
const QUESTION_AU_PLUS = 240;

export const reponsesGardeesActives = () =>
  lexiqueConfig.actif && (process.env.BIA_REPONSES_GARDEES || "oui") !== "non";

/* Mots qui disent que la question porte sur la personne, ou sur le moment. */
const SUR_LA_PERSONNE = new Set([
  "je", "j", "moi", "mon", "ma", "mes", "me", "m", "nous", "notre", "nos",
  "man", "maa", "sama", "samay", "may", "nun", "sunu", "ñun", "nu",
]);
const SUR_LE_MOMENT = [
  "heure", "aujourd", "demain", "hier", "maintenant", "ce soir", "ce matin",
  "cette semaine", "ce mois", "cette annee", "date", "quel jour", "meteo",
  "tey", "suba", "demb", "leegi", "legi", "waxtu", "bes bi", "fan la",
];

function sansAccent(t: string) {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
function mots(t: string): string[] {
  return sansAccent(t).split(/[^a-zñŋ]+/).filter(Boolean);
}

/** Cette question peut-elle recevoir une réponse gardée ? */
export function questionReutilisable(question: string, seSuffit: boolean): boolean {
  const q = String(question || "").trim();
  if (!q || q.length > QUESTION_AU_PLUS || !seSuffit) return false;
  /* « explique-moi », « dis-moi » : le moi d'un impératif ne parle pas de la
     personne, il désigne à qui répondre. On l'enlève avant de chercher. */
  const sansImperatif = q.replace(/-(moi|nous)\b/gi, " ");
  if (mots(sansImperatif).some((m) => SUR_LA_PERSONNE.has(m))) return false;
  const plat = ` ${mots(q).join(" ")} `;
  if (SUR_LE_MOMENT.some((m) => plat.includes(` ${m}`))) return false;
  if (besoinDInternet(q, [])) return false;
  return true;
}

/** La réponse porte-t-elle le prénom (ou un nom) que la personne a donné ?
    On cherche les mots à majuscule de la réponse dans ce que la personne a
    dit plus tôt : c'est là qu'elle a dit comment elle s'appelle. */
const NOMS_DE_LA_MAISON = new Set(["bia", "khalam", "kha", "lamine", "dakar", "senegal", "wolof", "papa", "yaay", "baay"]);
export function porteUnNomDeLaPersonne(reponse: string, ditParLaPersonne: string[]): boolean {
  const siens = new Set(ditParLaPersonne.flatMap((t) => mots(t)));
  const capitales = (String(reponse).match(/(?:^|[^A-Za-zÀ-ÿ])([A-ZÀ-Ý][a-zà-ÿñŋ]{2,})/g) || [])
    .map((m) => sansAccent(m.replace(/^[^A-Za-zÀ-ÿ]/, "")));
  return capitales.some((c) => !NOMS_DE_LA_MAISON.has(c) && siens.has(c));
}

function empreinte(question: string, langue: string, consigne: string): string {
  const c = createHash("sha256").update(consigne).digest("hex").slice(0, 16);
  return createHash("sha256").update(`r1|${c}|${langue}|${normaliser(question)}`).digest("hex");
}

/* ── LA LISTE, CHARGÉE UNE FOIS ────────────────────────────────────────── */

let connues: Set<string> | null = null;
const gardeesDepuisLeReveil = new Set<string>();
let chargement: Promise<void> | null = null;
const compte = { servies: 0, gardees: 0, refusees: 0 };

function chargerLaListe(): void {
  if (chargement || !reponsesGardeesActives()) return;
  chargement = (async () => {
    await assurerLeSeau();
    const s = new Set<string>();
    for (let offset = 0; offset < 200_000; offset += 1000) {
      const r = await fetch(`${lexiqueConfig.url}/storage/v1/object/list/${SEAU}`, {
        method: "POST", headers: entetes("application/json"), cache: "no-store",
        body: JSON.stringify({ prefix: PREFIXE, limit: 1000, offset }),
      });
      if (!r.ok) throw new Error(`liste refusée (${r.status})`);
      const lot = await r.json() as Array<{ name: string }>;
      for (const o of lot) if (o.name.endsWith(".json")) s.add(o.name.slice(0, -5));
      if (lot.length < 1000) break;
    }
    for (const e of gardeesDepuisLeReveil) s.add(e);
    connues = s;
  })().catch((e) => {
    console.error("BIA — réponses gardées : liste illisible :", (e as Error).message);
    chargement = null;
  });
}

export type ReponseGardee = { reply: string; emotion: string; question: string; le: string };

/** La réponse déjà donnée à cette question, ou null. Ne fait jamais attendre
    plus de LECTURE_MS, et rien du tout une fois la liste chargée. */
export async function reponseGardee(question: string, langue: string, consigne: string): Promise<ReponseGardee | null> {
  if (!reponsesGardeesActives()) return null;
  chargerLaListe();
  const e = empreinte(question, langue, consigne);
  if (connues && !connues.has(e) && !gardeesDepuisLeReveil.has(e)) return null;
  const minuterie = new AbortController();
  const t = setTimeout(() => minuterie.abort(), LECTURE_MS);
  try {
    const r = await fetch(`${lexiqueConfig.url}/storage/v1/object/${SEAU}/${PREFIXE}/${e}.json`, {
      headers: entetes(), signal: minuterie.signal, cache: "no-store",
    });
    if (!r.ok) return null;
    const g = await r.json() as ReponseGardee;
    if (!g?.reply) return null;
    compte.servies += 1;
    return g;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Garder la première réponse donnée à cette question. À lancer SANS attendre. */
export async function garderLaReponse(question: string, langue: string, consigne: string, reply: string, emotion: string): Promise<void> {
  if (!reponsesGardeesActives() || !reply.trim()) return;
  const e = empreinte(question, langue, consigne);
  if (gardeesDepuisLeReveil.has(e) || connues?.has(e)) return;   // la première reste
  try {
    await assurerLeSeau();
    const r = await fetch(`${lexiqueConfig.url}/storage/v1/object/${SEAU}/${PREFIXE}/${e}.json`, {
      method: "POST",
      headers: { ...entetes("application/json"), "x-upsert": "false" },
      body: JSON.stringify({ question, reply, emotion, langue, le: new Date().toISOString() }),
    });
    /* 400/409 « existe déjà » : une autre instance l'a gardée avant nous. */
    if (!r.ok && r.status !== 409 && r.status !== 400) throw new Error(`dépôt refusé (${r.status})`);
    gardeesDepuisLeReveil.add(e);
    connues?.add(e);
    compte.gardees += 1;
  } catch (err) {
    compte.refusees += 1;
    console.error("BIA — réponses gardées :", (err as Error).message);
  }
}

/** Retirer une réponse gardée : la prochaine fois, le cerveau la refera. */
export async function retirerLaReponse(e: string): Promise<boolean> {
  if (!reponsesGardeesActives() || !/^[0-9a-f]{64}$/.test(e)) return false;
  const r = await fetch(`${lexiqueConfig.url}/storage/v1/object/${SEAU}`, {
    method: "DELETE", headers: entetes("application/json"),
    body: JSON.stringify({ prefixes: [`${PREFIXE}/${e}.json`] }),
  });
  if (r.ok) { connues?.delete(e); gardeesDepuisLeReveil.delete(e); }
  return r.ok;
}

export function resumeReponsesGardees() {
  return {
    actives: reponsesGardeesActives(),
    reponses_dans_le_seau: connues ? connues.size : null,
    servies_depuis_le_reveil: compte.servies,
    gardees_depuis_le_reveil: compte.gardees,
    refus: compte.refusees,
  };
}
