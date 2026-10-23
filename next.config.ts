import type { NextConfig } from "next";

/* 23 octobre 2026 : ce fichier était vide. Deux réglages sûrs :
   - compress : les réponses JSON (briques, audio en base64) partent
     compressées vers le téléphone — moins d'octets sur le réseau de Dakar.
   - poweredByHeader : un en-tête de moins sur chaque réponse. */
const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
};

export default nextConfig;
