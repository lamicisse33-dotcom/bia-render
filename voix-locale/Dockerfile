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
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu \
 && pip install --no-cache-dir -r requirements.txt
COPY moteur.py serveur.py ./

# Un utilisateur sans droits, comme les Spaces l'exigent ; /data garde le
# modèle téléchargé d'un démarrage à l'autre quand un disque persistant existe.
RUN useradd -m -u 1000 bia && mkdir -p /data/hf && chown -R bia:bia /data /app
USER bia

EXPOSE 7860
CMD ["uvicorn", "serveur:app", "--host", "0.0.0.0", "--port", "7860"]
