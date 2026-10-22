# Préparation de Sonnet après le correctif de contexte

Lamine constate un ralentissement. Relevé réel à 00:20–00:26, Dakar : cinq
réponses calculées de 4,669 à 8,838 secondes, médiane 6,569 secondes, hors
salutation enregistrée. Le premier son d'une réponse par briques est mesuré
à 6,058 secondes. Les comparaisons précédentes étaient plus courtes et
portaient sur d'autres questions : elles ne démontrent pas à elles seules
la cause du ralentissement.

Sonnet est toujours sélectionné, aucune erreur modèle n'est remontée. Sur
la période inspectée, Render reste sous 21 % de son demi-CPU et 65 % de sa
mémoire. Le dernier accès aux fiches atteint 981 ms ; la préparation du tour
atteint 1 057 ms. Le modèle et la voix gardent une part majeure de l'attente.

Le correctif précédent réanalysait les mêmes références à chaque tour.
L'analyse stable de leurs textes exacts est maintenant réutilisée dans un
cache borné à 256 sources et deux millions de caractères. Une nouvelle
version du texte possède une autre clé. Aucun choix dépendant de la question
ou des faits de la personne n'est mis en cache. Les contrôles de contexte,
dont le cas du restaurant, sont recalculés à chaque appel. Les phrases sans
prix ni clarification chiffrée évitent de reconstruire l'historique complet.

Le préchargement de quatre lecteurs existants pendant la transcription,
jusqu'ici réservé à Haiku optimisé, s'applique désormais au maître avec
Sonnet habituel. Il ne bloque pas la reconnaissance et garde les délais de
cache, les contrôles de révision et les textes des lecteurs. Le modèle,
les poids vocaux, le silence de 400 ms et les segments de quatre secondes
de la conversation habituelle restent les mêmes.

Un contrôle temporaire compare réanalyse et réutilisation sur 48 sources
réelles, en alternant l'ordre et en exigeant des sorties identiques. Son
rapport public `preparation_references` ne contient que des nombres.
Les deux contrôles écrits de contexte sont relancés avec Sonnet. Ils ne
mesurent ni le microphone ni le premier son du téléphone. Aucun gain bout
à bout n'est déduit du seul gain sur le filtrage.

Référence avant cette modification : ebfabf6e134ed59542ba4d3eb127f30bfc9396d6.

## Vérification des lecteurs partagés

Premier contrôle en ligne : réanalyse médiane 45,715 ms, réutilisation
16,01 ms, sorties identiques sur les six comparaisons. Ce gain seul
n'explique pas plusieurs secondes. Le compteur de la route d'état montrait
zéro analyse tandis que le contrôle en comptait 336 : les différents
bundles chargeaient des instances distinctes du cache de module.

Le cache des analyses, les lectures de devoirs et d'instructions et l'index
des dialogues sont donc partagés au niveau du processus. Les TTL de 15/30
secondes et les générations d'invalidation restent appliqués. Une lecture
de devoirs en cours est partagée ; une correction pendant cette lecture
force sa reprise sur la nouvelle génération. Les caches privés ne sont pas
inclus dans les rapports publics, qui gardent seulement des compteurs.
Les tests utilisent deux chargements indépendants des vrais modules pour
vérifier la réutilisation, l'expiration et la correction immédiate.
