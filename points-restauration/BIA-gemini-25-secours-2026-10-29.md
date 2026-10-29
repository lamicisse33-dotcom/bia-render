# Bia — modèle vocal de secours après refus de quota

Référence avant changement : 056b83da1feae872884c2052eec1d70847675bc8.
Le 29 octobre, Google refuse Gemini 3.8 Live avant setup avec le motif quota exceeded. Les captures AI Studio montrent 87,72 K de pic TPM et un plafond plus large (1 M) pour Gemini 2.5 Flash Native Audio Dialog sur le projet equilibre.

Deux essais isolés avec la clé existante ont accepté gemini-2.5-flash-native-audio-preview-12-2025 : nu en 1025 ms, reprise_et_historique en 755 ms. Il s'agit de poignées de main courtes, pas d'une validation audio ou wolof. Aucun de ces essais ne transmet le socle privé de Bia.

Le réglage Render GEMINI_LIVE_MODEL est modifié par fusion vers ce modèle ; ancienne valeur observée en service gemini-3.8-live. Les autres variables et les secrets ne sont pas modifiés. Pour revenir, rétablir GEMINI_LIVE_MODEL=gemini-3.8-live et déployer.

Ajout d'un essai audio=1 pour les variantes courtes existantes. Il envoie uniquement une consigne générique FR/WO et une demande synthétique de bonjour ; aucun appel à la session de production, aucun devoir, lexique, souvenir ou instruction privée. Il mesure le premier paquet audio depuis Render, pas la latence réelle ni la lecture iPhone. Le même plafond journalier et le même espacement de quinze secondes s'appliquent.

Le changement n'altère ni la mémoire, ni les réglages du micro, ni les personnages. La qualité du wolof avec le modèle de secours reste à écouter.
