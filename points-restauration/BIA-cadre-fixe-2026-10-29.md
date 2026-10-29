# Bia — taille fixe de la capture IMG_3580

Lamine demande la taille de sa capture exactement, sans couper Bia.
Référence avant correction : `5e0201f045e1c24b3d8ccc13cf73a51470033d94`.

Le lecteur synchronisé prend désormais les mêmes dimensions que `.cadre`
du portrait satin de la capture : largeur min(96cqw, 64cqh, 1024px), rapport
2/3, centré dans la zone portrait. La vidéo utilise `object-fit: contain`
avec largeur et hauteur à 100 %. L'image reçue est intégralement contenue,
quel que soit son format, au lieu de remplir la hauteur et couper les côtés.
Le zoom de 4 % est supprimé ; la parole ne modifie plus la taille du cadre.

La référence Runway, les visages, les vidéos de gestes, le cerveau, la voix et
le microphone ne sont pas modifiés. Les gestes du fournisseur restent
génératifs ; les dimensions CSS identiques ne prouvent pas à elles seules
une silhouette identique dans chaque image du flux vidéo.
