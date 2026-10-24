#!/usr/bin/env bash
# ── REDONNER SON OREILLE ET SA VOIX À UN POD NEUF ─────────────────────────
#
#   « Écris un script de restauration qui, au démarrage d'un nouveau pod
#     RunPod, retélécharge ces fichiers depuis bia-voix. »  — Lamine
#
#   À mettre en commande de démarrage du pod :
#       bash /workspace/restaurer-sur-runpod.sh && python serve_khalam_oreille.py
#
#   LA CLÉ NE VIT PAS DANS CE FICHIER, ni dans l'image, ni dans bia-render
#   qui est public. Elle arrive par un secret RunPod, en base64 :
#       BIA_SAUVEGARDE_CLE   la clé privée ed25519, base64, sur une ligne
#       BIA_SAUVEGARDE_HOTE  restauration@49.13.95.191   (défaut)
#   Elle est écrite dans /dev/shm — la mémoire vive — avec les droits 600, et
#   effacée en sortant. Rien sur le disque du pod, qui survit au pod.
#
#   ET LA CLÉ NE PEUT QUE LIRE. Du côté bia-voix, authorized_keys la force
#   sur `rrsync -ro` : même volée, elle ne peut rien écrire ni effacer dans la
#   sauvegarde. Voir preparer-bia-voix.sh.
#
#   ── CE SCRIPT REFUSE DE DÉMARRER SUR UN MODÈLE ABÎMÉ ────────────────────
#
#   Un téléchargement interrompu laisse un fichier de la bonne taille et du
#   mauvais contenu. Chargé, il donne soit une erreur illisible, soit — pire —
#   une voix qui marmonne. On compare donc chaque empreinte SHA-256 à celle
#   du manifeste, et on sort en erreur si une seule ne correspond pas.
set -euo pipefail

HOTE="${BIA_SAUVEGARDE_HOTE:-restauration@49.13.95.191}"
CIBLE="${BIA_RESTAURATION_CIBLE:-/workspace/khalam}"
CLE="/dev/shm/khalam-restauration-$$"

nettoyer() { rm -f "$CLE"; }
trap nettoyer EXIT

if [ -z "${BIA_SAUVEGARDE_CLE:-}" ]; then
  echo "✖ BIA_SAUVEGARDE_CLE absent. C'est un secret RunPod, pas une variable à écrire dans l'image."
  exit 2
fi
printf '%s' "$BIA_SAUVEGARDE_CLE" | base64 -d > "$CLE" 2>/dev/null || {
  echo "✖ BIA_SAUVEGARDE_CLE n'est pas du base64 valide."; exit 2; }
chmod 600 "$CLE"

command -v rsync >/dev/null || { echo "✖ rsync manquant dans l'image du pod (apt-get install -y rsync)"; exit 2; }

SSH="ssh -i $CLE -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=/dev/shm/known_hosts-$$ -o IdentitiesOnly=yes -o ConnectTimeout=20"
mkdir -p "$CIBLE"

# ── CE QU'ON REDESCEND, ET RIEN DE PLUS ───────────────────────────────────
# 11,56 Gio : l'inférence seule. Le checkpoint d'entraînement de 18 Gio reste
# sur bia-voix — un pod qui doit parler n'en a aucun besoin, et le descendre
# ajouterait un quart d'heure à chaque démarrage.
echo "── téléchargement depuis $HOTE ──"
rsync -a --partial --append-verify --human-readable --info=progress2 \
  -e "$SSH" --files-from=- "$HOTE:/" "$CIBLE/" <<'LISTE'
02-Khalam-Oreille/Step-4750/model.pt
02-Khalam-Oreille/Step-4750/runtime-support-linux.tar.gz
02-Khalam-Oreille/Step-4750/complements.tar.gz
02-Khalam-Oreille/serve_khalam_oreille.py
01-Khalam-Voice/Dependances-locales-retrouvees/s3gen.pt
01-Khalam-Voice/Dependances-locales-retrouvees/ve.pt
01-Khalam-Voice/Dependances-locales-retrouvees/conds.pt
01-Khalam-Voice/Dependances-locales-retrouvees/mtl_tokenizer.json
01-Khalam-Voice/Dependances-locales-retrouvees/grapheme_mtl_merged_expanded_v1.json
01-Khalam-Voice/Serveur-step-4472/rootfs/tmp/khalam-models/20261009/prepared/voice-training/khalam-voice-step4472.safetensors
07-Rapports/manifeste-oreille-voix.json
LISTE

# ── LA VÉRIFICATION, AVANT DE LAISSER DÉMARRER QUOI QUE CE SOIT ───────────
echo
echo "── vérification des empreintes ──"
python3 - "$CIBLE" <<'PY'
import hashlib, json, os, sys
cible = sys.argv[1]
manif = os.path.join(cible, "07-Rapports/manifeste-oreille-voix.json")
if not os.path.exists(manif):
    print("✖ le manifeste n'est pas arrivé :", manif); sys.exit(1)
attendu = {e["path"]: e for e in json.load(open(manif))["manifest"]}
A_VERIFIER = [
    "02-Khalam-Oreille/Step-4750/model.pt",
    "02-Khalam-Oreille/Step-4750/runtime-support-linux.tar.gz",
    "02-Khalam-Oreille/Step-4750/complements.tar.gz",
    "01-Khalam-Voice/Serveur-step-4472/rootfs/tmp/khalam-models/20261009/prepared/voice-training/khalam-voice-step4472.safetensors",
    "01-Khalam-Voice/Dependances-locales-retrouvees/s3gen.pt",
    "01-Khalam-Voice/Dependances-locales-retrouvees/ve.pt",
    "01-Khalam-Voice/Dependances-locales-retrouvees/conds.pt",
    "01-Khalam-Voice/Dependances-locales-retrouvees/mtl_tokenizer.json",
    "01-Khalam-Voice/Dependances-locales-retrouvees/grapheme_mtl_merged_expanded_v1.json",
]
faux = []
for rel in A_VERIFIER:
    f = os.path.join(cible, rel)
    if rel not in attendu:
        faux.append((rel, "pas dans le manifeste")); continue
    if not os.path.exists(f):
        faux.append((rel, "absent")); continue
    h = hashlib.sha256()
    with open(f, "rb") as fh:
        for bloc in iter(lambda: fh.read(1 << 22), b""):
            h.update(bloc)
    if h.hexdigest() != attendu[rel]["sha256"]:
        faux.append((rel, "empreinte différente")); continue
    print(f"✔ {attendu[rel]['sha256'][:16]}…  {rel}")
if faux:
    print()
    for rel, pourquoi in faux:
        print(f"✖ {pourquoi} : {rel}")
    print()
    print("ARRÊT. Un modèle abîmé ne donne pas une erreur franche : il donne")
    print("une voix qui marmonne, et on cherche la cause pendant des heures.")
    sys.exit(1)
print()
print("Tous les fichiers nécessaires sont intacts.")
PY

echo
echo "── en place ──"
du -sh "$CIBLE"/* 2>/dev/null || true
echo
echo "Oreille : $CIBLE/02-Khalam-Oreille/Step-4750/model.pt"
echo "Voix    : $CIBLE/01-Khalam-Voice/.../khalam-voice-step4472.safetensors"
echo
echo "CE QUI EST PROUVÉ : les octets sont les mêmes qu'au départ."
echo "CE QUI NE L'EST PAS : qu'elle parle. Lance le serveur, demande une"
echo "phrase, et écoute-la — c'est la seule vérification qui vaille."
