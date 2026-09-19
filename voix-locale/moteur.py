# ── LE MOTEUR : DU TEXTE WOLOF VERS UN WAV, SANS RIEN PAYER ─────────────────
#
# 19 septembre 2026. Lamine, après avoir écouté : « c'est merveilleux, c'est
# parfait. » La voix : bilalfaye/speecht5_tts-wolof (licence MIT), avec une
# empreinte de voix de femme (slt ou clb, jeu cmu-arctic-xvectors). C'est la
# route vers BIA gratuite : ce moteur remplace Soynade pour le wolof, et son
# coût par phrase est zéro. Il tourne partout où Python tourne : sur le Mac,
# sur un Space Hugging Face, sur Render.
#
# Adapté de outils/wolof_local_tts.py (le labo de la soirée du 19), avec deux
# différences qui comptent pour BIA :
#   - la sortie est un WAV PCM 16 bits (pas float32) : c'est ce que lit
#     lib/mp3.ts pour l'alléger avant le téléphone ;
#   - les blocs et la pause entre eux sont gardés tels quels (SpeechT5 sature
#     vers 600 positions de texte, on coupe à 520).
#
# Un mode FACTICE (MOTEUR_FACTICE=1) rend un signal de test sans charger le
# modèle : il sert aux épreuves de BIA là où Hugging Face n'est pas joignable.

import io
import os
import re
import time
import wave

MODELE = "bilalfaye/speecht5_tts-wolof"
VOCODEUR = "microsoft/speecht5_hifigan"
EMPREINTES = "regisss/cmu-arctic-xvectors"
VOIX_FEMMES = {"slt": "cmu_us_slt_arctic", "clb": "cmu_us_clb_arctic"}
VOIX_PAR_DEFAUT = "slt"

MAX_TOKENS_PAR_BLOC = 520
PAUSE_ENTRE_BLOCS_SEC = 0.12
HZ = 16000


def vers_wav_16_bits(echantillons, hz=HZ) -> bytes:
    """Des flottants [-1, 1] vers un WAV PCM 16 bits mono, en mémoire."""
    import numpy as np
    a = np.asarray(echantillons, dtype="float32")
    a = np.clip(a, -1.0, 1.0)
    pcm = (a * 32767).astype("<i2")
    tampon = io.BytesIO()
    with wave.open(tampon, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(hz)
        w.writeframes(pcm.tobytes())
    return tampon.getvalue()


class MoteurFactice:
    """Un « la » de 440 Hz, aussi long que le texte le laisse deviner. Pour
    éprouver la plomberie sans le modèle. Jamais en production."""
    nom = "factice"

    def __init__(self, voice=VOIX_PAR_DEFAUT):
        self.voice = voice

    def synthetiser(self, texte: str) -> bytes:
        import numpy as np
        secondes = max(0.4, min(12.0, len(texte) / 14))
        t = np.arange(int(HZ * secondes)) / HZ
        onde = 0.25 * np.sin(2 * np.pi * 440 * t) * np.exp(-t / secondes)
        return vers_wav_16_bits(onde)


class MoteurWolof:
    nom = "wolof-local"

    def __init__(self, voice=VOIX_PAR_DEFAUT):
        import torch
        from datasets import load_dataset
        from transformers import SpeechT5ForTextToSpeech, SpeechT5HifiGan, SpeechT5Processor

        self.torch = torch
        self.voice = voice if voice in VOIX_FEMMES else VOIX_PAR_DEFAUT
        debut = time.time()
        self.processor = SpeechT5Processor.from_pretrained(MODELE)
        self.modele = SpeechT5ForTextToSpeech.from_pretrained(MODELE)
        self.vocoder = SpeechT5HifiGan.from_pretrained(VOCODEUR)
        self.modele.eval()
        self.vocoder.eval()

        prefixe = VOIX_FEMMES[self.voice]
        vecteur = None
        for ligne in load_dataset(EMPREINTES, split="validation"):
            if prefixe in ligne.get("filename", ""):
                vecteur = ligne["xvector"]
                break
        if vecteur is None:
            raise RuntimeError(f"empreinte vocale introuvable : {prefixe}")
        self.empreinte = torch.tensor(vecteur).unsqueeze(0)
        self.charge_en_s = round(time.time() - debut, 1)
        print(f"moteur wolof prêt en {self.charge_en_s} s — voix {self.voice}", flush=True)

    # ── le découpage, repris du labo ────────────────────────────────────────
    def nombre_tokens(self, texte: str) -> int:
        return int(self.processor.tokenizer(texte, return_tensors="pt")["input_ids"].shape[1])

    def decouper_phrase_longue(self, phrase: str):
        blocs, courant = [], []
        for mot in phrase.split():
            candidat = " ".join(courant + [mot])
            if courant and self.nombre_tokens(candidat) > MAX_TOKENS_PAR_BLOC:
                blocs.append(" ".join(courant))
                courant = [mot]
            else:
                courant.append(mot)
        if courant:
            blocs.append(" ".join(courant))
        return blocs

    def decouper(self, texte: str):
        texte = re.sub(r"\s+", " ", texte).strip()
        if self.nombre_tokens(texte) <= MAX_TOKENS_PAR_BLOC:
            return [texte]
        phrases = [p.strip() for p in re.split(r"(?<=[.!?;:])\s+", texte) if p.strip()]
        blocs, courant = [], ""
        for phrase in phrases:
            if self.nombre_tokens(phrase) > MAX_TOKENS_PAR_BLOC:
                if courant:
                    blocs.append(courant)
                    courant = ""
                blocs.extend(self.decouper_phrase_longue(phrase))
                continue
            candidat = f"{courant} {phrase}".strip()
            if courant and self.nombre_tokens(candidat) > MAX_TOKENS_PAR_BLOC:
                blocs.append(courant)
                courant = phrase
            else:
                courant = candidat
        if courant:
            blocs.append(courant)
        return blocs

    def synthetiser(self, texte: str) -> bytes:
        texte = texte.strip()
        if not texte:
            raise ValueError("texte vide")
        torch = self.torch
        morceaux = []
        blocs = self.decouper(texte)
        for i, bloc in enumerate(blocs, start=1):
            entrees = self.processor(text=bloc, return_tensors="pt")
            with torch.no_grad():
                audio = self.modele.generate_speech(entrees["input_ids"], self.empreinte, vocoder=self.vocoder)
            morceaux.append(audio.detach().cpu())
            if i < len(blocs):
                morceaux.append(torch.zeros(int(HZ * PAUSE_ENTRE_BLOCS_SEC), dtype=audio.dtype))
        return vers_wav_16_bits(torch.cat(morceaux).numpy())


def ouvrir_le_moteur(voice=VOIX_PAR_DEFAUT):
    if os.environ.get("MOTEUR_FACTICE") == "1":
        return MoteurFactice(voice)
    return MoteurWolof(voice)
