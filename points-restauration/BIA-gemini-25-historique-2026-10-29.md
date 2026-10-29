# Bia — compatibilité de l'historique Gemini 2.5

Référence avant correction : 736c6f59f985b98c634c3a2ec5bf7dfa92efe0db.
Neuf tentatives téléphone avaient échoué après setup : fermeture 1007 « Request contains an invalid argument », aucun tour audio mesuré.
Les essais génériques client_historique et client_vide reproduisent le même code 1007 en 986 et 1059 ms. Ils utilisent uniquement des salutations fictives et le protocole initialHistoryInClientContent, pas le socle privé.

Correction ciblée : retirer historyConfig pour Gemini 2.5 seulement. Le client envoie l'historique existant avec turnComplete=false et ne transmet aucun clientContent vide. L'ancien protocole demeure pour les modèles qui l'annoncent. Aucune mémoire, instruction, leçon, identité ou configuration micro supprimée.

La page /essai-son mesure une réponse générique non silencieuse et sa lecture Web Audio ; elle ne teste ni les souvenirs de production, ni le microphone ou le haut-parleur du téléphone. Les plafonds des essais sont conservés. Ne pas assimiler cette vérification à une validation complète de conversation.
