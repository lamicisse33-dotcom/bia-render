# Montage séparé de la planche de bouches

Demande : montrer les nouvelles formes de bouche réellement montées sur les six vidéos avant toute intégration dans Bia.

Page : /essai-bouches. Référence de départ : 28a93937a7735753e3d0709d98341e22e98c8106. Aucun changement du choix des personnages, de PortraitSatin, de la voix ou du micro de Bia. Le drapeau de l'ancien essai refusé reste inchangé.

La planche générée le 29 octobre est conservée dans public/personnages/bouches-essai-20261030/atlas.png. Elle contient 24 vues ; la page monte les suites A/E et A/O/OU avec les états intermédiaires. Les lèvres sont recadrées par tuile, suivies à partir des repères des vidéos, inclinées et redimensionnées avec le visage. Un masque doux et une correction de couleur locale atténuent le raccord. La bouche native est gardée pendant l'occlusion par la main du bisou. Le corps et les mains restent ceux des vidéos originales.

L'animation suit l'énergie du son public voix-bia.wav, avec attaque et relâchement progressifs. Elle ne constitue PAS une reconnaissance des phonèmes ni une synchronisation articulatoire exacte. Une bouche générée peut différer du visage et un fondu peut laisser des artefacts : la validation visuelle doit précéder toute intégration dans la conversation.

La page permet de choisir les six vidéos, de lancer/arrêter le son et de comparer immédiatement le montage à la vidéo originale. Le canvas expose data-fps, data-bouche et data-forme pour vérifier l'activité réelle. Cadence plafonnée à environ 30 images/s pour ne pas redessiner inutilement à 60 images/s. Aucun abonnement ni appel Runway pendant cet essai.
