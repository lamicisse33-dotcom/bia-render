# La voix wolof locale de BIA

Un petit serveur Python qui fabrique la voix de BIA en wolof **sans rien
payer par phrase** : modèle `bilalfaye/speecht5_tts-wolof` (MIT), empreinte
de voix de femme (`slt` par défaut, `clb` possible). Lamine, le 19 septembre
2026, après écoute : « c'est merveilleux, c'est parfait ».

BIA l'appelle depuis Render (`lib/voix.ts`, fournisseur « locale ») pour les
réponses en wolof ; le français reste chez Soynade. Si le serveur ne répond
pas, BIA repasse par Soynade toute seule — jamais muette.

## Où le faire tourner : une machine à nous

21 septembre 2026 : Hugging Face a rendu ses Spaces Docker payants pour les
nouveaux comptes. Lamine : « faire une bonne fois ce qu'il faut ». Donc un
petit serveur loué, à nous — Hetzner, ARM 4 cœurs / 8 Go (CAX21, ≈ 7 €/mois),
Ubuntu 24.04 — et un domaine à nous, `voix.khalam.app`. Tout est dans
`serveur/` : Docker Compose (la voix + Caddy pour le HTTPS automatique) et
un script d'installation qui fait le reste.

1. **Le serveur** — hetzner.com → Cloud → nouveau projet → *Add server* :
   Falkenstein ou Helsinki, Ubuntu 24.04, Arm64 **CAX21**, sans clé SSH
   (le mot de passe root arrive par e-mail), nom `bia-voix`. Noter l'IP.
2. **Le DNS** (Namecheap → Domain List → khalam.app → Manage → Advanced DNS) :
   *Add new record* → type **A**, host `voix`, value = l'IP, TTL automatic.
3. **L'installation**, depuis le Terminal du Mac :

       ssh root@<IP>
       curl -fsSL https://raw.githubusercontent.com/lamicisse33-dotcom/bia-render/main/voix-locale/serveur/installer.sh | bash

   Le script demande le domaine et la clé partagée (à taper là, jamais
   ailleurs), installe Docker, construit l'image, télécharge le modèle et
   attend `pret`. Le relancer plus tard met à jour.
4. Vérifier : `https://voix.khalam.app/health` → `"pret": true`.

Un Space Hugging Face reste possible avec un compte PRO (Dockerfile,
requirements.txt, moteur.py, serveur.py, README.md ; secret `VOIX_LOCALE_CLE`),
mais ce n'est plus la voie principale.

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
