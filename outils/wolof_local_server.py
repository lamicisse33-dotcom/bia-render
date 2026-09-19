from pathlib import Path
from threading import Lock
import tempfile

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from wolof_local_tts import WolofLocalTTS

app = FastAPI()

moteurs = {}
verrou = Lock()

class Demande(BaseModel):
    text: str
    voice: str = "slt"

def moteur(voice):
    if voice not in ("slt", "clb"):
        voice = "slt"

    with verrou:
        if voice not in moteurs:
            moteurs[voice] = WolofLocalTTS(voice=voice)

    return moteurs[voice]

@app.get("/health")
def health():
    return {
        "ok": True,
        "local": True,
        "voices": ["slt", "clb"]
    }

@app.post("/speak")
def speak(d: Demande):
    texte = d.text.strip()

    if not texte:
        raise HTTPException(
            status_code=400,
            detail="texte vide"
        )

    chemin = Path(
        tempfile.gettempdir()
    ) / "dydy-wolof-local.wav"

    moteur(d.voice).synthesize(
        texte,
        chemin
    )

    return FileResponse(
        str(chemin),
        media_type="audio/wav",
        filename="wolof.wav"
    )

if __name__ == "__main__":
    import uvicorn

    print()
    print("WOLOF LOCAL TTS")
    print("http://127.0.0.1:8765")
    print()

    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8765
    )
