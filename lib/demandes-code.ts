import { lexiqueConfig } from "./lexique";
import { normaliserNumero } from "./acces-numero";

/* ── LES DEMANDES DE CODE, RANGÉES POUR QUE LAMINE LES LISE ────────────────

   Lamine, le 28 octobre 2026 : « enregistre la demande (numéro en clair,
   prénom, date) dans une table Supabase PRIVÉE […] Le code n'est JAMAIS
   envoyé automatiquement : c'est moi qui réponds. »

   EN CLAIR, ET C'EST VOULU — l'inverse exact de `lib/acces-lien.ts`, qui ne
   range que des empreintes. Ce n'est pas une contradiction : là-bas, on
   répond « est-ce le même téléphone ? » et le numéro n'est pas nécessaire ;
   ici, Lamine doit POUVOIR RAPPELER ces gens. Un numéro illisible ne servirait
   à rien. Ce qui protège, ce n'est donc pas le chiffrement, c'est la porte :
   la table a RLS activé et AUCUNE règle, donc seule la clé de service l'ouvre
   — ni la page, ni un téléphone, ni la clé publique.

   UNE LIGNE PAR NUMÉRO. Celui qui redemande trois fois ne fabrique pas trois
   lignes : la date de sa dernière demande est mise à jour. Une liste qu'on
   lit à l'œil vaut mieux qu'un journal exhaustif que personne n'ouvre.

   RIEN N'EST ÉCRIT DANS UN JOURNAL. Aucun console.log de ce fichier ni de sa
   route ne porte un numéro — c'est la demande explicite de Lamine, et c'est
   aussi la seule façon de tenir la promesse de la page Confidentialité. */

const TABLE = process.env.SUPABASE_TABLE_DEMANDES || "khalam_demandes_code";

const entetes = () => ({
  apikey: lexiqueConfig.cle,
  Authorization: "Bearer " + lexiqueConfig.cle,
  "content-type": "application/json",
});

export type Demande = { numero: string; prenom?: string };
export type Resultat =
  | { ok: true; etat: "nouvelle" | "deja_connue" }
  | { ok: false; message: string };

export const MESSAGES_DEMANDE = {
  numero_absent: "Saisis ton numéro de téléphone.",
  numero_invalide: "Ce numéro n’est pas valide. Exemple : +221 77 123 45 67.",
  accord: "Coche la case pour que KHALAM puisse t’envoyer ton code.",
  trop: "Tu as déjà envoyé plusieurs demandes. Attends un peu, KHALAM va te répondre.",
  rangement: "La demande n’a pas pu être enregistrée. Réessaie dans un instant.",
} as const;

/* ── LE FREIN ──────────────────────────────────────────────────────────────
   Deux freins, parce qu'ils arrêtent deux choses différentes : celui par
   NUMÉRO arrête l'homme pressé qui clique dix fois ; celui par VISITEUR
   arrête le robot qui envoie cent numéros inventés. Les deux vivent en
   mémoire et repartent à zéro quand Render redémarre — c'est une limite
   réelle, écrite ici. */
const vus = new Map<string, number[]>();
const JOUR_MS = 24 * 60 * 60 * 1000;
const HEURE_MS = 60 * 60 * 1000;

function trop(cle: string, fenetre: number, maximum: number): boolean {
  const maintenant = Date.now();
  const liste = (vus.get(cle) || []).filter((t) => maintenant - t < fenetre);
  vus.set(cle, liste);
  if (vus.size > 5000) for (const [k, v] of vus) if (!v.length) vus.delete(k);
  return liste.length >= maximum;
}
function noter(cle: string) {
  const liste = vus.get(cle) || [];
  liste.push(Date.now());
  vus.set(cle, liste);
}

const compte = { recues: 0, nouvelles: 0, deja_connues: 0, refusees: 0, robots: 0, sans_rangement: 0 };
export function resumeDemandesCode() { return { ...compte }; }

/* ── LA LISTE, POUR LAMINE ET POUR LUI SEUL ────────────────────────────────
   Il lit tout depuis son téléphone, et l'interface de Supabase sur un
   téléphone est une épreuve. La route qui appelle ceci exige le code maître. */
export type Ligne = { numero: string; prenom: string | null; statut: string; demande_le: string; derniere: string };
export async function listerDemandes(limite = 200): Promise<Ligne[]> {
  if (!lexiqueConfig.actif) return [];
  const r = await fetch(lexiqueConfig.url + "/rest/v1/" + TABLE
    + "?select=numero,prenom,statut,demande_le,derniere&order=derniere.desc&limit=" + Math.min(Math.max(1, limite), 500),
    { headers: entetes(), cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw Error("Liste des demandes indisponible.");
  const lignes = await r.json();
  return Array.isArray(lignes) ? lignes : [];
}

/** Marquer une demande « code envoyé », depuis son téléphone. */
export async function changerStatut(numero: string, statut: string): Promise<boolean> {
  const propre = normaliserNumero(numero);
  if (!propre || !["en attente", "code envoyé"].includes(statut)) return false;
  if (!lexiqueConfig.actif) return false;
  const r = await fetch(lexiqueConfig.url + "/rest/v1/" + TABLE + "?numero=eq." + encodeURIComponent(propre),
    { method: "PATCH", headers: { ...entetes(), Prefer: "return=minimal" },
      body: JSON.stringify({ statut }), signal: AbortSignal.timeout(8000) });
  return r.ok;
}

/**
 * Range une demande de code. `visiteur` est une empreinte d'origine qui ne
 * sort jamais d'ici et n'est jamais rangée : elle sert au frein, rien d'autre.
 */
export async function enregistrerDemande(
  demande: Demande & { accord: boolean; piege?: string; visiteur: string },
): Promise<Resultat> {
  compte.recues += 1;

  /* Le champ piège : invisible à l'œil, invisible au lecteur d'écran
     (aria-hidden + tabindex -1). Un humain ne peut pas le remplir, un robot
     qui remplit tout le remplit. On ne dit RIEN à celui qui tombe dedans —
     lui répondre « tu es un robot » lui apprendrait à l'éviter. */
  if (demande.piege && demande.piege.trim()) { compte.robots += 1; return { ok: true, etat: "deja_connue" }; }

  if (!demande.numero || !String(demande.numero).trim()) { compte.refusees += 1; return { ok: false, message: MESSAGES_DEMANDE.numero_absent }; }
  const numero = normaliserNumero(demande.numero);
  if (!numero) { compte.refusees += 1; return { ok: false, message: MESSAGES_DEMANDE.numero_invalide }; }
  if (!demande.accord) { compte.refusees += 1; return { ok: false, message: MESSAGES_DEMANDE.accord }; }

  if (trop("v:" + demande.visiteur, HEURE_MS, 5) || trop("n:" + numero, JOUR_MS, 3)) {
    compte.refusees += 1;
    return { ok: false, message: MESSAGES_DEMANDE.trop };
  }
  noter("v:" + demande.visiteur); noter("n:" + numero);

  const prenom = String(demande.prenom || "").trim().slice(0, 40) || null;
  if (!lexiqueConfig.actif) { compte.sans_rangement += 1; return { ok: false, message: MESSAGES_DEMANDE.rangement }; }

  const base = lexiqueConfig.url + "/rest/v1/" + TABLE;
  try {
    const r = await fetch(base, {
      method: "POST",
      headers: { ...entetes(), Prefer: "return=minimal" },
      body: JSON.stringify({ numero, prenom, statut: "en attente" }),
      signal: AbortSignal.timeout(8000),
    });
    if (r.ok) { compte.nouvelles += 1; return { ok: true, etat: "nouvelle" }; }
    /* 409 : ce numéro a déjà demandé. On ne fabrique pas une deuxième ligne,
       on remonte la date — et le prénom s'il en donne un cette fois-ci. */
    if (r.status === 409) {
      const corps: Record<string, unknown> = { derniere: new Date().toISOString() };
      if (prenom) corps.prenom = prenom;
      const maj = await fetch(base + "?numero=eq." + encodeURIComponent(numero), {
        method: "PATCH", headers: { ...entetes(), Prefer: "return=minimal" },
        body: JSON.stringify(corps), signal: AbortSignal.timeout(8000),
      });
      if (!maj.ok) throw Error("mise à jour refusée");
      compte.deja_connues += 1;
      return { ok: true, etat: "deja_connue" };
    }
    throw Error("insertion refusée");
  } catch {
    /* Le motif exact n'est pas renvoyé au téléphone : il dirait le nom de la
       table et l'état du serveur à quiconque sonde la route. */
    compte.sans_rangement += 1;
    return { ok: false, message: MESSAGES_DEMANDE.rangement };
  }
}

/* Le numéro WhatsApp de KHALAM, donné par Lamine le 28 octobre 2026.

   IL EST ÉCRIT ICI PARCE QU'IL L'A DEMANDÉ, et parce qu'il sera de toute
   façon public : c'est le numéro de contact affiché sur khalam.app. À savoir
   quand même — bia-render est un dépôt PUBLIC, donc ce numéro y est
   cherchable. `KHALAM_WHATSAPP` sur Render le remplace sans toucher au code,
   et c'est la bonne place s'il préfère le retirer d'ici un jour. */
const KHALAM_PAR_DEFAUT = "221773728383";

/**
 * Le lien WhatsApp vers KHALAM. Le code n'est jamais envoyé par ce lien :
 * il ouvre une conversation chez Lamine, qui répond lui-même.
 */
export function lienWhatsApp(numeroDuDemandeur: string): string | null {
  const brut = (process.env.KHALAM_WHATSAPP || KHALAM_PAR_DEFAUT).replace(/\D/g, "");
  if (brut.length < 8 || brut.length > 15) return null;
  const texte = "Bonjour KHALAM, je voudrais un code pour BIA. Mon numéro : " + numeroDuDemandeur;
  return "https://wa.me/" + brut + "?text=" + encodeURIComponent(texte);
}
