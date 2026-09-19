# ── LA VOIX WOLOF DE META (MMS), À L'ÉCOUTE, SANS RIEN PAYER ─────────────────
#
# 19 septembre 2026. Avant d'enregistrer des heures de voix pour entraîner
# un modèle à nous, on écoute ce qui existe déjà : MMS-TTS de Meta a un
# modèle wolof (« wol »). S'il est bon, c'est un point de départ ; s'il est
# mauvais, on le sait en une heure et on n'a rien perdu.
#
# Ce script tourne sur le Mac de Lamine (Hugging Face n'est pas joignable
# depuis l'espace de Claude). Dans le Terminal, une fois pour installer :
#
#     pip3 install torch transformers scipy
#
# puis, depuis le dossier bia-render :
#
#     python3 outils/essai-mms-wolof.py
#
# Il écrit trois fichiers wav dans outils/essai-mms/ — un par phrase — et
# affiche le temps de fabrication de chacune. Le modèle (≈ 150 Mo) se
# télécharge une fois, au premier lancement.
#
# Les phrases sont celles du répertoire (lib/repertoire-textes.ts), écrites
# par Lamine. Rien ici n'est du wolof de la main de Claude.

import os, time
from pathlib import Path

PHRASES = {
    "salut": "Salut, maa ngi ci jàmm. Lan laa mëna defal tey pour yaw ?",
    "merci": "Amul solo. Maa ngi fi.",
    "au-revoir": "Ba beneen yoon. Dinala xaar.",
}

def main():
    import torch
    from transformers import VitsModel, AutoTokenizer
    import scipy.io.wavfile as wav

    depuis = time.time()
    modele = VitsModel.from_pretrained("facebook/mms-tts-wol")
    tokenizer = AutoTokenizer.from_pretrained("facebook/mms-tts-wol")
    print(f"modèle chargé en {time.time() - depuis:.1f} s")

    dossier = Path(__file__).parent / "essai-mms"
    dossier.mkdir(exist_ok=True)
    for nom, texte in PHRASES.items():
        t = time.time()
        entrees = tokenizer(texte, return_tensors="pt")
        with torch.no_grad():
            sortie = modele(**entrees).waveform
        audio = sortie[0].numpy()
        chemin = dossier / f"{nom}.wav"
        wav.write(chemin, rate=modele.config.sampling_rate, data=audio)
        duree = len(audio) / modele.config.sampling_rate
        print(f"{nom:10s} {duree:4.1f} s de voix, fabriquée en {time.time() - t:.2f} s → {chemin}")

    print("\nÀ écouter dans", dossier)
    print("Ce qui compte : la prononciation des mots wolof (jàmm, mëna, beneen, xaar),")
    print("pas le grain de la voix — le grain, on le changera avec la voix de Kha.")

if __name__ == "__main__":
    main()
