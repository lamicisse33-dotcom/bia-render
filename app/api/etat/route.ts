import { NextResponse } from "next/server";
import { voixConfig } from "@/lib/voix";
import { ecouteConfig, resumeEcoutes } from "@/lib/ecoute";
import { lexiqueConfig, combien, combienParApplication, parAuteur } from "@/lib/lexique";
import { dernierePanne, pannes } from "@/lib/panne";
import { resumeAttentes, resumeLectures, resumeTours } from "@/lib/attentes-vues";
import { resumeEtapes, dernierEssaiVoix } from "@/lib/etapes";
import { resumeEmotions } from "@/lib/emotions-vues";
import { depense } from "@/lib/depense";
import { comptesDuJour, imagesActives, videosActives } from "@/lib/trouver";
import { etatRepertoire } from "@/lib/repertoire";

/* Dit à l'interface quels moteurs sont réellement branchés, pour qu'elle
   choisisse le micro et la voix sans deviner. Ouvert : aucun moteur payant
   n'est appelé ici.

   `derniere_panne` est la ligne qui manquait : quand BIA cesse de réfléchir,
   c'est ici qu'on lit pourquoi — le statut renvoyé par le modèle et le début
   de son message. Elle se vide dès que le modèle répond de nouveau. Aucune
   clé n'y apparaît. */
/* Calculée une fois au chargement du module : elle ne change qu'au
   redéploiement, et c'est précisément ce qu'on veut détecter. */
const VERSION = (process.env.RENDER_GIT_COMMIT || "").slice(0, 12)
  || `local-${Math.floor(Date.now() / 1000)}`;

export async function GET() {
  let entrees: number | null = null;
  try { entrees = await combien(); } catch { entrees = null; }

  // D'où viennent ces corrections. La table est commune aux trois
  // applications : sans ce détail, on ne sait pas si BIA en reçoit.
  let origines: Record<string, number> | null = null;
  try { origines = await combienParApplication(); } catch { origines = null; }

  /* QUI a posé ces lignes. Le total ne dit pas si ses leçons à lui sont
     arrivées — « maitre-vocal » le dit. Voir parAuteur() dans lib/lexique.ts. */
  let auteurs: Record<string, number> | null = null;
  try { auteurs = await parAuteur(); } catch { auteurs = null; }

  return NextResponse.json({
    /* ── LA VERSION EN LIGNE, POUR QUE LE TÉLÉPHONE SE METTE À JOUR SEUL ────

       Lamine, le 14 septembre 2026 : « il faut forcer les mises à jour ; dès
       qu'il y a une nouvelle mise à jour, ça doit être automatique chez
       elle. »

       Le service worker ne garde PAS l'application — donc une réouverture
       suffit normalement. Mais BIA s'installe sur l'écran d'accueil et reste
       ouverte des heures : le téléphone garde alors le code chargé le matin,
       et il ne verra jamais ce qu'on a déployé à midi. C'est exactement ce
       qui lui est arrivé : il a essayé des instructions qui n'étaient pas
       encore chez lui.

       On rend donc la version d'ICI, et le téléphone la compare à celle avec
       laquelle il a démarré. Voir app/page.tsx, « la mise à jour d'elle-même ».

       RENDER_GIT_COMMIT est posé par Render à chaque déploiement. En local il
       n'existe pas : on prend l'heure de démarrage du serveur, qui change à
       chaque redémarrage — même effet, sans rien à configurer. */
    version: VERSION,
    voix: voixConfig.fournisseur,
    ecoute: ecouteConfig.fournisseur,
    modele: process.env.BIA_LLM_MODEL || "claude-sonnet-5",
    cle_modele: Boolean(process.env.BIA_LLM_API_KEY || process.env.ANTHROPIC_API_KEY),
    /* ── LA CLÉ DES LIEUX ─────────────────────────────────────────────────

       Lamine, le 14 septembre 2026 : « le testeur demandera l'endroit de son
       choix, que nous ne pouvons pas deviner. » Sans cette clé, BIA ne trouve
       que les trois repères écrits à la main et répond « je n'arrive pas à
       chercher » pour tout le reste de Dakar.

       On a passé une demi-journée à se demander si elle était là. Elle se lit
       maintenant d'un coup d'œil, comme celle du modèle. Le contenu de la clé
       ne sort JAMAIS d'ici — seulement oui ou non. */
    cle_lieux: Boolean(String(process.env.GOOGLE_CLE || "").trim()),
    lexique: lexiqueConfig.actif ? "supabase" : "mémoire vive (perdu au réveil)",
    lexique_entrees: entrees,
    lexique_origines: origines,
    /* QUI a posé ces lignes. Voir parAuteur() dans lib/lexique.ts : le total
       ne dit pas si SES leçons sont arrivées ; « maitre-vocal » le dit.
       null veut dire « je n'ai pas pu compter », pas « personne n'a rien
       posé » — la confusion entre les deux est ce qu'on répare ici. */
    lexique_auteurs: auteurs,
    voix_clonee: Boolean(voixConfig.soynade.audioPrompt),
    derniere_panne: dernierePanne(),
    // L'histoire, elle, ne s'efface pas : une panne passée reste lisible même
    // si tout va bien depuis. C'est la seule façon de comprendre après coup.
    pannes: pannes(),
    attentes: resumeAttentes(),
    lecture: resumeLectures(),
    /* LE TOUR COMPLET, des deux bouts qu'il ressent. Sa demande du
       15 septembre 2026 : « mesurer précisément où est-ce qu'on perd du
       temps ». `ou_passe_le_temps` est la réponse, triée du plus gros au
       plus petit. Voir lib/tour.ts. */
    tours: resumeTours(),
    /* LES TROIS INSTANTS DE CHAQUE APPEL EXTÉRIEUR : départ, premier octet
       utile, fin. Sa demande du 15 septembre 2026 — savoir si les quatre
       secondes du modèle et de la voix sont une ATTENTE ou une COULÉE.
       `verdict` le dit en une phrase. Voir lib/etapes.ts. */
    etapes: resumeEtapes(),
    /* L'ESSAI DE SOYNADE aux cinq longueurs — le test qui décide si on
       découpe par phrase ou si on change de moteur. Lancé depuis /vitesse,
       gardé ici jusqu'au suivant. Voir app/api/essai-voix/route.ts. */
    essai_voix: dernierEssaiVoix(),
    /* Ce que le moteur d'écoute a cru entendre, et combien de fois il a
       fallu le reprendre. Voir lib/ecoute.ts. */
    ecoutes: resumeEcoutes(),
    emotions: resumeEmotions(),
    /* CE QUE ÇA COÛTE, COMPTÉ ET NON DEVINÉ. Les signes réellement envoyés à
       Soynade, par route, et les jetons que le modèle dit avoir consommés —
       avec la part revenue du cache. Remis à zéro à chaque redémarrage du
       serveur : c'est une mesure de journée, pas une comptabilité. */
    depense: depense(),
    /* LE RÉPERTOIRE : combien de phrases sont payées une fois pour toutes, et
       si les textes ont été relus par Lamine. Tant que ce n'est pas le cas,
       rien ne s'enregistre et rien ne se sert de mémoire. */
    repertoire: etatRepertoire(),
    /* CE QU'ELLE VA CHERCHER SUR INTERNET. Cent recherches d'images par jour
       sont gratuites ; la cent-unième se paie. Ce compteur est le robinet
       d'arrêt : quand il touche le plafond, BIA répond sans image plutôt que
       d'ouvrir une facture. Il repart chaque jour à minuit. */
    trouver: {
      moteur_images: imagesActives() ? "branché" : "pas de clé Google",
      moteur_videos: videosActives() ? "branché" : "pas de clé Google",
      ...comptesDuJour(),
    },
  }, {
    /* La page d'attente de bia.khalam.app lit cet état depuis un autre
       domaine : sans cet en-tête, le navigateur lui refuse la réponse et
       elle croirait BIA endormie pour toujours. Rien de secret ici — c'est
       déjà une page ouverte. */
    headers: { "access-control-allow-origin": "*" },
  });
}
