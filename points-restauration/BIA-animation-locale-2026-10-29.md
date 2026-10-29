# Bia — animation avec les vidéos conservées

À la demande de Lamine, l'animation utilise les MP4 existants dans public/personnages/satin-anime-20261028. Les vidéos sont hébergées avec Bia et lues dans le navigateur : aucun appel Runway n'est nécessaire pour les rejouer. Les gestes et les lèvres appartiennent au même visage filmé, sans superposition de bouche. La lecture accompagne le début et la fin de parole ; les phonèmes ne sont pas synchronisés mot à mot.

Une migration unique remplace runway-direct par satin-anime. L'ancienne valeur est aussi affichée localement si elle subsiste. Le choix payant n'est plus proposé dans le menu. L'API refuse toute nouvelle ouverture de session Runway, y compris depuis une ancienne page. Les secrets, le personnage Runway et le code de retour sont conservés, sans annuler ni modifier un abonnement externe. Les éventuelles sessions déjà ouvertes peuvent subsister jusqu'à leur fermeture ou leur expiration ; actualiser Bia les déconnecte.

Le lecteur revient immédiatement à l'écoute pendant une reprise utilisateur. Le démarrage d'une réponse repositionne le clip dans la fenêtre où les lèvres bougent, y compris si le même clip était déjà prévisualisé. La voix, le cerveau, le micro et les données d'apprentissage ne changent pas. Les autres services de Bia et son hébergement conservent leurs coûts propres.

Référence avant changement : 1ee0ec6de57ca08b7e21bb7aeb6859dfe428df93. Cette référence conserve le buste synchronisé et sa reconnexion. Ne pas réactiver la facturation à l'usage sans demande de Lamine.
