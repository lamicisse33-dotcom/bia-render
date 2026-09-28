# La voix wolof locale de BIA — image pour un Space Hugging Face (Docker)
# ou pour Render. CPU seulement : pas de carte graphique nécessaire.
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    HF_HOME=/data/hf \
    TRANSFORMERS_CACHE=/data/hf \
    VOIX_LOCALE_VOIX=slt

WORKDIR /app
COPY requirements.txt .
# torch en version processeur : dix fois plus léger que la version graphique.
# Sur ARM (Hetzner CAX, Oracle A1) l'index « cpu » de PyTorch n'a pas toujours
# la roue : on retombe alors sur l'index ordinaire, qui l'a.
RUN (pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu \
     || pip install --no-cache-dir torch) \
 && pip install --no-cache-dir -r requirements.txt
COPY moteur.py serveur.py ./
# L'empreinte de voix, 2 Ko, posée à côté du code : la voix démarre sans
# demander quoi que ce soit à Hugging Face.
COPY empreintes ./empreintes

# 26 septembre 2026 : la voix française, gratuite elle aussi. Piper (licence
# MIT, la dernière version d'avant que Home Assistant ne la passe sous GPL),
# en sous-processus — voir moteur.py pour le pourquoi. Voix fr_FR-siwis-medium
# (CC-BY 4.0 : usage commercial permis, créditer le corpus SIWIS quelque part).
RUN apt-get update && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /app/piper \
 && curl -sL https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_x86_64.tar.gz \
    | tar xz -C /app/piper --strip-components=1 \
 && curl -sL https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx \
    -o /app/piper/fr_FR-siwis-medium.onnx \
 && curl -sL https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx.json \
    -o /app/piper/fr_FR-siwis-medium.onnx.json \
 && chmod +x /app/piper/piper

# Un utilisateur sans droits, comme les Spaces l'exigent ; /data garde le
# modèle téléchargé d'un démarrage à l'autre quand un disque persistant existe.
RUN useradd -m -u 1000 bia && mkdir -p /data/hf && chown -R bia:bia /data /app
USER bia

EXPOSE 7860
CMD ["uvicorn", "serveur:app", "--host", "0.0.0.0", "--port", "7860"]
