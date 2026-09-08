# Publier la v5 de BIA

Ce dossier contient **la totalité du code à publier**, prêt à l'emploi : rien à
compiler, rien à ranger. Il ne contient ni `node_modules` ni `.next` — Render
les reconstruit à chaque déploiement.

## Les six fichiers qui changent

| Fichier | Ce qui change |
|---|---|
| `app/api/chat/route.ts` | les six réponses écrites en dur sont supprimées ; la panne du moteur est dite au lieu d'être masquée |
| `lib/lexique.ts` | les exemples du lexique ne remontent plus au modèle quand ils sont hors sujet |
| `lib/panne.ts` | **nouveau** — garde le motif du dernier refus du modèle |
| `app/api/etat/route.ts` | expose `derniere_panne` et `lexique_entrees` |
| `app/page.tsx` | témoin discret à l'écran quand la réponse ne vient pas du modèle |
| `app/globals.css` | l'habillage de ce témoin |

Tout le reste est identique à la version en ligne.

## Le chemin le plus simple : GitHub Desktop

1. **File → Clone repository → lamicisse33-dotcom/bia-render**, dans un dossier
   **neuf et vide**. N'utilise pas `~/Documents/bia-render` : ce clone-là est
   cassé (`fatal: your current branch appears to be broken`).
2. Copie dans le clone le contenu de ce dossier-ci, en écrasant.
   Ne copie pas `COMMENT-PUBLIER.md` : il n'a rien à faire dans le dépôt.
3. GitHub Desktop montre six fichiers modifiés. Écris un résumé —
   « BIA ne récite plus : suppression des réponses en dur, lexique filtré,
   panne visible » — puis **Commit to main**, puis **Push origin**.
4. Render redéploie tout seul. Compte trois à cinq minutes.

## En ligne de commande, si tu préfères

```
cd ~/Documents
mv bia-render bia-render-casse          # on garde l'ancien de côté
git clone https://github.com/lamicisse33-dotcom/bia-render.git
cp -R ~/Desktop/bia-render/A-PUBLIER-v5/. ~/Documents/bia-render/
rm ~/Documents/bia-render/COMMENT-PUBLIER.md
cd ~/Documents/bia-render
git add -A
git commit -m "BIA ne récite plus : réponses en dur supprimées, lexique filtré, panne visible"
git push
```

## Une fois en ligne

Ouvre `https://bia-render.onrender.com/api/etat`. La ligne `derniere_panne`
est la réponse à la question qu'on n'arrive pas à trancher :

- `null` → le modèle répond, BIA réfléchit vraiment.
- `"statut": 401` → la clé Anthropic est refusée.
- `"statut": 429` → crédit épuisé ou trop d'appels.
- `"statut": 400` ou `404` → la requête ou le nom du modèle est refusé.

Puis pose-lui `combien font 17 × 23 ?`. Si elle répond 391, c'est réglé.

## À relire

Les deux phrases de panne, dans `app/api/chat/route.ts`, sont écrites dans un
wolof approximatif. Corrige-les, c'est ton domaine :

- `PANNE_MOTEUR` : « Sama moteur bi tontuwul léegi, kon mënuma la tontu bu wóor. Jéemal ci ay simili, walla nga xamal ko KHALAM. »
- `PAS_DE_CLE` : « Sama moteur bi taxawul : kon bi ci biir amul. Wax ko KHALAM. »
