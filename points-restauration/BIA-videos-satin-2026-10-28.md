# Bia — personnage animé en satin bleu nuit

Référence avant intégration : `587d59ab51632ed16f013b26ebce47d12675d0e2`,
conservée sur `sauvegarde/bia-avant-videos-satin-2026-10-28`.

## Périmètre

Nouvelle option « Bia animée — satin bleu nuit » dans Moi → Changer de personnage.
L'ancien choix est conservé tant que l'utilisateur ne sélectionne pas la nouvelle
option. Les trois tenues HD et les deux personnages historiques restent disponibles.
La préférence reste locale à l'appareil, dans la clé d'apparence déjà utilisée.

Cinq vidéos Runway produites et validées visuellement par le propriétaire :
parole, joie, rire, cœurs et bisou. Le manifeste public du dossier
`public/personnages/satin-anime-20261028` donne les identifiants des tâches,
les dimensions, durées, octets et empreintes. Les liens temporaires Runway ne sont
pas utilisés par l'application : les médias sont versionnés dans le dépôt.
Aucun appel Runway ni coût de génération ne survient pendant la conversation.

H264 à définition native 1176 × 1764, 24 images/s, CRF21, démarrage rapide.
Les cinq vidéos représentent environ 21 Mo. Elles sont chargées à la demande,
une seule séquence étant affichée à la fois. Un sixième clip d'écoute de 3,33 s
est extrait entre 1,5 et 3,15 s de la vidéo de parole, avec retour en sens inverse,
pour conserver les lèvres fermées et les mains basses. Une pause variable sépare
les reprises de cette petite animation d'écoute.

## Relation avec la conversation

Le composant lit l'état de parole, le signal de reprise utilisateur et l'émotion
existants. Une seule ligne d'appel dans app/page.tsx reçoit deux propriétés
visuelles supplémentaires. Aucun changement aux API, au STT, au TTS, à la mise en
file des briques, au micro, au modèle, aux apprentissages ou au lexique.

Les séquences sont toutes sans piste audio et le lecteur HTML est aussi muet.
Les sons de rire/bisou produits par Runway ne sont donc pas superposés à la voix
actuelle de Bia. Les sons déjà gérés par le chemin vocal restent gérés par lui.

Une reprise utilisateur prime sur un ancien état « speaking » et annule un geste
en cours. L'animation d'écoute a les lèvres fermées. Les gestes historiques
coeur/coeur_double/bisou/rire déclenchent leurs vidéos visuelles correspondantes.
Le rire et les gestes explicites peuvent finir après la réponse, sauf reprise
utilisateur ou nouveau tour de parole. La vidéo générique de joie est réservée
aux émotions positives ; les réponses neutres ou sérieuses utilisent la parole
ordinaire. Des boutons d'aperçu sont disponibles dans le choix du personnage.

L'onglet masqué et le réglage de mouvement réduit suspendent les vidéos ; le
portrait de repos demeure. Une vidéo indisponible laisse aussi le portrait de
repos. Le micro et les commandes restent au-dessus du portrait dans le contexte
d'empilement isolé déjà corrigé.

## Limite explicite

Ces vidéos comportent des mouvements de bouche préparés. Elles ne synchronisent
pas chaque phonème aux mots arbitraires prononcés ensuite par Bia. Cette
intégration suit les états de dialogue, pas une synchronisation labiale précise.
La voix actuelle est conservée. Ne pas annoncer une synchronisation labiale
parfaite ni une latence vocale mesurée à partir d'un banc visuel.

## Vérification

Onze tests locaux : sélection des séquences, priorité de reprise utilisateur,
compatibilité des anciens gestes, fichiers H264 réellement décodables, absence
de piste audio, définition native, préchargement et récupération après erreur,
conservation des anciens portraits. TypeScript et compilation Next réussis.

Contrôle des composants réels dans un banc navigateur de 375 px : mémorisation,
lecture effective H264, choix et aperçu des gestes, retour à l'écoute lors d'une
reprise simulée, refus d'un nouvel aperçu pendant cette reprise, boutons du bas
visibles. Ce contrôle n'est pas une conversation micro authentifiée en production.

Pour restaurer : rétablir les fichiers de personnages et lib/apparences-bia.ts
à la référence, puis retirer seulement les deux propriétés nouvelles du
PortraitTenue principal. Ne pas réinitialiser toute la branche et perdre les
modifications ultérieures d'autres fonctions.
