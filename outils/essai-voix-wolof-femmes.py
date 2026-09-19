# ── TEST DE VOIX FÉMININES WOLOF EN LOCAL ────────────────────────────────────
#
# Objectif :
#   garder la prononciation wolof validée avec bilalfaye/speecht5_tts-wolof,
#   mais comparer deux empreintes vocales féminines.
#
# Installation (si nécessaire) :
#   pip3 install torch transformers datasets scipy sentencepiece
#
# Exécution depuis bia-render :
#   python3 outils/essai-voix-wolof-femmes.py
#
# Sortie :
#   outils/essai-voix-femmes/slt/*.wav
#   outils/essai-voix-femmes/clb/*.wav
#
# Les deux voix sont des locutrices du corpus CMU ARCTIC :
#   slt = US female
#   clb = US female
#
# Important :
#   le modèle linguistique wolof ne change pas. Seule l'empreinte de voix
#   change, afin de préserver la prononciation déjà validée.

import time
from pathlib import Path

MODELE = "bilalfaye/speecht5_tts-wolof"
XVECS = "regisss/cmu-arctic-xvectors"

PHRASES = {
    "salut": "Salut, maa ngi ci jàmm. Lan laa mëna defal tey pour yaw ?",
    "merci": "Amul solo. Maa ngi fi.",
    "au-revoir": "Ba beneen yoon. Dinala xaar.",
    "wolof": "Waaw, dégg naa la bu baax. Maa ngi wax wolof bu leer.",
}

VOIX_FEMMES = {
    "slt": "cmu_us_slt_arctic",
    "clb": "cmu_us_clb_arctic",
}


def trouver_xvector(dataset, prefixe):
    for ligne in dataset:
        nom = ligne.get("filename", "")
        if prefixe in nom:
            return ligne["xvector"], nom
    raise RuntimeError(f"Aucune empreinte trouvée pour {prefixe}")


def main():
    import torch
    import scipy.io.wavfile as wav
    from datasets import load_dataset
    from transformers import (
        SpeechT5Processor,
        SpeechT5ForTextToSpeech,
        SpeechT5HifiGan,
    )

    debut = time.time()

    processor = SpeechT5Processor.from_pretrained(MODELE)
    modele = SpeechT5ForTextToSpeech.from_pretrained(MODELE)
    vocoder = SpeechT5HifiGan.from_pretrained("microsoft/speecht5_hifigan")
    empreintes = load_dataset(XVECS, split="validation")

    print(f"Modèles chargés en {time.time() - debut:.1f} s")

    dossier_racine = Path(__file__).parent / "essai-voix-femmes"
    dossier_racine.mkdir(exist_ok=True)

    for nom_voix, prefixe in VOIX_FEMMES.items():
        vecteur, fichier_source = trouver_xvector(empreintes, prefixe)
        voix = torch.tensor(vecteur).unsqueeze(0)

        print(f"\n=== VOIX {nom_voix.upper()} ===")
        print(f"Empreinte : {fichier_source}")

        dossier = dossier_racine / nom_voix
        dossier.mkdir(exist_ok=True)

        for nom, texte in PHRASES.items():
            t = time.time()
            entrees = processor(text=texte, return_tensors="pt")
            inconnus = int(
                (entrees["input_ids"] == processor.tokenizer.unk_token_id).sum()
            )

            with torch.no_grad():
                audio = modele.generate_speech(
                    entrees["input_ids"],
                    voix,
                    vocoder=vocoder,
                )

            chemin = dossier / f"{nom}.wav"
            wav.write(chemin, rate=16000, data=audio.numpy())
            duree = len(audio) / 16000

            detail_inconnus = (
                f", {inconnus} token(s) inconnu(s)"
                if inconnus
                else ""
            )

            print(
                f"{nom:10s} {duree:4.1f} s, générée en "
                f"{time.time() - t:.2f} s{detail_inconnus} → {chemin}"
            )

    print("\nTest terminé.")
    print("Écoute les deux dossiers :")
    print("  outils/essai-voix-femmes/slt")
    print("  outils/essai-voix-femmes/clb")
    print("\nChoisis uniquement le timbre le plus agréable.")
    print("La prononciation wolof reste celle du modèle déjà validé.")


if __name__ == "__main__":
    main()
