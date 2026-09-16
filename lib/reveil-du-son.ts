/* ── RENDRE LE HAUT-PARLEUR AVANT DE JOUER QUOI QUE CE SOIT ─────────────────

   Lamine, le 18 septembre 2026 : « quand elle rit pour la première fois le
   son arrive, mais si elle continue le son ne suit pas — le deuxième rire, y
   a pas de son. »

   Ce n'était pas le rire. C'était le haut-parleur.

   ── CE QUI SE PASSE DANS LE TÉLÉPHONE ──────────────────────────────────────

   Entre les deux rires, le micro s'est ouvert et refermé. Sur iPhone, un
   enregistrement met la session audio en mode « enregistrement » et laisse le
   contexte de lecture SUSPENDU — ou, sur Safari, dans un état « interrupted »
   que la norme ne connaît même pas et que TypeScript ignore.

   Un son démarré là-dedans NE SORT PAS. Et il ne se plaint pas : `onended`
   n'arrive jamais, le filet de secours rend la main au bout de la durée du
   fichier, et tout continue comme si elle avait ri. Le visage rit, la gorge
   est muette.

   ── L'ERREUR ÉTAIT D'UNE SEULE LIGNE ───────────────────────────────────────

   On réveillait bien le contexte, mais SANS ATTENDRE : `void ctx.resume()`.
   La promesse était jetée et le son démarrait dans la foulée.

   Le premier rire s'en sortait parce que son fichier venait du réseau, et ces
   deux cents millisecondes suffisaient au réveil. Le second partait du cache,
   tout de suite — et arrivait avant que le haut-parleur soit rendu.

   UN SON QUI VIENT DE LA MÉMOIRE EST DONC PLUS FRAGILE QU'UN SON QUI VIENT DU
   RÉSEAU. C'est le contraire de ce qu'on croit en accélérant les choses, et ça
   vaut pour tout ce qu'on mettra en cache ensuite : les sons du répertoire, et
   les fichiers qu'on embarquera dans l'application native.

   ── POURQUOI TROIS ESSAIS ET PAS UN ────────────────────────────────────────

   Le premier suffit presque toujours. Les deux autres sont pour l'iPhone qui
   rend le haut-parleur avec un temps de retard : `resume()` rend la main sans
   que la session soit revenue. Au pire on a perdu 120 ms ; au mieux, elle rit
   pour de vrai.

   ET ON N'ÉCHOUE JAMAIS ICI. Si le haut-parleur ne revient pas, on joue quand
   même : un silence vaut mieux qu'une réponse bloquée.

   Ce fichier ne dépend de rien — aucune ligne d'entrée en tête, comme
   lib/normaliser.ts. Il part dans le code du téléphone, et rien du serveur ne
   doit pouvoir le suivre jusque-là.                                         */

/** Le peu qu'on demande à un contexte audio pour pouvoir le réveiller. */
export type ContexteReveillable = {
  readonly state: string;
  resume: () => Promise<void>;
};

/** Combien de fois on rallume avant de renoncer. */
export const ESSAIS_DE_REVEIL = 3;

/** Le temps laissé au téléphone entre deux essais, en millisecondes. */
export const REPIT_ENTRE_DEUX_ESSAIS = 60;

/**
 * Attend que le haut-parleur soit rendu. Rend `true` s'il l'est, `false` si
 * on renonce — dans les deux cas l'appelant joue son son : on ne refuse
 * jamais de parler à cause de ça.
 */
export async function reveiller(
  ctx: ContexteReveillable,
  dormir: (ms: number) => Promise<void> = (ms) => new Promise((s) => setTimeout(s, ms)),
): Promise<boolean> {
  /* On RELIT l'état à chaque fois : il change sous nos pieds, c'est tout
     l'objet de cette fonction. Et on compare à « running » plutôt qu'à
     « suspended », parce que « interrupted » existe sur Safari sans être
     écrit nulle part. Tout ce qui n'est pas éveillé se traite pareil. */
  const eveille = () => String(ctx.state) === "running";
  for (let essai = 0; essai < ESSAIS_DE_REVEIL; essai++) {
    if (eveille()) return true;
    try { await ctx.resume(); } catch { /* un contexte fermé : tant pis */ }
    if (eveille()) return true;
    await dormir(REPIT_ENTRE_DEUX_ESSAIS);
  }
  return eveille();
}
