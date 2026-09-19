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

            with torch.no_grad():
                audio = modele.generate_speech(
                    entrees["input_ids"],
                    voix,
                    vocoder=vocoder,
                )

            chemin = dossier / f"{nom}.wav"
            wav.write(chemin, rate=16000, data=audio.numpy())
            duree = len(audio) / 16000

            print(
                f"{nom:10s} {duree:4.1f} s, générée en "
                f"{time.time() - t:.2f} s → {chemin}"
            )

    print("\nTest terminé.")
    print("Écoute :")
    print("  outils/essai-voix-femmes/slt")
    print("  outils/essai-voix-femmes/clb")

if __name__ == "__main__":
    main()
