#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Moteur TTS wolof local réutilisable.

Objectif :
- aucune API distante pour la synthèse ;
- aucun coût par phrase ;
- même modèle wolof déjà validé ;
- choix d'une empreinte vocale féminine ;
- mode interactif pour garder les modèles chargés en mémoire.

Première utilisation :
    pip3 install torch transformers datasets scipy sentencepiece

Exemples :
    python3 outils/wolof_local_tts.py "Waaw, dégg naa la bu baax." --play
    python3 outils/wolof_local_tts.py --interactive --play
    python3 outils/wolof_local_tts.py "Nanga def ?" --voice clb -o /tmp/test.wav
    python3 outils/wolof_local_tts.py "Jërëjëf" --offline --play

Important :
Le modèle doit avoir été téléchargé au moins une fois avant d'utiliser --offline.
"""

from __future__ import annotations

import argparse
import subprocess
import time
from pathlib import Path
from typing import Optional

MODELE = "bilalfaye/speecht5_tts-wolof"
VOCODEUR = "microsoft/speecht5_hifigan"
XVECS = "regisss/cmu-arctic-xvectors"

VOIX_FEMMES = {
    "slt": "cmu_us_slt_arctic",
    "clb": "cmu_us_clb_arctic",
}


class WolofLocalTTS:
    def __init__(self, voice: str = "slt", offline: bool = False):
        if voice not in VOIX_FEMMES:
            raise ValueError(
                f"Voix inconnue: {voice}. Choix: {', '.join(VOIX_FEMMES)}"
            )

        import torch
        from datasets import load_dataset
        from transformers import (
            SpeechT5ForTextToSpeech,
            SpeechT5HifiGan,
            SpeechT5Processor,
        )

        self.torch = torch
        self.voice_name = voice
        self.offline = offline

        debut = time.time()

        kwargs = {"local_files_only": True} if offline else {}

        self.processor = SpeechT5Processor.from_pretrained(MODELE, **kwargs)
        self.modele = SpeechT5ForTextToSpeech.from_pretrained(MODELE, **kwargs)
        self.vocoder = SpeechT5HifiGan.from_pretrained(VOCODEUR, **kwargs)

        # Le dataset d'empreintes est léger. En mode hors ligne il doit déjà
        # être présent dans le cache Hugging Face.
        if offline:
            try:
                empreintes = load_dataset(
                    XVECS,
                    split="validation",
                    download_mode="reuse_dataset_if_exists",
                )
            except Exception as exc:
                raise RuntimeError(
                    "Le cache local des x-vectors n'est pas disponible. "
                    "Lance une fois sans --offline."
                ) from exc
        else:
            empreintes = load_dataset(XVECS, split="validation")

        prefixe = VOIX_FEMMES[voice]
        vecteur = None
        source = None

        for ligne in empreintes:
            nom = ligne.get("filename", "")
            if prefixe in nom:
                vecteur = ligne["xvector"]
                source = nom
                break

        if vecteur is None:
            raise RuntimeError(f"Aucune empreinte trouvée pour {prefixe}")

        self.voix = torch.tensor(vecteur).unsqueeze(0)

        print(
            f"Moteur wolof prêt en {time.time() - debut:.1f} s "
            f"(voix {voice.upper()}, empreinte {source})"
        )

    def synthesize(self, text: str, output_path: Path) -> Path:
        import scipy.io.wavfile as wav

        texte = text.strip()
        if not texte:
            raise ValueError("Le texte est vide.")

        t = time.time()
        entrees = self.processor(text=texte, return_tensors="pt")
        inconnus = int(
            (
                entrees["input_ids"]
                == self.processor.tokenizer.unk_token_id
            ).sum()
        )

        with self.torch.no_grad():
            audio = self.modele.generate_speech(
                entrees["input_ids"],
                self.voix,
                vocoder=self.vocoder,
            )

        output_path.parent.mkdir(parents=True, exist_ok=True)
        wav.write(output_path, rate=16000, data=audio.numpy())

        duree = len(audio) / 16000
        details = (
            f", {inconnus} token(s) inconnu(s)"
            if inconnus
            else ""
        )

        print(
            f"{duree:.1f} s de voix générées en "
            f"{time.time() - t:.2f} s{details} → {output_path}"
        )
        return output_path

    @staticmethod
    def play(path: Path) -> None:
        # afplay est fourni par macOS.
        subprocess.run(["afplay", str(path)], check=False)


def parser_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Synthèse vocale wolof locale, sans API."
    )
    parser.add_argument(
        "text",
        nargs="?",
        help="Texte wolof à lire.",
    )
    parser.add_argument(
        "--voice",
        choices=sorted(VOIX_FEMMES),
        default="slt",
        help="Empreinte vocale féminine (défaut: slt).",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=Path("outils/wolof-local-output.wav"),
        help="Fichier WAV de sortie.",
    )
    parser.add_argument(
        "--play",
        action="store_true",
        help="Lire automatiquement le WAV avec afplay sur macOS.",
    )
    parser.add_argument(
        "--interactive",
        action="store_true",
        help="Garder le moteur chargé et saisir plusieurs phrases.",
    )
    parser.add_argument(
        "--offline",
        action="store_true",
        help="Refuser de télécharger les modèles. Nécessite un cache existant.",
    )
    return parser.parse_args()


def main() -> None:
    args = parser_args()
    moteur = WolofLocalTTS(voice=args.voice, offline=args.offline)

    if args.interactive:
        print("\nMode interactif. Écris une phrase wolof puis Entrée.")
        print("Écris 'stop' pour quitter.\n")

        compteur = 1
        while True:
            try:
                texte = input("wolof> ").strip()
            except (EOFError, KeyboardInterrupt):
                print()
                break

            if texte.lower() in {"stop", "quit", "exit"}:
                break
            if not texte:
                continue

            sortie = args.output
            if compteur > 1:
                sortie = sortie.with_name(
                    f"{sortie.stem}-{compteur}{sortie.suffix}"
                )

            chemin = moteur.synthesize(texte, sortie)
            if args.play:
                moteur.play(chemin)
            compteur += 1
        return

    if not args.text:
        raise SystemExit(
            "Donne un texte ou utilise --interactive. "
            "Exemple: python3 outils/wolof_local_tts.py "
            ""Waaw, dégg naa la bu baax." --play"
        )

    chemin = moteur.synthesize(args.text, args.output)
    if args.play:
        moteur.play(chemin)


if __name__ == "__main__":
    main()
