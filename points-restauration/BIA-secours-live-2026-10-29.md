# Bia — secours automatique du moteur vocal

Référence avant changement : db9c08766c03991f2f87d10a354e72a5eea07564.
Le propriétaire confirme entendre la voix, puis demande un secours automatique en cas d'épuisement du premier moteur. Le modèle principal Render demeure Gemini 2.5 Flash Native Audio. Gemini 3.8 Live est le secours, avec la même clé déjà utilisée ; aucun nouveau compte, abonnement ou clé créé.

Essais génériques réels de Gemini 3.8 : audio en 1482 ms sans historique, 1634 ms avec historique fictif et protocole spécial. Ces durées partent du début de l'appel serveur, pas de la fin de parole sur téléphone. Aucun socle privé transmis dans ces essais.

La route de session essaie le second modèle si la création de jeton reçoit 429/5xx ou une panne transitoire. Le client se reconnecte au second modèle si le WebSocket rencontre un refus de quota ou une panne transitoire, avant ou après setup. Il conserve le micro et l'historique, coupe les anciens sons, n'exécute pas de nouveau les actions déjà faites et ne rejoue pas automatiquement une demande interrompue. Une interruption peut donc nécessiter de répéter la dernière demande. Deux modèles au maximum ; pas de boucle, pas de bascule sur le GPU hors service. Les erreurs de format et d'accès ne sont pas masquées par une bascule.

Le secours n'est pas déclenché par une réponse lente : basculer pendant qu'un modèle réfléchit peut augmenter le délai, perdre des mots et consommer deux fois. La latence est un sujet distinct. Le quota Google est par projet et modèle, pas par clé : plusieurs clés du même projet n'ajoutent pas de quota.

Tests : refus simulé avant/après setup, retour audio du secours, conservation historique, épuisement des deux modèles, arrêt explicite et erreur invalide sans reconnexion. Les essais réels valident chaque modèle séparément ; aucun incident quota de production n'a été provoqué volontairement.
