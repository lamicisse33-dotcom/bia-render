#!/usr/bin/env bash
# ── PRÉPARER bia-voix À RECEVOIR LA SAUVEGARDE — SANS RIEN COPIER ──────────
#
#   Lamine, le 24 octobre 2026 : « Sur bia-voix, vérifie l'espace disque libre
#   (df -h). S'il ne suffit pas, dis-le-moi avant de continuer. »
#
#   Ce script MESURE d'abord et REFUSE si la place manque. Il ne téléverse
#   rien : un transfert de plusieurs heures qui meurt à 95 % sur un disque
#   plein, c'est plusieurs heures perdues et un dossier à moitié écrit qu'on
#   croira complet.
#
#   Il ne touche à rien d'autre sur le serveur : pas de Docker, pas de Caddy,
#   pas le service de voix qui tourne. Il crée un dossier et un utilisateur.
set -euo pipefail

HOTE="${BIA_VOIX_HOTE:-root@49.13.95.191}"
RACINE="${BIA_SAUVEGARDE_RACINE:-/srv/sauvegarde-khalam}"
# 28 Gio de données + une marge de 4 Gio pour les fichiers partiels de rsync.
BESOIN_GIO="${BIA_SAUVEGARDE_BESOIN_GIO:-32}"
# Le strict nécessaire seul, si on renonce au checkpoint d'entraînement.
BESOIN_MINIMAL_GIO=14

echo "── bia-voix : ce qu'il y a avant qu'on touche à quoi que ce soit ──"
ssh -o ConnectTimeout=15 "$HOTE" 'echo "hôte     : $(hostname)"; echo "noyau    : $(uname -srm)"; echo; echo "── df -h ──"; df -h /; echo; echo "── ce qui tourne ──"; (docker ps --format "{{.Names}} ({{.Status}})" 2>/dev/null || echo "docker : pas interrogeable")'

LIBRE_GIO=$(ssh -o ConnectTimeout=15 "$HOTE" "df -B1G --output=avail / | tail -1 | tr -d ' '")
echo
echo "Place libre mesurée : ${LIBRE_GIO} Gio"
echo "Besoin complet      : ${BESOIN_GIO} Gio (oreille + voix + checkpoint d'entraînement)"
echo "Besoin minimal      : ${BESOIN_MINIMAL_GIO} Gio (de quoi faire reparler un pod)"

if [ "$LIBRE_GIO" -lt "$BESOIN_MINIMAL_GIO" ]; then
  echo
  echo "✖ ARRÊT : même le strict nécessaire ne rentre pas (${LIBRE_GIO} < ${BESOIN_MINIMAL_GIO} Gio)."
  echo "  Il faut un volume Hetzner en plus, ou faire de la place. Je ne copie rien."
  exit 2
fi
if [ "$LIBRE_GIO" -lt "$BESOIN_GIO" ]; then
  echo
  echo "⚠ La sauvegarde COMPLÈTE ne rentre pas, mais le strict nécessaire oui."
  echo "  Téléverse alors sans le second passage :"
  echo "      SANS_CHECKPOINT=1 bash outils/sauvegarde-khalam/televerser-vers-bia-voix.sh"
  echo "  Les 18 Gio du checkpoint ne servent qu'à REPRENDRE L'ENTRAÎNEMENT ;"
  echo "  ils restent sur le Mac, qui garde l'original de toute façon."
fi

echo
echo "── création du rangement et de l'utilisateur de restauration ──"
ssh -o ConnectTimeout=15 "$HOTE" "RACINE='$RACINE' bash -s" <<'DISTANT'
set -euo pipefail
mkdir -p "$RACINE"/{oreille,voix,rapports}
chmod 750 "$RACINE"

# Un utilisateur dédié, SANS mot de passe et SANS shell de connexion utile :
# un pod RunPod n'a besoin que de lire. Si sa clé fuite, elle ne donne que la
# lecture de ce dossier — pas le serveur de voix, pas Docker, pas root.
if ! id restauration >/dev/null 2>&1; then
  useradd --system --create-home --shell /usr/sbin/nologin restauration
  echo "utilisateur « restauration » créé"
else
  echo "utilisateur « restauration » déjà là"
fi
# nologin empêche un shell mais rsync passe par une commande forcée : on
# remet donc un shell réel, et c'est la commande forcée dans authorized_keys
# qui restreint — pas le shell.
usermod --shell /bin/bash restauration
mkdir -p /home/restauration/.ssh
chmod 700 /home/restauration/.ssh
touch /home/restauration/.ssh/authorized_keys
chmod 600 /home/restauration/.ssh/authorized_keys
chown -R restauration:restauration /home/restauration/.ssh

# rrsync : le script livré avec rsync qui enferme un client dans un dossier,
# en lecture seule. C'est lui qui fait que la clé du pod ne peut RIEN écrire.
for c in /usr/share/rsync/scripts/rrsync /usr/share/doc/rsync/scripts/rrsync /usr/bin/rrsync; do
  [ -f "$c" ] && cp -f "$c" /usr/local/bin/rrsync && chmod +x /usr/local/bin/rrsync && break
done
if [ -x /usr/local/bin/rrsync ]; then echo "rrsync en place : /usr/local/bin/rrsync"
else echo "⚠ rrsync introuvable — apt-get install -y rsync, puis relancer ce script"; fi

# Lecture seule pour l'utilisateur de restauration.
chgrp -R restauration "$RACINE"
chmod -R g+rX,g-w "$RACINE"
echo
echo "── prêt ──"
ls -la "$RACINE"
DISTANT

echo
echo "── la clé du pod ──"
echo "Elle n'est PAS créée ici, et elle ne doit pas traîner sur le Mac non plus."
echo "Sur le Mac, une fois :"
echo "    ssh-keygen -t ed25519 -f ~/.ssh/khalam-restauration -N '' -C 'restauration-runpod'"
echo "    cat ~/.ssh/khalam-restauration.pub"
echo "Puis sur bia-voix, en remplaçant <CLÉ PUBLIQUE> par cette ligne :"
echo "    echo 'command=\"/usr/local/bin/rrsync -ro $RACINE\",restrict <CLÉ PUBLIQUE>' \\"
echo "      >> /home/restauration/.ssh/authorized_keys"
echo "Et la clé PRIVÉE va dans les secrets RunPod, encodée :"
echo "    base64 -i ~/.ssh/khalam-restauration | tr -d '\\n'   → secret BIA_SAUVEGARDE_CLE"
echo "Jamais dans bia-render : le dépôt est public."
