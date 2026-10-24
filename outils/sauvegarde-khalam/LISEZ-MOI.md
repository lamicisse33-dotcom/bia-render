# Sauvegarder Khalam Oreille et Khalam Voix sur bia-voix

Demandé par Lamine le 24 octobre 2026. Ce dossier ne contient que des
scripts : **aucun modèle, aucune clé SSH**. `bia-render` est public —
vérifié le 24 octobre, `https://github.com/lamicisse33-dotcom/bia-render`
répond 200 sans être connecté — et un fichier de 2 Go ou une clé privée y
seraient publics pour de bon, même supprimés ensuite.

## 1. Ce qu'il y a sur le Mac (mesuré, pas estimé)

`~/Desktop/KHALAM-COMPLET/` — 122 Go au total. Les deux dossiers demandés :

| Dossier | Sur le disque | Fichiers |
|---|---|---|
| `01-Khalam-Voice/` | 9,2 Go | 19 029 |
| `02-Khalam-Oreille/` | 19 Go | 41 |
| **ensemble** | **28 Go** | **19 070** |

### LA CHOSE À NE PAS RATER : CE SONT DES LIENS DURS

28 Go sur le disque, mais **37,3 Gio si on additionne les fichiers un par
un**. La différence n'est pas une erreur de mesure : plusieurs gros fichiers
sont le MÊME fichier vu de deux endroits.

    02-Khalam-Oreille/Step-4750/model.pt                       inode 17500717, 2 liens
    02-Khalam-Oreille/Checkpoint-complet-step-4750/model/…pt   inode 17500717, 2 liens   ← le même, 8,5 Gio
    01-Khalam-Voice/…/model/s3gen.pt                           inode 17309627, 4 liens
    01-Khalam-Voice/Dependances-locales-retrouvees/s3gen.pt    inode 17309627, 4 liens   ← le même, 1 Gio

`LIRE-MOI.txt` de la sauvegarde l'annonçait : « les anciens chemins peuvent
subsister sous forme de liens ». Donc **`rsync -H` est obligatoire** : sans
lui, on téléverse 9,3 Gio de doublons, et à l'arrivée ils occupent la place
en double sur un disque qui n'en a pas de trop.

### Ce qu'il faut VRAIMENT pour redémarrer un pod

Le reste, c'est l'entraînement : utile pour reprendre, inutile pour parler.

| Fichier | Taille | À quoi ça sert |
|---|---|---|
| `02-Khalam-Oreille/Step-4750/model.pt` | 8,49 Gio | l'oreille, modèle d'inférence (étape 4750, WER 41,165 %) |
| `02-Khalam-Oreille/Step-4750/runtime-support-linux.tar.gz` | 82 Mio | ses dépendances Linux |
| `02-Khalam-Oreille/Step-4750/complements.tar.gz` | 631 Kio | tokenizer et paramètres |
| `02-Khalam-Oreille/serve_khalam_oreille.py` | 4 Kio | le serveur de l'oreille |
| `01-Khalam-Voice/…/voice-training/khalam-voice-step4472.safetensors` | 2,00 Gio | **la voix de Kha**, étape 4472 |
| `01-Khalam-Voice/Dependances-locales-retrouvees/s3gen.pt` | 1,00 Gio | le vocodeur Chatterbox |
| `01-Khalam-Voice/Dependances-locales-retrouvees/ve.pt` | 5,4 Mio | l'encodeur de voix |
| `01-Khalam-Voice/Dependances-locales-retrouvees/conds.pt` | 105 Kio | l'empreinte de voix |
| `01-Khalam-Voice/Dependances-locales-retrouvees/mtl_tokenizer.json` | 68 Kio | tokenizer |
| `01-Khalam-Voice/Dependances-locales-retrouvees/grapheme_mtl_merged_expanded_v1.json` | 68 Kio | graphèmes |
| **total** | **11,56 Gio** | |

Les 18 Go de `Checkpoint-complet-step-4750/` (modèle + optimiseur) ne servent
qu'à REPRENDRE L'ENTRAÎNEMENT. `televerser-vers-bia-voix.sh` les met dans un
second passage, séparé, qu'on peut sauter.

### Les empreintes existent déjà, inutile de les recalculer

`07-Rapports/dossier-complet-manifeste.json` (18 octobre 2026) porte le
SHA-256 de 160 944 fichiers. J'en ai extrait les 19 059 entrées des deux
dossiers dans `07-Rapports/manifeste-oreille-voix.json` (5,3 Mo, reste sur le
Mac, part avec la sauvegarde). Tout ce qui sert à l'inférence y est.

**Ce qui n'y est pas, et il faut le dire :** `Checkpoint-complet-step-4750/`
en est explicitement exclu — « verified by H200 source manifest before its
canonical rename ». Si on téléverse le second passage, ses empreintes seront
calculées au moment du transfert, pas reprises d'octobre.

## 2. Ce qui bloque aujourd'hui : je n'ai pas d'accès SSH à bia-voix

`bia-voix` est bien vivant : `voix.khalam.app` → `49.13.95.191`,
`/health` répond `{"pret":true,…}`, 36 demandes servies. Mais :

    ssh root@49.13.95.191  →  Permission denied (publickey,password)

Dix combinaisons essayées (root, bia, macbook, ubuntu, admin × les deux clés
du Mac) : aucune. Le serveur a été installé « sans clé SSH, le mot de passe
root arrive par e-mail » — voir `voix-locale/LISEZ-MOI.md`. Il n'y a donc
pas de clé à autoriser, et je ne peux pas taper un mot de passe.

**Donc je n'ai PAS pu faire `df -h`.** Et c'est exactement la question qu'il
faut trancher avant de téléverser quoi que ce soit : un CAX21 a 80 Go de
disque, Docker et le modèle SpeechT5 en occupent déjà une part, et 28 Go
pourraient ne pas rentrer. Je ne vais pas lancer un transfert de plusieurs
heures sur une place que je n'ai pas mesurée.

### Pour débloquer, une seule commande à taper sur le Mac

    ssh-copy-id -i ~/.ssh/id_ed25519.pub root@49.13.95.191

Elle demande le mot de passe root (celui de l'e-mail Hetzner) une fois, et
plus jamais ensuite. La clé publique à autoriser est :

    ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIG35oRRqt2V7LD6KLo4jaDHkZAw1mWvHAJkLsKb+icZ9 lamicisse33@gmail.com

Ensuite : `bash outils/sauvegarde-khalam/preparer-bia-voix.sh` puis
`televerser-vers-bia-voix.sh`.

## 3. L'ordre des opérations

    preparer-bia-voix.sh        mesure la place, crée /srv/sauvegarde-khalam,
                                crée l'utilisateur de restauration en lecture
                                seule. NE COPIE RIEN et refuse si la place
                                manque.
    televerser-vers-bia-voix.sh rsync -aH, puis compare les SHA-256 des deux
                                côtés. Ne supprime rien sur le Mac.
    restaurer-sur-runpod.sh     au démarrage d'un pod : retélécharge les
                                11,56 Gio nécessaires, vérifie chaque
                                empreinte, et REFUSE de démarrer si une seule
                                est fausse.

## 4. Ce que ces scripts ne font pas

- Ils ne suppriment rien sur le Mac. `KHALAM-COMPLET` reste l'original.
- Ils n'écrivent aucune clé privée ici. Celle du pod vit dans les secrets
  RunPod (`BIA_SAUVEGARDE_CLE`), jamais dans le dépôt, jamais dans une image.
- Ils ne prouvent pas qu'un pod reparle. Un modèle restauré avec la bonne
  empreinte est un modèle intact ; l'entendre reste à faire, et c'est la
  dernière ligne de `restaurer-sur-runpod.sh` qui le dit.
