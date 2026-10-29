# Bia satin : bouche prélevée sur le son réellement joué

Référence précédente : `25cac539de15dcb928da0c80650021697c661c1a`.

Le simple lancement d'une vidéo parlante au début de la réponse ne synchronisait
pas ses lèvres avec la voix. Le premier correctif sautait le préambule muet,
mais conservait ce défaut fondamental.

Le nouveau rendu remplace uniquement la région des lèvres par huit ouvertures
extraites de la même personne dans la vidéo approuvée. Les coordonnées et
l'inclinaison sont relevées pour chacune des images des six vidéos. Les yeux,
le nez, les cheveux, le corps et les gestes restent ceux des vidéos existantes.
Les images présentées sont suivies avec requestVideoFrameCallback lorsque le
navigateur le fournit ; currentTime sert de repli.

La lecture de l'enveloppe sonore se fait au moment du dessin : aucun relais
React et aucune minuterie alternant arbitrairement des bouches. Gemini Live
fournit son horloge compensée du retard du haut-parleur ; les lecteurs WebAudio
utilisent l'horloge et le retard de leur contexte. Un silence, une source arrêtée
ou une reprise utilisateur ferme ou masque la couche de lèvres. Les vidéos
principales et la petite planche de lèvres sont préchargées, sans attendre leur
lecture pour produire la voix. Aucun son n'est retardé ni transformé.

Limites : il s'agit d'une synchronisation de l'ouverture et des pauses sur
l'enveloppe audio, pas d'une synthèse phonème par phonème. Les gestes du corps
restent ceux des prises approuvées. La voix système du téléphone, qui ne donne
pas accès à son signal, conserve le rendu vidéo antérieur. Les éléments
historiques (anciens personnages, voix, micro, briques, moteur et textes) sont
conservés. Les ressources restent à la définition native ; le canvas compose une image complète seulement à chaque nouvelle image vidéo,
puis restaure uniquement la petite zone des lèvres entre deux images. Cela
empêche de superposer une bouche suivie sur une autre image vidéo, et conserve
la définition native.

Vérifications : tests de la lecture directe du signal, des blancs entre segments,
d'un ancien RAF en retard, d'une interruption et de la couverture du suivi de
chaque image ; compilation TypeScript et Next ; essai dans le navigateur avec
une vraie piste vocale locale comportant des pauses. Le navigateur distant ne
permet pas de conclure à un décalage physique mesuré sur le téléphone de Lamine.
Ne pas annoncer une synchronisation parfaite ou une mesure de latence à zéro.

Reproduction des ressources : `outils/preparer-levres-satin.py --model chemin`.
Le modèle officiel MediaPipe est utilisé hors ligne pour la préparation ;
aucun modèle, appel externe ou calcul ML n'est nécessaire à l'utilisation.
