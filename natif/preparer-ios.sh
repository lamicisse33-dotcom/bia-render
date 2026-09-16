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

# ── 3. LA VERSION D'iOS MINIMALE ──────────────────────────────────────────────
#
# Lamine, le 18 septembre 2026, premier essai : « Build Failed », quatre fois
# la même erreur — App, Capacitor, CapacitorCordova, Pods-App.
#
#   The iOS deployment target 'IPHONEOS_DEPLOYMENT_TARGET' is set to 14.0,
#   but the range of supported deployment target versions is 15.0 to 27.0
#
# XCODE 27 N'ACCEPTE PLUS iOS 14, et Capacitor génère encore 14.0 partout.
# Rien à voir avec BIA : tout l'écosystème iOS a dû monter à 15 cette année.
#
# ON MONTE À 15.0, PAS PLUS HAUT. C'est le plancher qu'Apple impose, donc le
# plus d'iPhones gardés — et à Dakar, les téléphones de trois ou quatre ans
# sont la règle, pas l'exception. Chaque version de plus retire des gens.
#
# ET LE PIÈGE EST DANS LES PAQUETS DE RESSOURCES. `assertDeploymentTarget()`,
# la fonction de Capacitor déjà dans le Podfile, aligne les pods sur le projet
# — mais elle ignore les cibles de type « resource bundle », qu'Xcode 27 refuse
# aussi. C'est ce qui a fait perdre une soirée à beaucoup de monde. Le crochet
# ajouté ici repasse sur tout.

PROJET="ios/App/App.xcodeproj/project.pbxproj"
PODFILE="ios/App/Podfile"

if grep -q "IPHONEOS_DEPLOYMENT_TARGET = 14.0;" "$PROJET" 2>/dev/null; then
  sed -i '' 's/IPHONEOS_DEPLOYMENT_TARGET = 14.0;/IPHONEOS_DEPLOYMENT_TARGET = 15.0;/g' "$PROJET"
  echo "✓ le projet vise iOS 15.0"
else
  echo "✓ le projet ne vise plus iOS 14"
fi

if grep -q "platform :ios, '14.0'" "$PODFILE" 2>/dev/null; then
  sed -i '' "s/platform :ios, '14.0'/platform :ios, '15.0'/" "$PODFILE"
  echo "✓ le Podfile vise iOS 15.0"
fi

if ! grep -q "generated_projects" "$PODFILE" 2>/dev/null; then
  python3 - "$PODFILE" <<'FIN'
import sys
p = sys.argv[1]
s = open(p, encoding="utf-8").read()
vieux = "post_install do |installer|\n  assertDeploymentTarget(installer)\nend"
neuf = '''post_install do |installer|
  assertDeploymentTarget(installer)
  # Xcode 27 n'accepte plus iOS 14 : la plage va de 15.0 a 27.0, et il refuse
  # AUSSI les cibles « resource bundle », qu'assertDeploymentTarget ignore.
  installer.pods_project.targets.each do |cible|
    cible.build_configurations.each do |config|
      pose = config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
      if pose.nil? || pose.to_f < 15.0
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.0'
      end
    end
  end
  installer.generated_projects.each do |projet|
    projet.targets.each do |cible|
      cible.build_configurations.each do |config|
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.0'
      end
    end
  end
end'''
if vieux in s:
    open(p, "w", encoding="utf-8").write(s.replace(vieux, neuf))
    print("  (crochet des paquets de ressources ajoute)")
FIN
fi

# Les pods sont deja construits avec l'ancien chiffre : il faut les refaire,
# sinon Pods-App echoue encore alors que le Podfile est juste.
echo "→ pod install (une a deux minutes)…"
( cd ios/App && pod install > /tmp/bia-pod-install.log 2>&1 ) \
  && echo "✓ les pods sont refaits sur iOS 15.0" \
  || { echo "! pod install a echoue — voir /tmp/bia-pod-install.log"; exit 1; }

echo
echo "Prêt. Dans Xcode : ⌘R."
echo "Si l'icône ne change pas sur le téléphone, supprime l'application"
echo "de l'écran d'accueil et relance — iOS garde les icônes en mémoire."
