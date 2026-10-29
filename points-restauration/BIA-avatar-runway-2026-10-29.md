# Bia — avatar Runway raccordé, 29 octobre 2026 (Dakar)

Lamine a validé l'essai de dix secondes avec la voix de Bia (« tout est parfait »),
puis demandé le raccordement à la conversation et la publication sans l'attendre.
Cette validation concerne l'essai, pas encore une mesure de la conversation sur son portable.

## Références conservées

- Progrès vocal historique : `f9bf26e9963353cca8a0db8fc1f49468b0956e70`.
- Dernière application avant raccordement : `a4d23f27852ce2215c8f35138ae99e2613157e71`.
- Character Runway validé : `e15f387a-20ae-4dd4-986d-601fb748ec07`.
- Les vidéos satin originales restent disponibles. Ne jamais rétablir la bouche superposée rejetée.

## Chemin de parole

Le cerveau, les devoirs, le lexique, la transcription et les moteurs vocaux restent ceux
de Bia. Leur audio est converti en PCM16 mono 16 kHz pour le protocole LiveKit DataStream
Runway. Le son et la vidéo reçus de l'avatar sont restitués ensemble ; aucune seconde
lecture locale du même passage ne doit être ajoutée. Le contexte audio déjà réveillé
par Bia sert à lire la piste distante, notamment sur Safari mobile.

Les lectures simples et les briques attendent la notification de fin distante. Khalam
Rapide garde son cerveau et son micro ; son adaptateur avatar est injecté explicitement,
sans importer LiveKit dans le module indépendant du client Gemini. L'interruption
coupe immédiatement le gain distant et vide la file. Les notifications anciennes
restent ordonnées et ne doivent pas terminer un nouveau tour.

Le choix `runway-direct` remplace une fois le satin animé ou le choix par défaut sur
l'appareil. Les autres apparences restent accessibles. Sans session avatar disponible,
la voix et les vidéos originales restent le repli. Une session commence à l'ouverture
de la conversation ou d'une lecture vocale ; pas au simple affichage du portrait.

## Exploitation

Secrets uniquement sur Render : `RUNWAYML_API_SECRET`, `LIVEKIT_URL`,
`LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`. Aucun secret dans ce dépôt.
L'accès à une session vérifie le code Bia et le numéro associé ; les sessions sont
liées à leur propriétaire. Plafond serveur : 120 s pour l'essai, 600 s pour la
conversation, avec renouvellement dans un silence. Fermeture de la conversation :
annulation Runway et déconnexion LiveKit. Une lecture hors conversation ferme sa
session après quinze secondes de repos.

Diagnostic public sans texte ni secret : `/api/avatar-runway?verifier=1`.
La vérification est un accès réel en lecture aux deux fournisseurs ; elle ne prouve
pas une synchronisation audiovisuelle. Les événements de lecture sont dans `mesures`.
La version réellement servie reste dans `/api/etat`.

## Vérification avant publication

122 tests ciblés passent, dont ordre et conservation des briques, garde de fin de
parole, reprises, annulation des lectures, conversion PCM, restitution exclusive
de l'audio, fin distante et notification obsolète après interruption. Compilation
de production validée. Les tests d'anciens chemins injectent un adaptateur avatar
inactif ; leurs assertions de lecture et de silence sont conservées.

Il reste à lire les mesures d'une conversation réelle après publication pour chiffrer
la latence totale ajoutée par l'avatar sur le portable. Ne pas annoncer une latence
identique à la lecture audio locale sur la seule base des tests.
