#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Wolof Local TTS — serveur local autonome.

But :
- garder SpeechT5 chargé en mémoire ;
- recevoir du texte et renvoyer un WAV ;
- aucune API vocale externe ;
- servir aussi une petite interface web locale, sans Next.js ;
- préparer l'intégration ultérieure dans DYDY/iPhone.

Installation :
    pip3 install fastapi uvicorn torch transformers datasets scipy sentencepiece

Lancement :
    python3 outils/wolof_local_server.py

Puis ouvrir :
    http://127.0.0.1:8765
"""

from __future__ import annotations

import tempfile
import time
from pathlib import Path
from threading import Lock

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel

from wolof_local_tts import WolofLocalTTS

app = FastAPI(title="Wolof Local TTS", version="0.2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:8765",
        "http://localhost:8765",
        "http://127.0.0.1:3000",
        "http://localhost:3000",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

_engines: dict[str, WolofLocalTTS] = {}
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


@app.on_event("startup")
def preload_default_voice() -> None:
    # On charge la voix SLT dès le démarrage pour éviter 7-8 s d'attente
    # au premier clic. Si le cache n'est pas encore prêt, le serveur reste
    # quand même disponible et réessaiera au premier appel.
    try:
        get_engine("slt")
    except Exception as exc:
        print(f"Préchargement SLT non terminé : {exc}")


@app.get("/", response_class=HTMLResponse)
def home() -> str:
    return """<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>DYDY — Wolof Local</title>
<style>
:root{color-scheme:dark}
body{margin:0;background:#050505;color:#f5f5f5;font-family:system-ui,-apple-system,sans-serif}
main{max-width:820px;margin:auto;padding:32px 20px}
h1{font-size:30px;margin:0 0 8px}
p{line-height:1.5}
.note{opacity:.72}
textarea{width:100%;box-sizing:border-box;min-height:220px;padding:16px;border-radius:16px;border:1px solid #444;background:#111;color:#fff;font-size:19px;line-height:1.5;resize:vertical}
.controls{display:flex;gap:12px;flex-wrap:wrap;margin-top:16px;align-items:center}
button,select{font:inherit;padding:11px 16px;border-radius:999px}
button{border:0;font-weight:700;cursor:pointer}
button:disabled{opacity:.5;cursor:wait}
select{background:#111;color:white;border:1px solid #555}
#etat{margin-top:18px;min-height:26px}
.good{color:#8fe388}.bad{color:#ff8f8f}
</style>
</head>
<body>
<main>
  <h1>DYDY — Wolof Local</h1>
  <p class="note">Synthèse vocale wolof locale. Aucune API vocale distante.</p>
  <textarea id="texte">Waaw, dégg naa la bu baax. Maa ngi fi pour dimbali la.</textarea>
  <div class="controls">
    <select id="voice">
      <option value="slt">Voix SLT</option>
      <option value="clb">Voix CLB</option>
    </select>
    <button id="lire">▶ Lire en wolof</button>
    <button id="verifier">Vérifier le moteur</button>
  </div>
  <p id="etat">Vérification du moteur…</p>
</main>
<script>
const texte = document.getElementById('texte');
const voice = document.getElementById('voice');
const lire = document.getElementById('lire');
const verifier = document.getElementById('verifier');
const etat = document.getElementById('etat');
let audio = null;
let url = null;

function message(t, ok=null){
  etat.textContent = t;
  etat.className = ok === true ? 'good' : ok === false ? 'bad' : '';
}

async function check(){
  try{
    const r = await fetch('/health', {cache:'no-store'});
    const d = await r.json();
    if(!r.ok || !d.ok) throw new Error(d.erreur || 'indisponible');
    message('✅ Moteur wolof local prêt', true);
  }catch(e){
    message('❌ Moteur local indisponible : ' + e.message, false);
  }
}

async function speak(){
  const text = texte.value.trim();
  if(!text) return;
  lire.disabled = true;
  message('Fabrication locale de la voix…');
  const t0 = performance.now();

  try{
    const r = await fetch('/speak', {
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({text, voice:voice.value})
    });

    if(!r.ok){
      const d = await r.json().catch(()=>({}));
      throw new Error(d.detail || d.erreur || 'échec de la synthèse');
    }

    const blob = await r.blob();
    if(url) URL.revokeObjectURL(url);
    url = URL.createObjectURL(blob);

    if(audio) audio.pause();
    audio = new Audio(url);
    const sec = ((performance.now()-t0)/1000).toFixed(2);
    message('✅ Audio local reçu en ' + sec + ' s — lecture…', true);
    audio.onended = ()=>message('✅ Lecture terminée', true);
    await audio.play();
  }catch(e){
    message('❌ ' + e.message, false);
  }finally{
    lire.disabled = false;
  }
}

verifier.addEventListener('click', check);
lire.addEventListener('click', speak);
check();
</script>
</body>
</html>"""


@app.get("/health")
def health():
    return {
        "ok": True,
        "engine": "bilalfaye/speecht5_tts-wolof",
        "voices": ["slt", "clb"],
        "loaded_voices": sorted(_engines.keys()),
        "local_tts": True,
    }


@app.post("/speak")
def speak(req: SpeakRequest):
    text = req.text.strip()

    if not text:
        raise HTTPException(status_code=400, detail="texte vide")

    # Le moteur découpe lui-même les longs textes en blocs SpeechT5.
    if len(text) > 10000:
        raise HTTPException(status_code=400, detail="texte trop long pour ce test")

    started = time.time()
    engine = get_engine(req.voice)

    tmp = Path(tempfile.gettempdir()) / f"dydy-wolof-local-{req.voice}.wav"
    engine.synthesize(text, tmp)

    print(
        f"/speak voice={req.voice} chars={len(text)} "
        f"total={time.time() - started:.2f}s"
    )

    return FileResponse(
        path=str(tmp),
        media_type="audio/wav",
        filename="wolof.wav",
        headers={"X-Wolof-Local": "1"},
    )


if __name__ == "__main__":
    import uvicorn

    print()
    print("DYDY — WOLOF LOCAL TTS")
    print("Interface : http://127.0.0.1:8765")
    print("Aucune API vocale distante n'est utilisée pour la synthèse.")
    print()

    uvicorn.run(app, host="127.0.0.1", port=8765)
