/* ── UN NOMBRE ÉCRIT À LA MAIN DANS RENDER ──────────────────────────────────

   Le 12 septembre 2026 au soir, Lamine écrit : « SOYNADE_CFG_WEIGHT 0,22 est
   bien présent sur Render. »

   J'ai lu une VIRGULE et j'ai conclu que c'était la cause. Il m'a arrêté —
   « non attends, ça c'est un texte que j'ai écrit seulement » — et sa capture
   montre un POINT : « 0.22 ». Ma déduction était fausse : c'est bien 0,22 qui
   partait chez Soynade, et le réglage est bien celui qu'il faut corriger, dans
   Render.

   MAIS LE PIÈGE, LUI, EST RÉEL, et il valait d'être fermé le jour où je suis
   tombé dessus. Voilà ce que le code aurait fait d'une virgule :

       Number("0,22")                         →  NaN
       Number(env.SOYNADE_CFG_WEIGHT || 0.22) →  NaN   (la valeur est « vraie »,
                                                        le défaut ne sert pas)
       JSON.stringify({ cfg_weight: NaN })    →  {"cfg_weight":null}

   Une virgule n'aurait donc pas envoyé 0,22 : elle aurait envoyé `null`. Un
   modèle sans guidage du tout, dans une voix clonée, dit ce qu'il veut avec
   l'intonation de Kha — le même symptôme, en pire, et sans qu'on puisse le
   voir nulle part.

   ── POURQUOI ÇA NE SE VERRAIT PAS ─────────────────────────────────────────

   Rien ne criait. `Number()` ne lève pas d'erreur, `JSON.stringify` change NaN
   en null sans rien dire, et l'API a accepté la requête. Un réglage écrit
   comme on écrit un nombre en français devenait une panne muette.

   ── CE QUE FAIT CE FICHIER ────────────────────────────────────────────────

   Toute valeur numérique qui vient de l'environnement passe par ici :

     — la virgule décimale est acceptée, parce que c'est ainsi qu'on écrit un
       nombre en français et que personne ne devrait avoir à le savoir ;
     — les espaces, y compris l'espace insécable des milliers, sont retirés ;
     — et ce qui n'est PAS un nombre retombe sur le défaut, EN LE DISANT dans
       les journaux. Jamais NaN, jamais null : un réglage illisible doit se
       voir, pas se propager.

   Ça vaut pour les quatre réglages de la voix, mais aussi pour le plafond de
   questions par code et pour les plafonds de recherche d'images : un NaN
   là-dedans compare faux à tous les coups, et un plafond qui compare faux
   n'est plus un plafond.                                                   */

export function nombreDeLEnvironnement(brut: string | undefined, defaut: number, nom = ""): number {
  if (brut === undefined || brut === null) return defaut;
  const propre = String(brut)
    .trim()
    /* L'espace insécable et l'espace fin des milliers : « 1 000 ». */
    .replace(/[\s  ']/g, "")
    /* La virgule décimale française. On ne touche pas au point : « 0.22 »
       marche déjà, et il faut que les deux écritures marchent. */
    .replace(",", ".");
  if (!propre) return defaut;
  const valeur = Number(propre);
  if (!Number.isFinite(valeur)) {
    /* Visible dans les journaux de Render, avec le nom de la variable et sa
       valeur : c'est tout ce qu'il faut pour la corriger en dix secondes. */
    console.error(
      `BIA — réglage illisible${nom ? ` (${nom})` : ""} : « ${brut} » n'est pas un nombre. On garde ${defaut}.`,
    );
    return defaut;
  }
  return valeur;
}
