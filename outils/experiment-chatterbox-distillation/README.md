# Expérience indépendante : Chatterbox -> Piper / Kokoro

Statut : préparation des données seulement. **Aucun entraînement n'a été lancé.**

## Isolation
Branche expérimentale sans merge et sans deploy. Ne pas installer ce code dans le service BIA, ne pas redémarrer PID Chatterbox, ne pas entraîner sur l'A40. Lancer la génération et les expériences sur un H200 RunPod indépendant avec une copie validée de la voix. Aucun accès terminal RunPod n'est accessible directement depuis ce connecteur GitHub.

## Modèle professeur
Le code actif retrouvé sur le Pod A40 est `/workspace/chatterbox-didi-913-2026-10-05/serve_chatterbox_bia.py` ; checkpoint wolof `/tmp/khalam-models/20261009/prepared/voice-training/khalam-voice-step4472.safetensors`. Le processus a été observé comme PID 552. Le français emprunte un autre profil. La référence féminine effective doit être lue sur la configuration **et** les overrides du processus (ne jamais partager de secrets). Rien dans ce dossier GitHub ne prouve que le H200 est créé.

## Jeu de données
Source prioritaire : leçons et lexique BIA **validés** (WO/FR/mixte) extraits légalement de Supabase ou de leurs sauvegardes. Ne jamais republier les données privées dans ce dépôt public.
Créer une ligne par phrase au format JSONL, exemple :
```json
{"id":"BIA-EXAMPLE-001","text":"Naka nga def ?","approved":true,"audio_reviewed":true,"language":"wo","source_id":"lecon-validee"}
```
Sur le H200, produire le fichier WAV mono `BIA-EXAMPLE-001.wav` avec la voix professeur exacte, vérifier la prononciation à l'écoute, puis marquer `audio_reviewed=true`. NE PAS auto-valider les enregistrements. Le script ne génère jamais d'audio ni ne démarre de jobs.

## Usage
```bash
python3 prepare_teacher_corpus.py inventory
python3 prepare_teacher_corpus.py prepare --texts /data/approved.jsonl --wav-dir /data/teacher_wavs --out /data/new_manifest
```
La sortie sépare train/validation/test et contient SHA-256, langue, chemin audio, durée. Les 18 855 WAV de l'ancien corpus ne sont **pas** automatiquement intégrés : leurs métadonnées `source=wolof_tts` ne prouvent pas qu'ils ont été prononcés par notre voix Chatterbox.

## Suite non exécutée
1. Obtenir la copie fiable du moteur/voix et un corpus validé sans secrets.
2. Démarrer et configurer un H200 **dans RunPod**, séparé de l'A40.
3. Synthétiser des phrases et valider humainement les audios.
4. Adapter phonémisation wolof / français pour Piper ; fine-tuning.
5. Vérifier la faisabilité du fine-tuning Kokoro pour cette langue avant de consommer beaucoup de GPU.
6. Tests aveugles qualité/vitesse/couverture et conservation de Chatterbox en production.
