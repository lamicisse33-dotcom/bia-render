# Essai isolé des lèvres sur la vidéo originale

Référence de l'application locale conservée : 91a3fbd47602bba4c900586f822555d3222a0a1b.
Le prototype /essai-levres utilise parole.mp4 et l'audio public voix-bia.wav. Un shader utilise exclusivement les pixels de la vidéo courante, avec les coordonnées de lèvres déjà relevées image par image. Le suivi privilégie mediaTime de requestVideoFrameCallback ; l'échelle des lèvres suit le volume sonore avec attaque et relâchement progressifs et une déformation bornée. Hors de la zone des lèvres, l'image source est conservée. Aucune bouche générée ni atlas de visage superposé.

Ce prototype ne prétend pas reconstruire des phonèmes ou des dents absentes : il module seulement l'ouverture existante. Sa qualité doit être vue dans le navigateur, notamment sur mobile. Le bouton de comparaison permet d'afficher la vidéo originale avec le même son. Il ne remplace pas le portrait courant de Bia et n'appelle aucune API de génération. Le cerveau, le micro et les leçons ne sont pas utilisés dans cet essai.
