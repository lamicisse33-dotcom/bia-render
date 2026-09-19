# ── LE SERVEUR DE LA VOIX LOCALE ─────────────────────────────────────────────
#
# Une porte, deux questions :
#
#   GET  /health           → { ok, moteur, voix, pret, charge_en_s }
#   POST /speak            → un WAV PCM 16 bits, 16 kHz, mono
#        { "text": "...", "voice": "slt" | "clb" }
#        en-tête  Authorization: Bearer <VOIX_LOCALE_CLE>   (si la clé est posée)
#
# Le moteur est chargé AU DÉMARRAGE, pas à la première demande : sur un
# Space ou sur Render, la première personne ne doit pas attendre les trente
# secondes du chargement. Un seul verrou : le modèle n'est pas fait pour
# deux phrases à la fois sur un même processeur, et deux demandes en même
# temps se servent l'une après l'autre.
#
# Ce que BIA lit dans la réponse : le corps (le wav), et l'en-tête
# X-Fabrication-Ms (le temps de fabrication, pour /api/etat).
#
# Lancer :   uvicorn serveur:app --host 0.0.0.0 --port 7860
# Variables : VOIX_LOCALE_VOIX (slt|clb), VOIX_LOCALE_CLE (secret partagé
#             avec BIA), MOTEUR_FACTICE=1 (pour les épreuves seulement).

import os
import time
from threading import Lock

from fastapi import FastAPI, Header, HTTPException, Response
from pydantic import BaseModel

from moteur import VOIX_FEMMES, VOIX_PAR_DEFAUT, ouvrir_le_moteur

VOIX_DU_SERVEUR = os.environ.get("VOIX_LOCALE_VOIX", VOIX_PAR_DEFAUT)
CLE = os.environ.get("VOIX_LOCALE_CLE", "")

app = FastAPI(title="BIA — voix wolof locale")
moteurs = {}
verrou = Lock()
demandes = 0
fabrication_ms_total = 0


def moteur(voice: str):
    voice = voice if voice in VOIX_FEMMES else VOIX_DU_SERVEUR
    with verrou:
        if voice not in moteurs:
            moteurs[voice] = ouvrir_le_moteur(voice)
        return moteurs[voice]


@app.on_event("startup")
def prechauffer():
    moteur(VOIX_DU_SERVEUR)


class Demande(BaseModel):
    text: str
    voice: str = VOIX_DU_SERVEUR


def verifier_la_cle(authorization: str | None):
    if not CLE:
        return
    if authorization != f"Bearer {CLE}":
        raise HTTPException(status_code=401, detail="clé absente ou fausse")


@app.get("/health")
def health():
    m = moteurs.get(VOIX_DU_SERVEUR)
    return {
        "ok": True,
        "moteur": getattr(m, "nom", "en cours de chargement"),
        "voix": VOIX_DU_SERVEUR,
        "voix_possibles": list(VOIX_FEMMES),
        "pret": m is not None,
        "charge_en_s": getattr(m, "charge_en_s", None),
        "demandes": demandes,
        "fabrication_ms_moyen": round(fabrication_ms_total / demandes) if demandes else None,
        "cle_exigee": bool(CLE),
    }


@app.post("/speak")
def speak(d: Demande, authorization: str | None = Header(default=None)):
    global demandes, fabrication_ms_total
    verifier_la_cle(authorization)
    texte = d.text.strip()
    if not texte:
        raise HTTPException(status_code=400, detail="texte vide")
    if len(texte) > 2000:
        raise HTTPException(status_code=413, detail="texte trop long (2000 signes au plus)")
    m = moteur(d.voice)
    debut = time.time()
    with verrou:
        wav = m.synthetiser(texte)
    ms = int((time.time() - debut) * 1000)
    demandes += 1
    fabrication_ms_total += ms
    return Response(
        content=wav,
        media_type="audio/wav",
        headers={"X-Fabrication-Ms": str(ms), "X-Moteur": f"{m.nom} ({m.voice})", "Cache-Control": "no-store"},
    )
