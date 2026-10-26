import {lireObjetMemoire} from "./audio-memoire-stockage";

/* ── LE MODÈLE DE KHALAM GRATUIT EST-IL VRAIMENT DANS LE SEAU ? ────────────

   Le téléphone ne peut pas parler gratuitement sans ce fichier de 63,5 Mo,
   et la route qui le sert exige le code de BIA — personne ne pouvait donc
   savoir, de l'extérieur, si l'envoi avait abouti. Le branchement entier
   pouvait avoir l'air fini et ne jamais produire un son.

   Ce relevé répond sur le mur ouvert de /api/etat : présent ou non, sa
   révision, sa taille, son nombre de morceaux. Il ne livre rien du modèle
   et ne coûte rien aux appels ordinaires — il ne se fait que sur
   /api/etat?verifier_khalam_gratuit=1.

   Ce qu'il NE dit pas : si un téléphone a réussi à le charger, et si sa
   voix wolof est bonne. Cela s'écoute, et se compte dans `piper_web`.   */

const PREFIXE = "modeles/khalam-gratuit/";

type Releve = {
  present: boolean | null;
  revision?: string;
  octets?: number;
  morceaux?: number;
  sha256_court?: string;
  refus?: string;
};

let releve: Releve | null = null;
let quand = "";

export async function verifierModeleGratuit() {
  try {
    const pointeur = await lireObjetMemoire(PREFIXE + "current.json");
    if (!pointeur) { releve = { present: false, refus: "aucun modèle n'a été envoyé" }; return; }
    const courant = await pointeur.json() as { sha256?: string; revision?: string };
    if (!courant.sha256 || !/^[a-f0-9]{64}$/.test(courant.sha256)) {
      releve = { present: false, refus: "le pointeur du modèle est illisible" }; return;
    }
    const stocke = await lireObjetMemoire(PREFIXE + courant.sha256 + "/manifest.json");
    if (!stocke) { releve = { present: false, refus: "le manifeste du modèle est absent" }; return; }
    const m = await stocke.json() as { bytes?: number; parts?: unknown[]; revision?: string };
    releve = {
      present: true,
      revision: String(m.revision ?? courant.revision ?? ""),
      octets: Number(m.bytes) || 0,
      morceaux: Array.isArray(m.parts) ? m.parts.length : 0,
      sha256_court: courant.sha256.slice(0, 12),
    };
  } catch (e) {
    releve = { present: false, refus: e instanceof Error ? e.message : "lecture du seau impossible" };
  } finally { quand = new Date().toISOString(); }
}

export const resumeModeleGratuit = () => ({
  moteur: "Khalam Gratuit",
  execution: "navigateur du téléphone",
  modele: releve ?? { present: null, refus: "jamais vérifié — appelle /api/etat?verifier_khalam_gratuit=1" },
  verifie_le: quand || null,
  limite: "Dit si le seau privé contient le modèle, sa taille et sa révision. Ne dit pas si un téléphone a réussi à le charger, ni ce que vaut sa voix.",
});
