---
title: BIA voix wolof
emoji: 🗣️
colorFrom: yellow
colorTo: red
sdk: docker
app_port: 7860
pinned: false
license: mit
---

# La voix wolof de BIA

Un serveur qui fabrique la voix de BIA en wolof, sans rien payer par phrase.
Modèle `bilalfaye/speecht5_tts-wolof` (MIT) + vocodeur `microsoft/speecht5_hifigan`.

- `GET /health` — prêt ou pas, quelle voix, quelle empreinte.
- `POST /speak` — `{"text": "...", "voice": "slt"}` avec `Authorization: Bearer <VOIX_LOCALE_CLE>` → un WAV 16 kHz.

Le mode d'emploi complet est dans `LISEZ-MOI.md`.
