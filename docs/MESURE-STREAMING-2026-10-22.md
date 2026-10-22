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
égale. Aucun appel LLM ni écriture pédagogique dans ce diagnostic.

Une livraison étalée dans le temps n'établit pas que la synthèse continuait :
un serveur peut aussi temporiser l'envoi d'un fichier terminé. À l'inverse,
un proxy peut regrouper un vrai flux. Le diagnostic porte donc explicitement
`generation_progressive_confirmee: false`. Une preuve de chevauchement exige
des bornes prises dans le producteur audio lui-même. Le premier/dernier
paquet reçu permet de trancher sur l'avantage de livraison observé, pas sur
le fonctionnement interne du modèle ni sur la fidélité de prononciation.

## Vérification indicative des mots et prises réécoutables

Lamine demande de vérifier que le son en flux contient les mêmes mots. Les
premiers essais ne conservaient que les chiffres : une nouvelle série est
nécessaire pour garder les prises effectivement mesurées. Au plus six WAV
synthétiques de moins de 1 Mio sont conservés dans la mémoire du processus.
Leurs empreintes correspondent au rapport. Aucune voix utilisateur stockée.

Après les six appels TTS, les six WAV exacts sont envoyés séquentiellement à
la route d'écoute existante, avec le drapeau maître `diagnostic=1` qui exclut
le corpus. Seul l'indice de langue accompagne le son, pas la phrase attendue.
La comparaison utilise `texte_brut` avant les corrections du lexique. Les
alignements sont indicatifs : une erreur ASR peut ressembler à un mot absent,
et deux transcriptions identiques peuvent être toutes les deux fausses. La
normalisation des accents/ponctuations ne valide pas la prononciation.

Les durées de synthèse sont mesurées avant les appels ASR. Les états publics
n'exposent que les nombres et les mots de la référence synthétique non
retrouvés ; aucune transcription brute, clé ou donnée audio n'y est ajoutée.
`verification_fidelite.validation_humaine` reste false. Une reconnaissance
rejetée, vide ou en panne n'est jamais marquée conforme.

Les mêmes prises et leurs transcriptions indicatives sont accessibles au
maître uniquement via `/api/essai-streaming?prises=1`. La page d'essai les
affiche côte à côte, avec les lecteurs natifs et téléchargement ; ce chargement
ne génère rien. Une relecture HTTP authentifiée vérifie les six empreintes et
le refus sans code. Les événements de lecteur sont comptés séparément et ne
constituent pas une validation humaine. Aucun basculement du wolof de
conversation, changement de voix, ASR, modèle ou paramètre de micro.
