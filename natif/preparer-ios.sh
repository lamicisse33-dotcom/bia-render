#!/bin/bash
# ── CE QUE `npx cap add ios` NE SAIT PAS, ET QU'IL FAUT REPOSER ────────────────
#
# Le dossier ios/ n'est pas dans le dépôt : Capacitor le régénère. C'est voulu.
# Mais tout ce qu'on y pose à la main disparaît avec lui — et deux de ces
# choses-là ne sont pas des détails :
#
#   1. LES PERMISSIONS. Sans la clé du micro, iOS ne demande rien : il TUE
#      l'application à la seconde où elle touche le micro.
#
#   2. L'ICÔNE. Sans elle, BIA porte le logo de Capacitor sur l'écran d'accueil
#      — Lamine, le 18 septembre 2026 : « je n'arrive pas à voir son icône sur
#      l'écran, il n'y a que l'ancienne icône. » Il cherchait son visage à elle
#      et trouvait un carré gris ; il ne savait même pas si c'était installé.
#
# Ce script repose les deux. Il ne se sert QUE d'outils déjà présents sur un
# Mac — `plutil` et `sips` — pour qu'il marche sur une machine neuve, sans rien
# installer. On peut le relancer autant de fois qu'on veut.
#
#   Usage :  cd natif && ./preparer-ios.sh
#
set -e
cd "$(dirname "$0")"

PLIST="ios/App/App/Info.plist"
ICONE="ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"
SOURCE="../public/icone-512.png"

if [ ! -f "$PLIST" ]; then
  echo "Le projet iOS n'existe pas encore. Fais d'abord :"
  echo "  npm install && npx cap add ios"
  exit 1
fi

# ── 1. LES PERMISSIONS ────────────────────────────────────────────────────────
#
# Ces quatre textes sont ce que la personne lira dans la fenêtre du téléphone.
# CE SONT DES MOTS POUR LES GENS, PAS DU CODE : Lamine les change comme il veut.
#
# La position est là parce que la carte suit le déplacement
# (navigator.geolocation.watchPosition dans app/carte/Carte.tsx). Sans cette
# clé, le guidage reste muet sans jamais dire pourquoi.

plutil -replace NSMicrophoneUsageDescription -string \
  "BIA a besoin du micro pour t'entendre parler." "$PLIST"
plutil -replace NSCameraUsageDescription -string \
  "BIA a besoin de l'appareil photo pour lire les papiers que tu lui montres." "$PLIST"
plutil -replace NSPhotoLibraryUsageDescription -string \
  "BIA a besoin de tes photos pour lire les papiers que tu lui envoies." "$PLIST"
plutil -replace NSLocationWhenInUseUsageDescription -string \
  "BIA a besoin de ta position pour te situer sur la carte et te guider." "$PLIST"

plutil -lint "$PLIST" > /dev/null
echo "✓ les quatre permissions sont posées"

# ── 2. L'ICÔNE ────────────────────────────────────────────────────────────────
#
# iOS veut exactement 1024×1024 et REFUSE la transparence. La source fait 512 :
# on l'agrandit, ce qui l'adoucit un peu. Le jour où une source 1024 existera,
# il suffira de la poser dans public/ et de changer la ligne SOURCE ci-dessus —
# `sips` ne réduira plus, il copiera.

if [ -f "$SOURCE" ]; then
  cp "$SOURCE" "$ICONE"
  sips -s format png -z 1024 1024 "$ICONE" > /dev/null
  echo "✓ l'icône est son visage, en 1024×1024"
else
  echo "! $SOURCE introuvable — l'icône reste celle de Capacitor"
fi

echo
echo "Prêt. Dans Xcode : ⌘R."
echo "Si l'icône ne change pas sur le téléphone, supprime l'application"
echo "de l'écran d'accueil et relance — iOS garde les icônes en mémoire."
