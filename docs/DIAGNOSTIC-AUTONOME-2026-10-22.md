# Diagnostic autonome de latence — 22 octobre 2026

Demandé par le propriétaire : effectuer nous-mêmes les tests et localiser
le délai. Sonnet 5.5, voix, capture et silence de fin de parole conservés.
Référence avant mesure : c63567eb75e36b9f69f01f74723a81f1fb2390f2.

Une seule série par processus, limitée au 22 octobre, six échanges ordonnés
français / wolof / suite wolof / suite wolof / wolof / français. Les trois
enregistrements synthétiques fixes sont fabriqués une seule fois. Chaque
échange envoie le même son à la vraie route HTTP de reconnaissance puis sa
transcription effective à la vraie conversation avec son contexte. La voix
commence dès la première phrase complète, pendant la suite du modèle.
Les caches audio sont indiqués séparément. Les diagnostics ne sont pas
enregistrés dans le corpus, les conversations ou les devoirs.

Champ public : `diagnostic_latence_autonome`. Uniquement durées, nombres,
langues et statuts ; aucun son, transcript, texte privé ou accès exporté.
Le champ numérique de préparation/texte/modèle dans l'événement SSE final
est réservé aux essais pédagogiques du maître authentifié avec l'en-tête
de diagnostic ; toute valeur de mesure fournie par le client est effacée.

Périmètre : réception HTTP du premier clip. Ni fin de parole, ni réseau du
téléphone, ni lecture effective par son haut-parleur ne sont mesurés.
Ne pas annoncer un gain du téléphone à partir de cette série.

Avant publication : test de concurrence réel sur les flux simulés, test
des drapeaux interdisant les écritures, protection des textes privés,
TypeScript et contrôles habituels de conversation/audio.

Le premier lancement e0719daed584 s'est arrêté pendant la préparation des
sons témoins : le protocole du test exigeait un seul clip. Le rejeu assemble
désormais les clips complets ordonnés du flux normal, avec validation de la
voix et de la fin du flux. Le nombre de clips et le statut HTTP sont publiés.

Correction ciblée : l'index commun de mémoire était encore propre à chaque
bundle Next. Le chargement, l'index et la révision sont maintenant partagés
entre ASR, conversation, instrumentation et briques. Sa lecture commence
pendant l'ASR, sans attendre sa fin. Les sélections contextuelles restent
recalculées ; chaque correction de source invalide l'index partout. Aucun
devoir, budget de contexte, classement ou formulation n'est supprimé.
`memoire_organisee.index_partage` indique chargements, réutilisations, nombre
de documents et temps du chargement/index. Ce compteur confirme la réutilisation
effective ; il ne remplace pas la mesure de la chaîne complète.
