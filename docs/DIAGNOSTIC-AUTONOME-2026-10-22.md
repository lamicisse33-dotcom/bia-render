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


## Première série complète a2532cd011cd

Six échanges HTTP réels réussis, 01:12:07–01:12:44 UTC. Les secondes écoutes
ont exactement la même transcription. L'index commun est chargé une seule
fois en 876 ms, dont 245 ms d'indexation ; dix réutilisations observées.
La lecture anticipée fait partie des cinq lectures confirmées pendant l'ASR.

Quatre réponses calculées sans cache audio : 5 178, 7 267, 4 453 et 4 772 ms
jusqu'au premier clip reçu ; médiane 4 975 ms. Deux réponses répétées passent
par les caches et prennent 2 533 et 986 ms : ne pas les mélanger aux calculs
neufs pour présenter un gain. Reconnaissance HTTP médiane des quatre calculs
903 ms, préparation 463 ms, premier token natif 1 052 ms, voix 1 950 ms.
Aucune de ces durées ne comprend le silence ou le haut-parleur du téléphone.

Anomalie localisée : le modèle a terminé la sélection apprise wolof en
1 091 ms après 520 ms de préparation, alors que la réponse HTTP n'est
complète qu'à 4 900 ms. Environ 3 289 ms après le modèle restent donc à tracer.
Le prochain rejeu publie les durées de lecture des devoirs, de provenance,
d'attente de l'audio mémorisé et de réponse prête. Il contourne les deux
caches de réponses uniquement pour les calculs diagnostiques du maître ;
la voix conserve ses caches. Le comportement des conversations ordinaires
est inchangé. Aucun gain avant/après n'est déduit de cette seule série.


## Six calculs neufs ce567cbf730a

Série 01:22:03–01:22:45 UTC : six ASR, six calculs Sonnet et six voix
confirmés, aucun cache de réponse ni de voix utilisé. Premiers audios :
6 019, 4 540, 4 138, 3 250, 4 323, 6 053 ms. Le modèle a cette fois répondu
librement dans les six cas : l'attente du chemin de sélection apprise ne
s'est pas reproduite. Il n'est donc pas établi que les 3,3 secondes observées
venaient du modèle, de la provenance ou de l'audio. Les durées restent
variables et ne constituent pas une comparaison causale avant/après.

Une autre duplication est vérifiée dans le code et à trois instances en test :
le catalogue audio partageait sa fraîcheur entre bundles, mais son cache de
calcul des identifiants restait local. À sa prochaine expiration, un autre
bundle pouvait refaire les préparations phonétiques de 4 007 phrases. Le
cache de ces calculs est maintenant partagé aussi, avec les mêmes clés de
texte, langue et règles exactes. Les suppressions et nouvelles prononciations
restent immédiatement prises en compte. Le nombre d'entrées reste limité à
l'inventaire courant ; aucune nouvelle génération ou copie d'audio.
`audio_memoire.calculs_recents` ajoute les douze derniers temps et nombres de
calculs, sans texte ni identifiant privé. L'essai complet vérifie aussi les
composants de finalisation d'une réponse apprise existante, sans modèle ni
écriture. Ne pas attribuer l'ancien délai à cette duplication sans preuve.
