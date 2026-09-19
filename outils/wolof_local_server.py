#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Petit serveur LOCAL de synthèse wolof pour les tests d'intégration.

But :
- garder SpeechT5 chargé en mémoire ;
- recevoir un texte depuis l'application ;
- renvoyer un WAV ;
- aucune API vocale externe ;
- étape intermédiaire avant l'embarquement natif iPhone.

Installation :
    pip3 install fastapi uvicorn torch transformers datasets scipy sentencepiece

Lancement :
    python3 outils/wolof_local_server.py

Test :
    curl -X POST http://127.0.0.1:8765/speak \
      -H "Content-Type: application/json" \
      -d '{"text":"Waaw, dégg naa la bu baax.","voice":"slt"}' \
      --output /tmp/wolof.wav
"""

from __future__ import annotations

import tempfile
from pathlib import Path
from threading import Lock

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from wolof_local_tts import WolofLocalTTS

app = FastAPI(title="Wolof Local TTS", version="0.1")

_engines = {}
_lock = Lock()


class SpeakRequest(BaseModel):
    text: str
    voice: str = "slt"


def get_engine(voice: str) -> WolofLocalTTS:
    if voice not in {"slt", "clb"}:
        raise HTTPException(status_code=400, detail="voice doit être slt ou clb")

    with _lock:
        if voice not in _engines:
            _engines[voice] = WolofLocalTTS(voice=voice)
        return _engines[voice]


@app.get("/health")
def health():
    return {
        "ok": True,
        "engine": "bilalfaye/speecht5_tts-wolof",
        "voices": ["slt", "clb"],
        "local_tts": True,
    }


@app.post("/speak")
def speak(req: SpeakRequest):
    text = req.text.strip()

    if not text:
        raise HTTPException(status_code=400, detail="texte vide")

    if len(text) > 1000:
        raise HTTPException(status_code=400, detail="texte trop long pour ce test")

    engine = get_engine(req.voice)

    tmp = Path(tempfile.gettempdir()) / "dydy-wolof-local.wav"
    engine.synthesize(text, tmp)

    return FileResponse(
        path=str(tmp),
        media_type="audio/wav",
        filename="wolof.wav",
    )


if __name__ == "__main__":
    import uvicorn

    print("Wolof Local TTS disponible sur http://127.0.0.1:8765")
    print("Aucune API vocale distante n'est utilisée pour la synthèse.")
    uvicorn.run(app, host="127.0.0.1", port=8765)
