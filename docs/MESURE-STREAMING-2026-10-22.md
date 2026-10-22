# Mesurer la livraison de la voix wolof

État préservé avant la mesure : a9346ee362f29eea61a756f27f31beb841050026,
branche sauvegarde/bia-avant-mesure-streaming-20261022. Aucun changement des
chemins protégés de conversation, micro, voix ou sélection du cerveau.

Objectif : mesurer le délai avant le premier paquet qui contient du son,
puis l'arrivée du dernier paquet et de la fin du flux. Aucun gain de latence
n'est présupposé. Les premiers octets HTTP peuvent être des métadonnées et
ne sont jamais présentés comme le premier son.

Le même observateur sans rétention du son est utilisé par le client HTTP du
GPU et par la page d'essai isolée `/essai-streaming`. Il laisse passer les
octets inchangés, distingue les lectures HTTP des paquets audio, conserve au
plus seize instants d'arrivée et sépare les réponses audio en cache. La
validation existante du checkpoint, de la voix, des échantillons, de l'ordre
et du marqueur de fin reste obligatoire avant une mesure réussie.

Champs publics : `essai_streaming_isole.serveur.cas[].passes[].chronologie`
et `essai_streaming_isole.navigateur[].flux_http`. Premier octet, métadonnées,
premier/dernier audio, fin annoncée, fermeture HTTP si observée, durée de
génération déclarée par le serveur, nombres de lectures/paquets et taille
reçue. Pas de texte utilisateur, clé ou audio dans les nouvelles mesures.
Les mesures du navigateur distinguent réception, programmation de lecture
et écoute physique ; cette dernière ne peut pas être déduite des autres.

Six appels TTS fixes, séquentiels et sans cache applicatif, une seule série
par processus le 22 octobre : deux phrases wolof et une française, chacune
en clip complet et en flux, avec le même texte, seed, voix et checkpoint.
L'ordre complet/flux est alterné. Comparaison des durées et empreintes PCM ;
une différence de contenu ne peut pas être présentée comme un gain à qualité
égale. Aucun appel LLM/ASR ni écriture pédagogique dans ce diagnostic.

Une livraison étalée dans le temps n'établit pas que la synthèse continuait :
un serveur peut aussi temporiser l'envoi d'un fichier terminé. À l'inverse,
un proxy peut regrouper un vrai flux. Le diagnostic porte donc explicitement
`generation_progressive_confirmee: false`. Une preuve de chevauchement exige
des bornes prises dans le producteur audio lui-même. Le premier/dernier
paquet reçu permet de trancher sur l'avantage de livraison observé, pas sur
le fonctionnement interne du modèle ni sur la fidélité de prononciation.
