#!/usr/bin/env bash
# ── TÉLÉVERSER L'OREILLE ET LA VOIX DU MAC VERS bia-voix ──────────────────
#
#   « Copie avec rsync dans un dossier dédié hors du code. Compare les sommes
#     de contrôle des deux côtés. Ne supprime RIEN sur le Mac : garde la copie
#     d'origine. »  — Lamine, 24 octobre 2026
#
#   TROIS CHOSES SONT DÉLIBÉRÉES ICI.
#
#   1. `-H`, ET C'EST LA LIGNE QUI COMPTE. Les gros fichiers de KHALAM-COMPLET
#      sont des LIENS DURS : model.pt de l'oreille et le modèle du checkpoint
#      sont le même inode, 8,5 Gio vus de deux endroits ; s3gen.pt a quatre
#      liens. Sans `-H`, on téléverse 9,3 Gio de doublons et ils occupent la
#      place en double à l'arrivée.
#
#   2. AUCUN `--delete`, NULLE PART. Ce script ne peut pas effacer, ni ici ni
#      là-bas. Un `--delete` avec un chemin source mal écrit vide la
#      destination, et c'est exactement ce qu'on ne peut pas se permettre sur
#      une sauvegarde.
#
#   3. `--partial --append-verify` : une coupure de réseau reprend là où elle
#      s'est arrêtée au lieu de recommencer 11 Gio.
#
#   Il ne touche à rien sur le Mac : rsync lit, c'est tout.
set -euo pipefail

SOURCE="${BIA_KHALAM_COMPLET:-$HOME/Desktop/KHALAM-COMPLET}"
HOTE="${BIA_VOIX_HOTE:-root@49.13.95.191}"
RACINE="${BIA_SAUVEGARDE_RACINE:-/srv/sauvegarde-khalam}"
SANS_CHECKPOINT="${SANS_CHECKPOINT:-0}"

[ -d "$SOURCE" ] || { echo "✖ introuvable : $SOURCE"; exit 2; }
command -v rsync >/dev/null || { echo "✖ rsync manquant"; exit 2; }

echo "── ce qui va partir, mesuré maintenant ──"
du -sh "$SOURCE/01-Khalam-Voice" "$SOURCE/02-Khalam-Oreille"
echo

# ── PASSAGE 1 : CE QUI FAIT REPARLER UN POD (11,56 Gio) ───────────────────
# Volontairement une liste explicite et non un dossier entier : ce qui part
# est ce qu'on a nommé, et rien d'autre ne peut s'y glisser par surprise.
echo "══ passage 1/2 : l'oreille et la voix d'inférence ══"
rsync -aH --partial --append-verify --human-readable --info=progress2 \
  --files-from=- "$SOURCE/" "$HOTE:$RACINE/" <<'LISTE'
02-Khalam-Oreille/Step-4750/model.pt
02-Khalam-Oreille/Step-4750/runtime-support-linux.tar.gz
02-Khalam-Oreille/Step-4750/complements.tar.gz
02-Khalam-Oreille/serve_khalam_oreille.py
02-Khalam-Oreille/serve_khalam_oreille.py.before-api-compat
02-Khalam-Oreille/runtime-support-linux-api-compatible.tar.gz
02-Khalam-Oreille/Suivi-entrainement-archive
01-Khalam-Voice/Dependances-locales-retrouvees
01-Khalam-Voice/Serveur-step-4472/rootfs/tmp/khalam-models
01-Khalam-Voice/Serveur-step-4472/rootfs/workspace/chatterbox-didi-913-2026-10-05
01-Khalam-Voice/Serveur-step-4472/LISEZ-MOI.txt
01-Khalam-Voice/Serveur-step-4472/requirements-source.txt
01-Khalam-Voice/Serveur-step-4472/source-manifest.json
01-Khalam-Voice/Serveur-step-4472/verification.json
01-Khalam-Voice/Serveur-step-4472/health-before.json
07-Rapports/manifeste-oreille-voix.json
07-Rapports/dossier-complet-verification.json
LIRE-MOI.txt
LISTE

# ── PASSAGE 2 : LE CHECKPOINT D'ENTRAÎNEMENT (18 Gio) ─────────────────────
# Il ne sert qu'à REPRENDRE l'entraînement. Il n'est pas couvert par le
# manifeste du 18 octobre — qui l'exclut explicitement — donc ses empreintes
# sont calculées au transfert, pas reprises.
if [ "$SANS_CHECKPOINT" = "1" ]; then
  echo
  echo "── passage 2/2 sauté (SANS_CHECKPOINT=1) : le checkpoint reste sur le Mac ──"
else
  echo
  echo "══ passage 2/2 : le checkpoint complet, pour reprendre l'entraînement ══"
  rsync -aH --partial --append-verify --human-readable --info=progress2 \
    "$SOURCE/02-Khalam-Oreille/Checkpoint-complet-step-4750" \
    "$HOTE:$RACINE/02-Khalam-Oreille/"
fi

# ── LA VÉRIFICATION, DES DEUX CÔTÉS ───────────────────────────────────────
# « Compare les sommes de contrôle des deux côtés. » rsync dit « envoyé » ;
# ça ne dit pas « identique après écriture sur le disque d'en face ». On
# relit donc les octets à l'arrivée.
echo
echo "══ vérification : SHA-256 relus sur bia-voix et comparés au Mac ══"
VERIFS=(
  "02-Khalam-Oreille/Step-4750/model.pt"
  "02-Khalam-Oreille/Step-4750/runtime-support-linux.tar.gz"
  "02-Khalam-Oreille/Step-4750/complements.tar.gz"
  "01-Khalam-Voice/Serveur-step-4472/rootfs/tmp/khalam-models/20261009/prepared/voice-training/khalam-voice-step4472.safetensors"
  "01-Khalam-Voice/Dependances-locales-retrouvees/s3gen.pt"
  "01-Khalam-Voice/Dependances-locales-retrouvees/ve.pt"
  "01-Khalam-Voice/Dependances-locales-retrouvees/conds.pt"
  "01-Khalam-Voice/Dependances-locales-retrouvees/mtl_tokenizer.json"
  "01-Khalam-Voice/Dependances-locales-retrouvees/grapheme_mtl_merged_expanded_v1.json"
)
echecs=0
for f in "${VERIFS[@]}"; do
  ici=$(shasum -a 256 "$SOURCE/$f" | cut -d' ' -f1)
  la=$(ssh "$HOTE" "sha256sum '$RACINE/$f' 2>/dev/null | cut -d' ' -f1" || true)
  if [ -z "$la" ]; then printf "✖ ABSENT À L'ARRIVÉE  %s\n" "$f"; echecs=$((echecs+1))
  elif [ "$ici" = "$la" ]; then printf "✔ %s  %s\n" "${ici:0:16}…" "$f"
  else printf "✖ DIFFÉRENT  %s\n   mac %s\n   bia %s\n" "$f" "$ici" "$la"; echecs=$((echecs+1)); fi
done

# Et le manifeste complet, relu ligne par ligne SUR le serveur : 19 059
# fichiers, c'est trop pour un aller-retour SSH par fichier.
echo
echo "── le manifeste entier, relu sur bia-voix ──"
ssh "$HOTE" "RACINE='$RACINE' python3 -" <<'DISTANT' || echecs=$((echecs+1))
import hashlib, json, os, sys
racine = os.environ["RACINE"]
chemin = os.path.join(racine, "07-Rapports/manifeste-oreille-voix.json")
if not os.path.exists(chemin):
    print("✖ manifeste absent à l'arrivée :", chemin); sys.exit(1)
m = json.load(open(chemin))["manifest"]
ok = absents = faux = 0
for e in m:
    f = os.path.join(racine, e["path"])
    if not os.path.exists(f):
        absents += 1
        continue
    h = hashlib.sha256()
    with open(f, "rb") as fh:
        for bloc in iter(lambda: fh.read(1 << 22), b""):
            h.update(bloc)
    if h.hexdigest() == e["sha256"]:
        ok += 1
    else:
        faux += 1
        if faux <= 10:
            print("✖ empreinte fausse :", e["path"])
print(f"intacts {ok}  absents {absents}  faux {faux}  sur {len(m)} du manifeste")
# Un fichier absent est normal si on a sauté une partie ; une empreinte
# FAUSSE ne l'est jamais.
sys.exit(1 if faux else 0)
DISTANT

echo
if [ "$echecs" -eq 0 ]; then
  echo "✔ transfert vérifié. Rien n'a été supprimé sur le Mac : KHALAM-COMPLET est intact."
else
  echo "✖ $echecs vérification(s) en échec — NE PAS considérer la sauvegarde comme bonne."
  exit 1
fi
