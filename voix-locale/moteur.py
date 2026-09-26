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

# 26 septembre 2026 : Lamine signale que la voix lit le texte correctement
# puis continue en charabia au lieu de se taire. Cause — SpeechT5 décide
# lui-même de s'arrêter en comparant, à chaque pas, une probabilité de fin
# à SEUIL_ARRET ; sur un modèle affiné pour une langue peu dotée comme le
# wolof, cette probabilité dépasse rarement 0.5 (le défaut), et le moteur
# continue alors de fabriquer du son jusqu'au plafond de sécurité (par
# défaut 20 fois la longueur du texte). D'où le babillage après la phrase.
# Deux garde-fous : un seuil plus facile à franchir, et un plafond bien
# plus court pour qu'un babillage résiduel reste, au pire, très bref.
SEUIL_ARRET = 0.3
PLAFOND_LONGUEUR = 7.0


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
        self.empreinte_source = "factice"

    def synthetiser(self, texte: str) -> bytes:
        import numpy as np
        secondes = max(0.4, min(12.0, len(texte) / 14))
        t = np.arange(int(HZ * secondes)) / HZ
        onde = 0.25 * np.sin(2 * np.pi * 440 * t) * np.exp(-t / secondes)
        return vers_wav_16_bits(onde)


# ── L'EMPREINTE DE VOIX, PAR L'ESCALIER ───────────────────────────────────────
#
# 21 septembre 2026, avant de mettre le Space en ligne. La bibliothèque
# `datasets` n'accepte plus les jeux « à script » (vu le 19) ; le labo qui a
# produit la voix que Lamine a validée lisait le fichier .npy directement.
# On ne dépend donc d'aucune bibliothèque pour ça : trois marches, de la plus
# fidèle à la plus sûre, et /health dit laquelle a servi.
#   1. le jeu parquet regisss/cmu-arctic-xvectors (toutes les voix) ;
#   2. le fichier .npy de l'exemple officiel (Matthijs/…, voix slt) ;
#   3. jamais une empreinte tirée au sort en silence : on lève, et le Space
#      dit pourquoi — une voix inconnue en production serait pire qu'une
#      panne visible.
EMPREINTES_NPY = {
    "slt": "spkrec-xvect/cmu_us_slt_arctic-wav-arctic_a0508.npy",
    "clb": "spkrec-xvect/cmu_us_clb_arctic-wav-arctic_a0144.npy",
}


def charger_empreinte(voice):
    prefixe = VOIX_FEMMES[voice]
    motifs = []
    # 0. L'empreinte posée à côté du code. Ajoutée le 21 septembre 2026 après
    #    avoir fait tourner le moteur sur le Mac de Lamine : le paquet de
    #    référence qu'il avait validé le 20 septembre contenait déjà le
    #    speaker.npy de la voix slt. Deux kilo-octets. Les deux marches
    #    suivantes dépendent de Hugging Face au démarrage — c'est-à-dire
    #    qu'une panne chez eux, ou un réseau fermé, rendrait la voix muette
    #    sur une machine qui n'a besoin de personne. Plus maintenant.
    local = os.path.join(os.path.dirname(os.path.abspath(__file__)), "empreintes", f"{voice}.npy")
    if os.path.exists(local):
        try:
            import numpy as np
            v = np.load(local).astype("float32").reshape(-1)
            if v.size == 512:
                return v.tolist(), f"locale ({os.path.basename(local)})"
            motifs.append(f"{local} : {v.size} valeurs au lieu de 512")
        except Exception as e:  # noqa: BLE001 — on redescend d'une marche
            motifs.append(f"{local} : {str(e)[:120]}")
    try:
        from datasets import load_dataset
        for ligne in load_dataset(EMPREINTES, split="validation"):
            if prefixe in ligne.get("filename", ""):
                return list(ligne["xvector"]), f"{EMPREINTES} ({ligne.get('filename')})"
        motifs.append(f"{EMPREINTES} : aucune ligne pour {prefixe}")
    except Exception as e:  # noqa: BLE001 — on redescend d'une marche
        motifs.append(f"{EMPREINTES} : {str(e)[:120]}")
    try:
        import numpy as np
        from huggingface_hub import hf_hub_download
        chemin = hf_hub_download("Matthijs/cmu-arctic-xvectors", repo_type="dataset",
                                 filename=EMPREINTES_NPY[voice])
        return np.load(chemin).astype("float32").tolist(), f"Matthijs/cmu-arctic-xvectors ({EMPREINTES_NPY[voice]})"
    except Exception as e:  # noqa: BLE001
        motifs.append(f"Matthijs/cmu-arctic-xvectors : {str(e)[:120]}")
    raise RuntimeError("empreinte vocale introuvable — " + " ; ".join(motifs))


class MoteurWolof:
    nom = "wolof-local"

    def __init__(self, voice=VOIX_PAR_DEFAUT):
        import torch
        from transformers import SpeechT5ForTextToSpeech, SpeechT5HifiGan, SpeechT5Processor

        self.torch = torch
        self.voice = voice if voice in VOIX_FEMMES else VOIX_PAR_DEFAUT
        debut = time.time()
        self.processor = SpeechT5Processor.from_pretrained(MODELE)
        self.modele = SpeechT5ForTextToSpeech.from_pretrained(MODELE)
        self.vocoder = SpeechT5HifiGan.from_pretrained(VOCODEUR)
        self.modele.eval()
        self.vocoder.eval()

        vecteur, self.empreinte_source = charger_empreinte(self.voice)
        self.empreinte = torch.tensor(vecteur).unsqueeze(0).float()
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
                audio = self.modele.generate_speech(
                    entrees["input_ids"], self.empreinte, vocoder=self.vocoder,
                    threshold=SEUIL_ARRET, maxlenratio=PLAFOND_LONGUEUR,
                )
            morceaux.append(audio.detach().cpu())
            if i < len(blocs):
                morceaux.append(torch.zeros(int(HZ * PAUSE_ENTRE_BLOCS_SEC), dtype=audio.dtype))
        return vers_wav_16_bits(torch.cat(morceaux).numpy())


def ouvrir_le_moteur(voice=VOIX_PAR_DEFAUT):
    if os.environ.get("MOTEUR_FACTICE") == "1":
        return MoteurFactice(voice)
    return MoteurWolof(voice)
