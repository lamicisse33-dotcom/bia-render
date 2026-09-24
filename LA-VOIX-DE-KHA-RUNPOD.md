# La voix de Kha sur notre propre moteur (RunPod)

Depuis le 24 septembre 2026, BIA parle avec la voix de Kha fabriquée par NOTRE moteur
(Chatterbox multilingue affiné), hébergé chez RunPod en serverless : zéro machine au repos,
on ne paie que les secondes de parole fabriquées. Soynade ne sert plus que de secours.

## Brancher BIA dessus (Render, une seule fois)

Sur le service Render de app.khalam.app, deux variables d'environnement :

    VOIX_RUNPOD_URL   = https://api.runpod.ai/v2/98eeoi6vc3z431
    RUNPOD_API_KEY    = (la clé rpa_… créée dans RunPod → Settings → API Keys)

Si une variable `TTS_PROVIDER` existe déjà, la mettre à `runpod` (ou la supprimer : sans
elle, notre moteur est choisi dès que VOIX_RUNPOD_URL est posée). Redéployer Render.

Vérifier : `/api/etat` → `voix: "runpod"` et le bloc `voix_runpod` (servies, ratées, réveils).

## Ce qu'il faut savoir sur la lenteur

- Machine réveillée : 2 à 3 secondes par phrase.
- Machine endormie (aucune demande depuis 60 s) : le PREMIER appel attend 60 à 90 s,
  le temps qu'elle recharge la voix. `voix_runpod.reveils` compte ces réveils.
- Pour garder la machine chaude plus longtemps : `idle_timeout` dans `main.py` du dossier
  `bia-voice-endpoint` (60 s aujourd'hui). Plus c'est long, plus on paie de secondes à vide.

Réglages optionnels sur Render : `VOIX_RUNPOD_EXAGGERATION` (0,5), `VOIX_RUNPOD_CFG_WEIGHT` (0,5),
`VOIX_RUNPOD_ATTENTE_MS` (150000).

## Redéployer le moteur (quand main.py change)

JAMAIS depuis le Mac : l'archive de 225 MB met 20 minutes depuis Dakar et l'envoi casse.
On le fait depuis une machine louée chez RunPod dix minutes :

1. runpod.io → Pods → Deploy → template « Runpod Pytorch », GPU le moins cher (RTX A4000) → Deploy Pod.
2. Connect → Jupyter Notebook → créer un dossier `bia-voice-endpoint` (SANS espace) et y
   déposer les 5 fichiers du dossier « BIA VOIX » du Bureau :
   main.py, voix-kha.wav, requirements.txt, deploy-sur-pod.sh, test-voix.sh.
3. Terminal Jupyter :

       cd /workspace/bia-voice-endpoint
       export RUNPOD_API_KEY=rpa_…
       export HF_TOKEN=hf_…
       bash deploy-sur-pod.sh

   (requirements.txt est la liste EXPLICITE des librairies, sans torch ni CUDA, et le script
   déploie avec `--no-deps` : sinon pip tire 2,5 Go de CUDA inutiles et l'archive dépasse la limite.)
4. Le script affiche `ENDPOINT : https://api.runpod.ai/v2/…` — si l'identifiant a changé,
   mettre à jour VOIX_RUNPOD_URL sur Render.
5. STOP puis TERMINATE le pod (il facture tant qu'il tourne).
6. Sur le Mac, pour écouter : `bash ~/Desktop/"BIA VOIX"/test-voix.sh`.

Le modèle lui-même vit sur Hugging Face (dépôt privé `khalam-app/bia-voice-engine`) ; le
moteur le télécharge tout seul à chaque réveil. Il n'y a rien à refaire de ce côté-là.
