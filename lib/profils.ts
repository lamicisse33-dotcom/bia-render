/* ── QUI PARLE À BIA ────────────────────────────────────────────────────────

   Demandé par Lamine le 10 septembre 2026 : « BIA doit savoir reconnaître les
   personnes… j'ai l'impression qu'elle confond parfois ».

   Elle confondait, et voici pourquoi. Le prénom et les notes étaient gardés
   SUR L'APPAREIL, pas sur une personne. Or ici un téléphone se prête : au
   frère, au client, au voisin. Le deuxième arrivant héritait donc du prénom
   du premier, et des notes prises sur lui. Ce n'était pas une erreur de
   mémoire, c'était une erreur de rangement.

   Chaque personne a maintenant sa case sur l'appareil : son prénom, ses
   notes, ses renseignements d'artisan, sa conversation. On passe de l'une à
   l'autre en touchant son prénom, sans mot de passe — un téléphone de famille
   n'a pas besoin d'une serrure entre le frère et la sœur, il a besoin qu'on
   sache à qui l'on parle.

   Le compte avec numéro et code à quatre chiffres viendra par-dessus : il
   servira à retrouver ses papiers depuis un AUTRE téléphone. C'est un autre
   problème, et il se règle sur le serveur. Celui-ci se règle ici. */

export type Profil = { id: string; nom: string };

const CLE_LISTE = "bia-profils";
const CLE_ACTIF = "bia-profil";

/** Les clés d'une personne. Sans identifiant, ce sont les anciennes clés. */
export const cleFil = (id: string) => (id ? `bia-fil-${id}` : "bia-fil");
export const cleResume = (id: string) => (id ? `bia-resume-${id}` : "bia-resume");
export const cleEmetteur = (id: string) => (id ? `bia-emetteur-${id}` : "bia-emetteur");

const nouvelId = () => `p${Date.now().toString(36)}${Math.floor(Math.random() * 46656).toString(36)}`;

function lire<T>(cle: string, defaut: T): T {
  try {
    const brut = localStorage.getItem(cle);
    return brut ? (JSON.parse(brut) as T) : defaut;
  } catch { return defaut; }
}

function ecrire(cle: string, valeur: unknown) {
  try { localStorage.setItem(cle, JSON.stringify(valeur)); } catch {}
}

/* LA REPRISE DE L'EXISTANT. Sur un téléphone qui servait déjà, tout ce qui
   était rangé sous les anciennes clés appartient à quelqu'un — au premier
   utilisateur. On le lui laisse : ses notes, sa conversation et ses
   renseignements deviennent sa case, sous son prénom si BIA le connaissait.
   Perdre les notes de quelqu'un pour ranger le tiroir serait absurde. */
export function chargerProfils(): { profils: Profil[]; actif: string } {
  const profils = lire<Profil[]>(CLE_LISTE, []);
  if (profils.length) {
    const actif = (() => { try { return localStorage.getItem(CLE_ACTIF) || ""; } catch { return ""; } })();
    const bon = profils.some((p) => p.id === actif) ? actif : profils[0].id;
    return { profils, actif: bon };
  }

  const id = nouvelId();
  let nom = "";
  try { nom = localStorage.getItem("bia-nom") || ""; } catch {}
  const premier: Profil[] = [{ id, nom }];

  try {
    const fil = localStorage.getItem("bia-fil");
    if (fil) localStorage.setItem(cleFil(id), fil);
    const notes = localStorage.getItem("bia-resume");
    if (notes) localStorage.setItem(cleResume(id), notes);
    const sien = localStorage.getItem("bia-emetteur");
    if (sien) localStorage.setItem(cleEmetteur(id), sien);
  } catch {}

  ecrire(CLE_LISTE, premier);
  try { localStorage.setItem(CLE_ACTIF, id); } catch {}
  return { profils: premier, actif: id };
}

export function garderProfils(profils: Profil[], actif: string) {
  ecrire(CLE_LISTE, profils);
  try { localStorage.setItem(CLE_ACTIF, actif); } catch {}
}

export function ajouterProfil(profils: Profil[], nom = ""): { profils: Profil[]; id: string } {
  const id = nouvelId();
  return { profils: [...profils, { id, nom: nom.trim() }], id };
}

/* Effacer quelqu'un, c'est effacer TOUT ce qui le concerne. Laisser traîner
   ses notes ou sa conversation après qu'on l'a retiré serait le contraire de
   ce qu'on lui promet. */
export function oublierProfil(profils: Profil[], id: string): Profil[] {
  try {
    localStorage.removeItem(cleFil(id));
    localStorage.removeItem(cleResume(id));
    localStorage.removeItem(cleEmetteur(id));
  } catch {}
  return profils.filter((p) => p.id !== id);
}
