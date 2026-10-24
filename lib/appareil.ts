/* ── À QUI SONT CES RAPPELS — UN JETON, PAS UNE IDENTITÉ ──────────────────

   Lamine : « Les rappels restent privés à la personne, jamais dans la
   mémoire commune ni visibles d'un autre. »

   Le maître a un code, donc un rangement nommé. Les autres n'ont rien — et
   il leur faut quelque chose, sinon tous leurs rappels tomberaient dans le
   même tas et chacun entendrait l'ordonnance du voisin.

   CE JETON N'EST PAS UNE IDENTITÉ. C'est un nombre tiré au hasard, gardé
   dans le navigateur, sans lien avec un nom, un numéro, un code d'accès ni
   quoi que ce soit d'autre. Il ne dit pas QUI c'est : il dit seulement « le
   même téléphone que la dernière fois ». Vidées, les données du site
   l'effacent et les rappels de ce téléphone deviennent inaccessibles — c'est
   le prix de ne rien savoir de la personne, et c'est le bon prix.

   Le serveur ne lit JAMAIS cet identifiant depuis le corps d'une requête :
   il arrive par un en-tête, et aucune route n'accepte de dire « donne-moi
   les rappels de ce jeton-là » pour un autre que l'appelant. */

const CLE = "bia-appareil";

export function jetonAppareil(): string {
  if (typeof localStorage === "undefined") return "";
  try {
    const vu = localStorage.getItem(CLE);
    if (vu && /^[a-z0-9]{10,40}$/.test(vu)) return vu;
    /* crypto.randomUUID quand il existe ; sinon deux tirages concaténés, qui
       suffisent largement — ce jeton ne protège rien, il sépare. */
    const neuf = (typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, "")
      : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
    ).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 32);
    localStorage.setItem(CLE, neuf);
    return neuf;
  } catch { return ""; }
}

/** Les en-têtes à joindre pour que le serveur sache de quel rangement parler.
    Le profil d'abord — c'est la clé de sa mémoire depuis le 10 septembre —
    et le jeton d'appareil seulement pour qui n'a pas de profil. */
export function entetesAppareil(code: string, personne = ""): Record<string, string> {
  const jeton = jetonAppareil();
  const profil = String(personne || "").trim();
  return {
    "x-bia-code": code,
    ...(profil && profil !== "maitre" ? { "x-bia-personne": profil } : {}),
    ...(jeton ? { "x-bia-appareil": jeton } : {}),
  };
}
