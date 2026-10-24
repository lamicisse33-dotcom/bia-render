/* ── LES TABLES PRIVÉES SONT-ELLES VRAIMENT FERMÉES ? ─────────────────────

   Lamine, le 24 octobre 2026 : « Teste avec la clé PUBLIQUE de Supabase si
   les tables khalam_rappels, khalam_souvenirs et khalam_corpus sont
   lisibles. Elles doivent être fermées au public. Dis-moi le résultat. Ne
   corrige rien sans me le dire. »

   CE FICHIER NE CORRIGE RIEN. Il mesure, et il ne sait rien faire d'autre :
   aucune écriture, aucune suppression, aucun changement de règle.

   ── LE PIÈGE DE CETTE MESURE, ET IL EST SÉRIEUX ───────────────────────────

   Avec la sécurité par ligne activée et AUCUNE règle posée, PostgREST ne
   répond PAS 401 à la clé publique. Il répond **200 et une liste vide** : la
   lecture est autorisée, et la sécurité filtre tout. Conclure « fermée »
   parce qu'on a reçu 200 serait donc faux, et conclure « ouverte » parce
   qu'on a reçu 200 le serait tout autant.

   ET UNE LISTE VIDE NE PROUVE RIEN TOUTE SEULE : une table réellement vide
   rend zéro ligne à tout le monde, y compris à la clé de service. Un zéro
   qui vient du vide et un zéro qui vient de la sécurité donnent le même
   chiffre — exactement la faute que AVANT-DE-DIRE-QUE-C-EST-BON.md nomme.

   DONC ON COMPTE DES DEUX CÔTÉS :

     clé publique voit 0, clé de service voit N > 0  → FERMÉE, et c'est prouvé
     clé publique voit N > 0                         → OUVERTE, à corriger
     les deux voient 0                               → INDÉTERMINÉ, la table
                                                        est vide ; rien n'est
                                                        prouvé, et on le dit

   ── CE QUI NE PASSE PAS PAR ICI ───────────────────────────────────────────

   Aucune ligne n'est transportée : `limit=0` avec `Prefer: count=exact`, et
   on lit le NOMBRE dans l'en-tête Content-Range. Pas une phrase wolof, pas
   un souvenir, pas un rappel. Des codes et des comptes. */

import { lexiqueConfig } from "./lexique";

/* ── CE QUE LA CLÉ PUBLIQUE A DONNÉ LE 24 OCTOBRE 2026, EN LECTURE ────────

   Mesuré depuis le Mac, avec la clé publiable fournie par Lamine :

     khalam_rappels     200, zéro ligne   (service : 0     → indéterminé, vide)
     khalam_souvenirs   200, zéro ligne   (service : 13048 → FERMÉE, prouvé)
     khalam_corpus      200, zéro ligne   (service : 11    → FERMÉE, prouvé)
     bia_lexique        200, zéro ligne   (service : 829   → FERMÉE, prouvé)
     reglages           200, zéro ligne   (service : non mesuré ce jour-là)

   (« zéro ligne » = l'en-tête Content-Range annonce un total de zéro. Et non,
   je ne l'écris pas en abrégé : cette abréviation contient la barre-étoile
   qui FERME un bloc de commentaire, et je viens de me faire prendre pour la
   deuxième fois dans ce même fichier.)

   Les trois tables qui portent du contenu sont donc bien fermées EN LECTURE,
   et c'est prouvé par la comparaison, pas par un 200.

   DEUX SONDES QUI NE PROUVENT RIEN, ET JE M'Y SUIS FAIT PRENDRE DEUX FOIS :
     — une écriture sur une colonne inexistante rend PGRST204, parce que
       PostgREST lit son cache de schéma AVANT la base : on reçoit cette
       erreur même sans le moindre privilège ;
     — l'en-tête `Allow` d'une requête OPTIONS vient du même cache, pas des
       droits du rôle : il annonce POST sur tout.
   L'ÉCRITURE RESTE DONC NON TRANCHÉE depuis ici. La réponse ne s'obtient pas
   par tâtonnement mais par une question directe à la base — voir
   docs/PORTES-SUPABASE.md. */

export type Porte = {
  table: string;
  publique: { statut: number; lignes: number | null };
  service: { statut: number; lignes: number | null };
  verdict: "fermee" | "ouverte" | "indetermine" | "non_mesurable";
  pourquoi: string;
};

/* ── CE QUE LE TEST DU 24 OCTOBRE A APPRIS SUR LES NOMS ───────────────────
   `khalam_lexique` N'EXISTE PAS : PostgREST a répondu 404 avec, en toutes
   lettres, « Perhaps you meant the table public.bia_lexique ». C'est
   SUPABASE_TABLE_LEXIQUE qui porte le vrai nom sur Render, et le repli écrit
   ici était donc faux depuis le début — invisible, parce que la variable est
   toujours posée en production.

   Et `reglages` est ajoutée : elle porte la tenue de BIA, réglable par le
   maître sans redéploiement (lib/tenue.ts). Elle n'a aucun fichier SQL dans
   ce dépôt, donc personne n'a jamais écrit `enable row level security`
   dessus — c'est exactement le genre de table qu'on oublie. */
const TABLES = () => [
  process.env.SUPABASE_TABLE_RAPPELS || "khalam_rappels",
  process.env.SUPABASE_TABLE_SOUVENIRS || "khalam_souvenirs",
  process.env.SUPABASE_TABLE_CORPUS || "khalam_corpus",
  process.env.SUPABASE_TABLE_LEXIQUE || "bia_lexique",
  "reglages",
];

/** Le nombre total de lignes qu'une clé donnée peut voir. Aucune ligne lue. */
async function compter(url: string, table: string, cle: string) {
  try {
    const r = await fetch(`${url}/rest/v1/${encodeURIComponent(table)}?select=*&limit=0`, {
      headers: { apikey: cle, Authorization: `Bearer ${cle}`, Prefer: "count=exact" },
      signal: AbortSignal.timeout(6000), cache: "no-store",
    });
    /* « Content-Range: 0-0/412 » — le nombre après la barre. Une table vide
       rend une étoile puis zéro ; une étoile seule quand le compte n'est pas
       rendu du tout. (Et non, je n'écris pas la barre-étoile littérale dans
       ce commentaire : elle le fermerait, et tsc me l'a dit tout de suite.) */
    const plage = r.headers.get("content-range") || "";
    const apres = plage.split("/")[1];
    const lignes = apres && /^\d+$/.test(apres) ? Number(apres) : null;
    return { statut: r.status, lignes };
  } catch {
    return { statut: 0, lignes: null };
  }
}

function juger(p: Omit<Porte, "verdict" | "pourquoi">): Porte {
  const { publique: pub, service: srv } = p;
  if (srv.statut === 0 || pub.statut === 0)
    return { ...p, verdict: "non_mesurable", pourquoi: "Supabase n'a pas répondu à l'une des deux clés." };
  /* 401, 403 ou 404 à la clé publique : elle n'entre pas du tout. C'est plus
     fermé encore que la sécurité par ligne. */
  if (pub.statut === 401 || pub.statut === 403 || pub.statut === 404)
    return { ...p, verdict: "fermee", pourquoi: `La clé publique est refusée (${pub.statut}) : elle n'atteint même pas la table.` };
  if (pub.statut === 200 && (pub.lignes ?? 0) > 0)
    return { ...p, verdict: "ouverte", pourquoi: `La clé publique voit ${pub.lignes} ligne(s). Cette table est lisible publiquement.` };
  if (pub.statut === 200 && (srv.lignes ?? 0) > 0)
    return { ...p, verdict: "fermee", pourquoi: `La clé de service voit ${srv.lignes} ligne(s) et la clé publique zéro : la sécurité par ligne filtre bien.` };
  if (pub.statut === 200)
    return { ...p, verdict: "indetermine", pourquoi: "Les deux clés voient zéro ligne : la table est vide, donc rien n'est prouvé." };
  return { ...p, verdict: "non_mesurable", pourquoi: `Réponse inattendue à la clé publique (${pub.statut}).` };
}

export async function mesurerLesPortes(): Promise<{
  mesurable: boolean;
  pourquoi_pas?: string;
  portes: Porte[];
  ouvertes: string[];
}> {
  const url = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const publique = process.env.SUPABASE_ANON_KEY || "";
  const service = lexiqueConfig.cle;
  if (!url || !service)
    return {
      mesurable: false, portes: [], ouvertes: [],
      pourquoi_pas: !url ? "SUPABASE_URL absent"
        : "clé de service absente : impossible de distinguer une table fermée d'une table vide",
    };

  /* ── SANS LA CLÉ PUBLIQUE, ON NE REND PAS UNE PAGE VIDE ──────────────────

     SUPABASE_ANON_KEY n'est pas posée sur Render — mesuré le 24 octobre
     2026 : BIA n'utilise que la clé de service, et c'est plutôt une bonne
     nouvelle (aucune clé publique ne circule dans l'application). Mais ça
     rend la moitié du test impossible, et une réponse vide ne dirait pas
     laquelle.

     On rend donc quand même ce que la clé de service voit : ça prouve que
     les tables existent et portent des lignes, et ça prépare le verdict dès
     que la clé publique sera disponible. Un « non mesurable » qui ne montre
     rien laisse croire qu'on n'a rien cherché. */
  if (!publique) {
    const partiel = await Promise.all(TABLES().map(async (table) => {
      const srv = await compter(url, table, service);
      return {
        table, publique: { statut: -1, lignes: null }, service: srv,
        verdict: "non_mesurable" as const,
        pourquoi: `La clé de service voit ${srv.lignes ?? "?"} ligne(s). La moitié publique du test n'a pas pu être faite.`,
      };
    }));
    return {
      mesurable: false, portes: partiel, ouvertes: [],
      pourquoi_pas:
        "SUPABASE_ANON_KEY n'est pas posée sur Render : impossible de tester avec la clé publique. " +
        "BIA n'en a pas besoin pour fonctionner — elle n'utilise que la clé de service — donc rien n'est cassé. " +
        "Pour trancher la question, il faut poser SUPABASE_ANON_KEY (la clé « anon public » du tableau de bord Supabase, " +
        "faite pour être publique) et relire ce champ. Je ne la pose pas moi-même.",
    };
  }

  const portes = await Promise.all(TABLES().map(async (table) =>
    juger({ table, publique: await compter(url, table, publique), service: await compter(url, table, service) })));
  return { mesurable: true, portes, ouvertes: portes.filter((p) => p.verdict === "ouverte").map((p) => p.table) };
}
