#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Moteur TTS wolof local réutilisable.

Objectif :
- aucune API distante pour la synthèse ;
- aucun coût par phrase ;
- même modèle wolof déjà validé ;
- choix d'une empreinte vocale féminine ;
- mode interactif pour garder les modèles chargés en mémoire ;
- découpage automatique des textes longs pour éviter la limite SpeechT5.

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
import re
import subprocess
import time
from pathlib import Path

MODELE = "bilalfaye/speecht5_tts-wolof"
VOCODEUR = "microsoft/speecht5_hifigan"
XVECS = "regisss/cmu-arctic-xvectors"

VOIX_FEMMES = {
    "slt": "cmu_us_slt_arctic",
    "clb": "cmu_us_clb_arctic",
}

# SpeechT5 utilise 600 positions côté texte. On garde une marge de sécurité.
MAX_TOKENS_PAR_BLOC = 520
PAUSE_ENTRE_BLOCS_SEC = 0.12
SAMPLE_RATE = 16000


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

    def _nb_tokens(self, texte: str) -> int:
        ids = self.processor.tokenizer(texte, return_tensors="pt")["input_ids"]
        return int(ids.shape[1])

    def _decouper_phrase_longue(self, phrase: str) -> list[str]:
        mots = phrase.split()
        blocs = []
        courant = []

        for mot in mots:
            candidat = " ".join(courant + [mot]).strip()
            if courant and self._nb_tokens(candidat) > MAX_TOKENS_PAR_BLOC:
                blocs.append(" ".join(courant))
                courant = [mot]
            else:
                courant.append(mot)

        if courant:
            blocs.append(" ".join(courant))

        return blocs

    def _decouper_texte(self, texte: str) -> list[str]:
        texte = re.sub(r"\s+", " ", texte).strip()
        if self._nb_tokens(texte) <= MAX_TOKENS_PAR_BLOC:
            return [texte]

        phrases = [
            p.strip()
            for p in re.split(r"(?<=[.!?;:])\s+", texte)
            if p.strip()
        ]

        blocs = []
        courant = ""

        for phrase in phrases:
            if self._nb_tokens(phrase) > MAX_TOKENS_PAR_BLOC:
                if courant:
                    blocs.append(courant)
                    courant = ""
                blocs.extend(self._decouper_phrase_longue(phrase))
                continue

            candidat = f"{courant} {phrase}".strip()
            if courant and self._nb_tokens(candidat) > MAX_TOKENS_PAR_BLOC:
                blocs.append(courant)
                courant = phrase
            else:
                courant = candidat

        if courant:
            blocs.append(courant)

        return blocs

    def synthesize(self, text: str, output_path: Path) -> Path:
        import scipy.io.wavfile as wav

        texte = text.strip()
        if not texte:
            raise ValueError("Le texte est vide.")

        t = time.time()
        blocs = self._decouper_texte(texte)

        if len(blocs) > 1:
            print(
                f"Texte long : découpage automatique en {len(blocs)} blocs "
                f"(max {MAX_TOKENS_PAR_BLOC} tokens par bloc)."
            )

        audios = []
        inconnus_total = 0

        for i, bloc in enumerate(blocs, start=1):
            entrees = self.processor(text=bloc, return_tensors="pt")
            inconnus_total += int(
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

            audios.append(audio.detach().cpu())

            if i < len(blocs):
                pause = self.torch.zeros(
                    int(SAMPLE_RATE * PAUSE_ENTRE_BLOCS_SEC),
                    dtype=audio.dtype,
                )
                audios.append(pause)

        audio_final = self.torch.cat(audios)

        output_path.parent.mkdir(parents=True, exist_ok=True)
        wav.write(output_path, rate=SAMPLE_RATE, data=audio_final.numpy())

        duree = len(audio_final) / SAMPLE_RATE
        details = (
            f", {inconnus_total} token(s) inconnu(s)"
            if inconnus_total
            else ""
        )

        print(
            f"{duree:.1f} s de voix générées en "
            f"{time.time() - t:.2f} s{details} → {output_path}"
        )
        return output_path

    @staticmethod
    def play(path: Path) -> None:
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
        print("\nMode interactif. Écris une phrase ou un texte wolof puis Entrée.")
        print("Les textes longs sont découpés automatiquement.")
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
            "\"Waaw, dégg naa la bu baax.\" --play"
        )

    chemin = moteur.synthesize(args.text, args.output)
    if args.play:
        moteur.play(chemin)


if __name__ == "__main__":
    main()
