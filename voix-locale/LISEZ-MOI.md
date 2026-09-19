# La voix wolof locale de BIA

Un petit serveur Python qui fabrique la voix de BIA en wolof **sans rien
payer par phrase** : modèle `bilalfaye/speecht5_tts-wolof` (MIT), empreinte
de voix de femme (`slt` par défaut, `clb` possible). Lamine, le 19 septembre
2026, après écoute : « c'est merveilleux, c'est parfait ».

BIA l'appelle depuis Render (`lib/voix.ts`, fournisseur « locale ») pour les
réponses en wolof ; le français reste chez Soynade. Si le serveur ne répond
pas, BIA repasse par Soynade toute seule — jamais muette.

## Où le faire tourner

**Space Hugging Face (Docker), gratuit** — le plus simple pour commencer :
processeur 2 cœurs, 16 Go de mémoire, s'endort après 48 h sans visite (le
réveil prend une à deux minutes ; le premier `/health` de BIA le réveille).

1. Sur huggingface.co : New Space → SDK **Docker** → visibilité *Public*
   (le code est public, la clé ne l'est pas).
2. Y déposer les quatre fichiers de ce dossier : `Dockerfile`,
   `requirements.txt`, `moteur.py`, `serveur.py`.
3. Settings du Space → *Variables and secrets* → un **secret**
   `VOIX_LOCALE_CLE` = une longue phrase au hasard (la même que dans Render).
4. Attendre que le Space affiche « Running », puis ouvrir
   `https://<ton-space>.hf.space/health` : `"pret": true`.

**Render (Docker), payant mais sans sommeil** : nouveau Web Service, Docker,
racine `voix-locale/`, plan avec au moins 2 Go de mémoire. Même secret.

## Côté BIA (Render, variables d'environnement)

    VOIX_LOCALE_URL   = https://<ton-space>.hf.space
    VOIX_LOCALE_CLE   = la même phrase que le secret du Space
    VOIX_LOCALE_VOIX  = slt          (ou clb)

Dès que ces variables sont posées et que Render a redéployé, les réponses en
wolof passent par la voix locale. Ça se lit sur `/api/etat` : `moteur`
« wolof-local (slt) », et `voix_locale.dollars_evites` qui monte.

## Essayer à la main

    curl -X POST https://<ton-space>.hf.space/speak \
      -H "Authorization: Bearer <la clé>" -H "content-type: application/json" \
      -d '{"text":"Maa ngi fi.","voice":"slt"}' -o essai.wav

## Sur le Mac, pour le labo

    cd voix-locale && pip3 install -r requirements.txt
    uvicorn serveur:app --port 7860

Puis `http://127.0.0.1:7860/health`.
