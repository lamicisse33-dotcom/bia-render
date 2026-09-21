#!/usr/bin/env bash
# ── INSTALLER LA VOIX DE BIA SUR UN SERVEUR UBUNTU NEUF ──────────────────────
#
# À lancer UNE fois, en root, sur la machine (Ubuntu 24.04, ARM ou x86) :
#
#   curl -fsSL https://raw.githubusercontent.com/lamicisse33-dotcom/bia-render/main/voix-locale/serveur/installer.sh | bash
#
# Il demande deux choses au clavier : le domaine (voix.khalam.app) et la clé
# partagée avec Render (VOIX_LOCALE_CLE) — tapée ici, jamais ailleurs. Puis :
# Docker, le pare-feu, le code, la construction de l'image, le premier
# téléchargement du modèle, et il attend « pret » avant de rendre la main.
#
# Relancer le même script met à jour (git pull + rebuild) sans rien redemander
# si .env existe déjà.

set -euo pipefail
DEPOT="https://github.com/lamicisse33-dotcom/bia-render.git"
RACINE="/opt/bia-voix"
ENV="$RACINE/voix-locale/serveur/.env"

echo "── BIA — installation de la voix wolof ──────────────────────────────"
if [ "$(id -u)" -ne 0 ]; then echo "à lancer en root (ssh root@…)"; exit 1; fi

# 1. Docker (dépôt officiel), une seule fois.
if ! command -v docker >/dev/null 2>&1; then
  echo "→ Docker"
  apt-get update -qq
  apt-get install -y -qq ca-certificates curl git ufw >/dev/null
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin >/dev/null
else
  apt-get install -y -qq git ufw >/dev/null 2>&1 || true
fi

# 2. Le pare-feu : SSH, HTTP, HTTPS, rien d'autre. 7860 ne sort jamais.
ufw allow OpenSSH >/dev/null; ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null

# 3. Le code.
if [ -d "$RACINE/.git" ]; then
  echo "→ mise à jour du code"; git -C "$RACINE" pull -q
else
  echo "→ le code"; git clone -q --depth 1 "$DEPOT" "$RACINE"
fi

# 4. Les deux réglages, une seule fois.
if [ ! -f "$ENV" ]; then
  read -rp "Domaine de la voix (ex. voix.khalam.app) : " DOMAINE
  while :; do
    read -rsp "Clé partagée VOIX_LOCALE_CLE (30 signes ou plus, la même que dans Render) : " CLE; echo
    [ "${#CLE}" -ge 30 ] && break
    echo "   trop courte — 30 signes au moins."
  done
  umask 077
  printf 'DOMAINE=%s\nVOIX_LOCALE_CLE=%s\nVOIX_LOCALE_VOIX=slt\n' "$DOMAINE" "$CLE" > "$ENV"
  echo "→ réglages écrits dans $ENV (lisible par root seulement)"
fi

# 5. Construire et lancer.
cd "$RACINE/voix-locale/serveur"
echo "→ construction de l'image (5 à 10 minutes la première fois)"
docker compose build -q
docker compose up -d
echo "→ premier chargement du modèle (le téléchargement prend 1 à 3 minutes)"
for i in $(seq 1 60); do
  if docker compose exec -T voix python -c "import urllib.request,sys; d=urllib.request.urlopen('http://127.0.0.1:7860/health',timeout=5).read(); sys.exit(0 if b'\"pret\":true' in d.replace(b' ',b'') else 1)" 2>/dev/null; then
    echo; echo "✓ la voix est prête."
    docker compose exec -T voix python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:7860/health',timeout=5).read().decode())"
    . "$ENV"
    echo
    echo "Depuis n'importe où, une fois le DNS en place :  https://$DOMAINE/health"
    echo "Côté Render : VOIX_LOCALE_URL=https://$DOMAINE   VOIX_LOCALE_CLE=(la même)   VOIX_LOCALE_VOIX=slt"
    exit 0
  fi
  sleep 5; printf '.'
done
echo; echo "✗ la voix n'est pas prête après 5 minutes. Journal :"
docker compose logs --tail=40 voix
exit 1
