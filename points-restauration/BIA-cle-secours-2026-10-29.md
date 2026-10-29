# Bia — seconde clé Gemini

Référence précédente : b10485664051eeeb8f3f72c37556c80e8c3af732.
Le propriétaire a ajouté GEMINI_API_KEY_SECOURS sur Render et confirmé le déploiement. Aucun secret n'est copié dans le dépôt ni affiché dans les diagnostics.

Ordre : modèle principal sur clé principale ; même modèle sur clé de secours si différente ; modèle alternatif sur clé principale. La priorité actuelle souhaitée est Gemini 3.8 Live, puis Gemini 2.5 Flash Native Audio en dernier recours. Les identifiants de connexion séparent les deux clés d'un même modèle. Trois tentatives maximum ; ni boucle ni changement de voix spontané pendant une simple attente. L'historique et le micro sont conservés, sans rejouer automatiquement les actions ou une demande interrompue.

Le diagnostic générique cle=secours utilise uniquement GEMINI_API_KEY_SECOURS ; si absente il échoue explicitement. Aucune session complète, leçon, mémoire ou consigne privée n'est chargée. Même limite de vingt essais et quinze secondes entre essais. La page /essai-son?cle=secours permet de mesurer la lecture d'une courte salutation synthétique sur Gemini 3.8.

Une clé différente ne prouve pas un projet différent, ni une autorisation de cumuler les quotas. La capture utilisateur montre un projet « bia gi » au niveau sans frais, distinct de nom du projet « equilibre » déjà utilisé ; les projets n'ont pas été comparés par identifiant. L'acceptation de la nouvelle clé exige un essai réel après publication ; les tests locaux utilisent seulement des données fictives.

Essai navigateur de la nouvelle clé : Google répond « API key not valid. Please pass a valid API key. » Aucun audio reçu, secours non validé. Un HTTP 400 sur la clé de secours ne doit pas supprimer le recours final au modèle alternatif sur la clé principale. La valeur fournie doit être vérifiée par le propriétaire dans Render ; aucune clé n’a été affichée ou extraite.
