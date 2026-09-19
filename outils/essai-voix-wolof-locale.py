# ── UNE VOIX WOLOF LIBRE, À L'ÉCOUTE, SANS RIEN PAYER ───────────────────────
#
# 19 septembre 2026. Le modèle wolof de Meta (mms-tts-wol) n'existe pas sur
# Hugging Face — vérifié par un curl anonyme : 401. À la place, du wolof
# fait à Dakar :
#
#   bilalfaye/speecht5_tts-wolof   — voix prête, licence MIT (commercial OK),
#                                    entraînée sur galsenai/wolof_tts
#                                    (40 000 phrases, 141 locuteurs).
#
# Si sa prononciation est bonne, c'est un point de départ pour une voix
# locale dans le téléphone. Le grain, lui, se changera plus tard avec le
# corpus galsenai/anta_women_tts (une femme, ~19 900 phrases, CC-BY-4.0)
# ou la voix de Kha.
#
# Sur le Mac de Lamine, dans le Terminal. Une fois pour installer :
#
#     pip3 install torch transformers datasets scipy sentencepiece
#
# puis, depuis le dossier bia-render :
#
#     python3 outils/essai-voix-wolof-locale.py
#
# Trois wav dans outils/essai-mms/ et le temps de fabrication de chacun.
# Les phrases sont celles du répertoire, écrites par Lamine.

import time
from pathlib import Path

PHRASES = {
    "salut": "Salut, maa ngi ci jàmm. Lan laa mëna defal tey pour yaw ?",
    "merci": "Amul solo. Maa ngi fi.",
    "au-revoir": "Ba beneen yoon. Dinala xaar.",
}
MODELE = "bilalfaye/speecht5_tts-wolof"

def main():
    import torch
    from transformers import SpeechT5Processor, SpeechT5ForTextToSpeech, SpeechT5HifiGan
    from datasets import load_dataset
    import scipy.io.wavfile as wav

    depuis = time.time()
    processor = SpeechT5Processor.from_pretrained(MODELE, token=False)
    modele = SpeechT5ForTextToSpeech.from_pretrained(MODELE, token=False)
    vocoder = SpeechT5HifiGan.from_pretrained("microsoft/speecht5_hifigan", token=False)
    # SpeechT5 a besoin d'une « empreinte de voix ». On prend celle de
    # l'exemple officiel ; le modèle wolof choisira quand même son accent.
    empreintes = load_dataset("Matthijs/cmu-arctic-xvectors", split="validation", token=False)
    voix = torch.tensor(empreintes[7306]["xvector"]).unsqueeze(0)
    print(f"modèle chargé en {time.time() - depuis:.1f} s")

    dossier = Path(__file__).parent / "essai-mms"
    dossier.mkdir(exist_ok=True)
    for nom, texte in PHRASES.items():
        t = time.time()
        entrees = processor(text=texte, return_tensors="pt")
        inconnus = int((entrees["input_ids"] == processor.tokenizer.unk_token_id).sum())
        with torch.no_grad():
            audio = modele.generate_speech(entrees["input_ids"], voix, vocoder=vocoder)
        chemin = dossier / f"{nom}.wav"
        wav.write(chemin, rate=16000, data=audio.numpy())
        duree = len(audio) / 16000
        print(f"{nom:10s} {duree:4.1f} s de voix, fabriquée en {time.time() - t:.2f} s"
              f"{f', {inconnus} lettre(s) inconnue(s) du modèle' if inconnus else ''} → {chemin}")

    print("\nÀ écouter dans", dossier)
    print("Ce qui compte : la prononciation des mots wolof (jàmm, mëna, beneen, xaar),")
    print("pas le grain de la voix — le grain, on le changera après.")

if __name__ == "__main__":
    main()
