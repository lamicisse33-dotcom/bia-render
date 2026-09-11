import { NextResponse } from "next/server";
import { voixConfig } from "@/lib/voix";
import { ecouteConfig } from "@/lib/ecoute";
import { lexiqueConfig, combien, combienParApplication } from "@/lib/lexique";
import { dernierePanne, pannes } from "@/lib/panne";
import { resumeAttentes, resumeLectures } from "@/lib/attentes-vues";
import { resumeEmotions } from "@/lib/emotions-vues";
import { depense } from "@/lib/depense";
import { comptesDuJour, imagesActives, videosActives } from "@/lib/trouver";

/* Dit à l'interface quels moteurs sont réellement branchés, pour qu'elle
   choisisse le micro et la voix sans deviner. Ouvert : aucun moteur payant
   n'est appelé ici.

   `derniere_panne` est la ligne qui manquait : quand BIA cesse de réfléchir,
   c'est ici qu'on lit pourquoi — le statut renvoyé par le modèle et le début
   de son message. Elle se vide dès que le modèle répond de nouveau. Aucune
   clé n'y apparaît. */
export async function GET() {
  let entrees: number | null = null;
  try { entrees = await combien(); } catch { entrees = null; }

  // D'où viennent ces corrections. La table est commune aux trois
  // applications : sans ce détail, on ne sait pas si BIA en reçoit.
  let origines: Record<string, number> | null = null;
  try { origines = await combienParApplication(); } catch { origines = null; }

  return NextResponse.json({
    voix: voixConfig.fournisseur,
    ecoute: ecouteConfig.fournisseur,
    modele: process.env.BIA_LLM_MODEL || "claude-sonnet-5",
    cle_modele: Boolean(process.env.BIA_LLM_API_KEY || process.env.ANTHROPIC_API_KEY),
    lexique: lexiqueConfig.actif ? "supabase" : "mémoire vive (perdu au réveil)",
    lexique_entrees: entrees,
    lexique_origines: origines,
    voix_clonee: Boolean(voixConfig.soynade.audioPrompt),
    derniere_panne: dernierePanne(),
    // L'histoire, elle, ne s'efface pas : une panne passée reste lisible même
    // si tout va bien depuis. C'est la seule façon de comprendre après coup.
    pannes: pannes(),
    attentes: resumeAttentes(),
    lecture: resumeLectures(),
    emotions: resumeEmotions(),
    /* CE QUE ÇA COÛTE, COMPTÉ ET NON DEVINÉ. Les signes réellement envoyés à
       Soynade, par route, et les jetons que le modèle dit avoir consommés —
       avec la part revenue du cache. Remis à zéro à chaque redémarrage du
       serveur : c'est une mesure de journée, pas une comptabilité. */
    depense: depense(),
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
