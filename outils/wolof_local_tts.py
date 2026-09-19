#!/usr/bin/env python3
# -*- coding: utf-8 -*-

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

# SpeechT5 est limité à environ 600 positions texte.
# On garde volontairement une marge.
MAX_TOKENS_PAR_BLOC = 520
PAUSE_ENTRE_BLOCS_SEC = 0.12
SAMPLE_RATE = 16000


class WolofLocalTTS:

    def __init__(self, voice="slt"):
        import torch
        from datasets import load_dataset
        from transformers import (
            SpeechT5Processor,
            SpeechT5ForTextToSpeech,
            SpeechT5HifiGan,
        )

        self.torch = torch

        debut = time.time()

        self.processor = SpeechT5Processor.from_pretrained(MODELE)

        self.modele = SpeechT5ForTextToSpeech.from_pretrained(
            MODELE
        )

        self.vocoder = SpeechT5HifiGan.from_pretrained(
            VOCODEUR
        )

        empreintes = load_dataset(
            XVECS,
            split="validation"
        )

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
            raise RuntimeError(
                f"Empreinte vocale introuvable : {prefixe}"
            )

        self.voix = torch.tensor(
            vecteur
        ).unsqueeze(0)

        print(
            f"Moteur wolof prêt en "
            f"{time.time() - debut:.1f} s "
            f"— voix {voice.upper()}"
        )

        print(
            f"Empreinte : {source}"
        )

    def nombre_tokens(self, texte):

        ids = self.processor.tokenizer(
            texte,
            return_tensors="pt"
        )["input_ids"]

        return int(
            ids.shape[1]
        )

    def decouper_phrase_longue(
        self,
        phrase
    ):

        mots = phrase.split()

        blocs = []
        courant = []

        for mot in mots:

            candidat = " ".join(
                courant + [mot]
            )

            if (
                courant
                and
                self.nombre_tokens(
                    candidat
                )
                > MAX_TOKENS_PAR_BLOC
            ):

                blocs.append(
                    " ".join(courant)
                )

                courant = [mot]

            else:

                courant.append(mot)

        if courant:

            blocs.append(
                " ".join(courant)
            )

        return blocs

    def decouper_texte(
        self,
        texte
    ):

        texte = re.sub(
            r"\s+",
            " ",
            texte
        ).strip()

        if (
            self.nombre_tokens(texte)
            <= MAX_TOKENS_PAR_BLOC
        ):

            return [texte]

        phrases = [
            p.strip()
            for p in re.split(
                r"(?<=[.!?;:])\s+",
                texte
            )
            if p.strip()
        ]

        blocs = []

        courant = ""

        for phrase in phrases:

            if (
                self.nombre_tokens(phrase)
                > MAX_TOKENS_PAR_BLOC
            ):

                if courant:

                    blocs.append(
                        courant
                    )

                    courant = ""

                blocs.extend(
                    self.decouper_phrase_longue(
                        phrase
                    )
                )

                continue

            candidat = (
                f"{courant} {phrase}"
            ).strip()

            if (
                courant
                and
                self.nombre_tokens(
                    candidat
                )
                > MAX_TOKENS_PAR_BLOC
            ):

                blocs.append(
                    courant
                )

                courant = phrase

            else:

                courant = candidat

        if courant:

            blocs.append(
                courant
            )

        return blocs

    def synthesize(
        self,
        texte,
        sortie
    ):

        import scipy.io.wavfile as wav

        texte = texte.strip()

        if not texte:
            raise ValueError(
                "Le texte est vide."
            )

        debut = time.time()

        blocs = self.decouper_texte(
            texte
        )

        print(
            f"{len(blocs)} bloc(s) à générer"
        )

        audios = []

        for numero, bloc in enumerate(
            blocs,
            start=1
        ):

            print(
                f"Bloc {numero}/{len(blocs)} "
                f"— {self.nombre_tokens(bloc)} tokens"
            )

            entrees = self.processor(
                text=bloc,
                return_tensors="pt"
            )

            with self.torch.no_grad():

                audio = (
                    self.modele.generate_speech(
                        entrees["input_ids"],
                        self.voix,
                        vocoder=self.vocoder
                    )
                )

            audios.append(
                audio.detach().cpu()
            )

            if numero < len(blocs):

                pause = self.torch.zeros(
                    int(
                        SAMPLE_RATE
                        *
                        PAUSE_ENTRE_BLOCS_SEC
                    ),
                    dtype=audio.dtype
                )

                audios.append(
                    pause
                )

        audio_final = self.torch.cat(
            audios
        )

        sortie = Path(sortie)

        sortie.parent.mkdir(
            parents=True,
            exist_ok=True
        )

        wav.write(
            sortie,
            SAMPLE_RATE,
            audio_final.numpy()
        )

        duree = (
            len(audio_final)
            /
            SAMPLE_RATE
        )

        print(
            f"\n{duree:.1f} s de voix générées "
            f"en {time.time() - debut:.2f} s"
        )

        print(
            f"→ {sortie}"
        )

        return sortie

    @staticmethod
    def play(chemin):

        subprocess.run(
            [
                "afplay",
                str(chemin)
            ]
        )


def main():

    parser = argparse.ArgumentParser()

    parser.add_argument(
        "texte",
        nargs="?"
    )

    parser.add_argument(
        "--voice",
        choices=[
            "slt",
            "clb"
        ],
        default="slt"
    )

    parser.add_argument(
        "--play",
        action="store_true"
    )

    parser.add_argument(
        "--interactive",
        action="store_true"
    )

    parser.add_argument(
        "-o",
        "--output",
        default="outils/wolof-local-output.wav"
    )

    args = parser.parse_args()

    moteur = WolofLocalTTS(
        args.voice
    )

    if args.interactive:

        print()
        print(
            "Mode interactif."
        )

        print(
            "Écris du wolof puis Entrée."
        )

        print(
            "Les textes longs seront "
            "découpés automatiquement."
        )

        print(
            "Écris stop pour quitter."
        )

        print()

        compteur = 1

        while True:

            try:

                texte = input(
                    "wolof> "
                ).strip()

            except (
                KeyboardInterrupt,
                EOFError
            ):

                print()
                break

            if texte.lower() in {
                "stop",
                "exit",
                "quit"
            }:

                break

            if not texte:

                continue

            sortie = Path(
                args.output
            )

            if compteur > 1:

                sortie = sortie.with_name(
                    f"{sortie.stem}"
                    f"-{compteur}"
                    f"{sortie.suffix}"
                )

            chemin = moteur.synthesize(
                texte,
                sortie
            )

            if args.play:

                moteur.play(
                    chemin
                )

            compteur += 1

        return

    if not args.texte:

        print(
            "Donne un texte ou "
            "utilise --interactive."
        )

        return

    chemin = moteur.synthesize(
        args.texte,
        args.output
    )

    if args.play:

        moteur.play(
            chemin
        )


if __name__ == "__main__":
    main()
