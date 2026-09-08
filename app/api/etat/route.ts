import { NextResponse } from "next/server";
import { voixConfig } from "@/lib/voix";
import { ecouteConfig } from "@/lib/ecoute";
import { lexiqueConfig } from "@/lib/lexique";

/* Dit à l'interface quels moteurs sont réellement branchés, pour qu'elle
   choisisse le micro et la voix sans deviner. Ouvert : aucun moteur payant
   n'est appelé ici. */
export async function GET() {
  return NextResponse.json({
    voix: voixConfig.fournisseur,
    ecoute: ecouteConfig.fournisseur,
    modele: process.env.BIA_LLM_MODEL || "claude-sonnet-5",
    cle_modele: Boolean(process.env.BIA_LLM_API_KEY || process.env.ANTHROPIC_API_KEY),
    lexique: lexiqueConfig.actif ? "supabase" : "mémoire vive (perdu au réveil)",
    voix_clonee: Boolean(voixConfig.soynade.audioPrompt),
  });
}
