#!/bin/zsh
set -e

cd "$HOME/Documents/GitHub/bia-render"

echo "DYDY — démarrage de la voix wolof locale"

# Arrêter une ancienne instance du serveur local si elle existe.
OLD_PID="$(lsof -ti tcp:8765 2>/dev/null || true)"
if [ -n "$OLD_PID" ]; then
  echo "Ancienne instance trouvée sur le port 8765 — arrêt."
  kill $OLD_PID 2>/dev/null || true
  sleep 1
fi

# Vérifier les dépendances minimales.
python3 - <<'PY'
import importlib.util
mods = ["fastapi", "uvicorn", "torch", "transformers", "datasets", "scipy", "sentencepiece"]
missing = [m for m in mods if importlib.util.find_spec(m) is None]
if missing:
    raise SystemExit("Il manque : " + ", ".join(missing))
PY

# Lancer le moteur en arrière-plan.
nohup python3 outils/wolof_local_server.py > /tmp/dydy-wolof-local.log 2>&1 &
PID=$!
echo "Serveur lancé (PID $PID)."

# Attendre qu'il réponde.
for i in {1..60}; do
  if curl -fsS http://127.0.0.1:8765/health >/dev/null 2>&1; then
    echo "Moteur prêt."
    open http://127.0.0.1:8765
    echo "Interface ouverte dans le navigateur."
    echo "Journal : /tmp/dydy-wolof-local.log"
    exit 0
  fi
  sleep 1
done

echo "Le moteur n'a pas répondu dans le délai prévu."
echo "Dernières lignes du journal :"
tail -n 30 /tmp/dydy-wolof-local.log || true
exit 1
