# BIA — dossier de reprise

À lire au début d'une session Claude Code ouverte dans ce dossier.
Il dit ce qu'est BIA, ce qui a été fait, et ce qui reste.

---

## 1. Ce que BIA doit être

> « Une IA qui parle wolof, complète, comme ChatGPT — mais en wolof.
> Elle répond dans la langue où on lui parle. »

Assistante **générale**, pas un guichet KHALAM. Langue première : le wolof
urbain de Dakar. Elle répond en français si on lui écrit en français.

**BIA n'est pas BIBA, et la différence est structurelle.**
BIBA (dans GÉWEL et l'Interprète) est *verticale* : base de connaissances
fermée, périmètre interdit de franchir. Elle sera vendue à une entreprise qui
l'installe sur son site ; elle ne parlera que de cette entreprise. Sa valeur
tient à ce qu'elle refuse de dire.
BIA est *horizontale* : pas de base, pas de périmètre. Sa valeur tient à ce
qu'elle accepte de traiter. Ne pas les faire converger.

## 2. Où ça tourne

| | |
|---|---|
| Dépôt | `lamicisse33-dotcom/bia-render` (privé) |
| Service | Render, `bia-render`, Frankfurt, offre gratuite |
| Adresse | `https://bia-render.onrender.com` |
| Espace Render | « My Workspace » (Hobby), le même que `gewel-backend` |

L'ancien dépôt `lamicisse33-dotcom/bia` garde la version d'origine faite avec
l'outil Sites de ChatGPT. Ne pas y toucher, ne pas y revenir.

Le service dort après quinze minutes ; le réveil prend une trentaine de
secondes. Ce n'est pas BIA qui est lente.

## 3. Variables d'environnement

Réglées à la main dans l'interface Render. **Il n'y a pas de `render.yaml`
dans ce projet, et il ne faut pas en ajouter** : sur GÉWEL, en ajouter un a
fait réappliquer la configuration et effacé les variables posées à la main —
les deux voix et la reconnaissance vocale avaient disparu.

| Nom | Rôle |
|---|---|
| `BIA_LLM_API_KEY` | clé Anthropic, la même que BIBA |
| `BIA_CODE_MAITRE` | le code de Lamine : ni durée ni quota |
| `BIA_SECRET` | signe les codes de testeur — **ne jamais le changer** |
| `SOYNADE_API_KEY` | la voix (Oolel Voices) |
| `ELEVENLABS_API_KEY` | le micro (Scribe) |
| `BIA_LLM_MODEL` | facultatif, `claude-sonnet-5` par défaut |
| `BIA_MAX_QUESTIONS` | facultatif, 15 par défaut |
| `SOYNADE_EXAGGERATION` / `_CFG_WEIGHT` / `_TEMPERATURE` | le caractère de la voix |

Changer `BIA_SECRET` invalide d'un coup tous les codes distribués.

**Le premier réflexe de diagnostic** : ouvrir `/api/etat`. Il annonce le
moteur de voix, le moteur d'écoute, le modèle, et si la clé du modèle est
présente. Un repli silencieux ne peut donc pas passer pour un succès.

## 4. Ce que fait le code

| Fichier | Rôle |
|---|---|
| `app/page.tsx` | l'interface : portrait, micro, clavier repliable, écran d'entrée |
| `app/reglage/page.tsx` | page d'écoute pour choisir la voix |
| `app/api/chat/route.ts` | le message système et l'appel au modèle |
| `app/api/voix/route.ts` | la voix, morceau par morceau |
| `app/api/ecouter/route.ts` | le micro |
| `app/api/codes/route.ts` | fabrique les codes de testeur |
| `app/api/etat/route.ts` | l'état des moteurs |
| `lib/voix.ts` | Soynade + découpage à 480 caractères |
| `lib/ecoute.ts` | ElevenLabs Scribe |
| `lib/langue.ts` | wolof ou français |
| `lib/codes.ts` | codes signés |

### Les codes de testeur

Personne n'atteint BIA sans code. Chaque code **porte sa propre date
d'expiration, signée** par HMAC : le serveur ne garde aucune liste, et la
limite de temps survit donc au sommeil de Render. Le compteur de questions,
lui, vit en mémoire et repart à zéro au réveil — la durée reste, le quota
non. Un disque permanent (payant) le corrigerait.

Fabrication :
```
curl -X POST https://bia-render.onrender.com/api/codes \
  -H "content-type: application/json" \
  -d '{"maitre":"LE-CODE-MAITRE","heures":2,"nombre":5}'
```

### La voix

Oolel Voices (Soynade), **la même que BIBA**, appelée à la même adresse avec
les mêmes noms de variables. Soynade refuse au-delà de 500 caractères : le
serveur découpe aux fins de phrase (480 max) et le téléphone va chercher le
morceau suivant *pendant* qu'il lit le précédent.

Réglages de départ : exagération 0,12 — CFG 0,28 — température 0,35. Voix
douce et posée, à la demande de Lamine. **Ce ne sont pas les valeurs de
l'Interprète** (0,20 / 0,50 / 0,10), qui visent la netteté d'une traduction.

### La bouche

Elle suit l'énergie du son, tranche par tranche de 30 ms : silence → lèvres
fermées, syllabe douce → bouche arrondie, voyelle forte → bouche ouverte.
Environ six changements par seconde pendant la parole.

Avant, c'était une minuterie aveugle à 110 ms, sans lien avec l'audio — elle
mâchait pendant les silences. Ne jamais revenir à ce principe.

### Le micro

Règle reprise de BIBA : une fois ouvert, il attend une voix **sans limite de
temps** ; dès que quelqu'un a parlé, il se ferme **deux secondes** après le
dernier son. Un second appui conclut tout de suite.

### Les replis

Sans `SOYNADE_API_KEY`, ou si Soynade refuse, le téléphone lit lui-même avec
sa voix française — la voix redevient mécanique, c'est audible immédiatement.
Sans `ELEVENLABS_API_KEY`, le micro retombe sur la reconnaissance du
navigateur, en `fr-FR`. Le motif du refus est écrit dans les journaux Render.

`wo-SN` n'existe dans aucun navigateur : ne jamais y revenir, le micro
échouait en silence.

La retouche phonétique (`x`→kh, `ñ`→gn, `u`→ou) ne s'applique **qu'au wolof**.
Appliquée au français, elle donnait « tchommounitchation ».

## 5. Ce qui reste, par ordre

**1. Éprouver le wolof** sur de vraies questions dakaroises. Rien ne l'a
encore été.

**2. Le quota de questions ne survit pas au réveil.** Voir plus haut.

**3. Aucune mémoire.** Six échanges au maximum, rien ne survit à la fermeture
de l'onglet.

**4. Aucun corpus.** Contrairement à l'Interprète, BIA ne garde ni les
enregistrements ni les corrections. Rien ne l'améliore avec l'usage — pas de
bouton « Mal traduit », pas de lexique.

**5. L'oreille.** Scribe se trompe sur environ 40 % des mots wolof, et rien
de mieux n'existe en service payant. Piste repérée le 8 septembre :
`soynade-research/Wolof-HuBERT-CTC` sur Hugging Face, libre, 379 Mo — trop
lourd pour l'offre gratuite de Render, mais branchable via `STT_HTTP_URL`,
que l'architecture de l'Interprète prévoit déjà. À n'envisager qu'après avoir
mesuré ce que donne Scribe en vrai.

## 6. Comment travailler

Lamine attend qu'on **vérifie plutôt qu'on affirme**. Les corrections de
cette soirée ont toutes été trouvées en faisant tourner le code : projet
compilé, routes interrogées, faux serveur Soynade monté pour vérifier ce qui
partait vraiment vers l'API sans dépenser un franc.

Ne rien inventer sur KHALAM. Si une information manque, la demander.

Ce qu'il ne veut pas : que BIA et BIBA se ressemblent. Ce qu'il veut : une
voix douce, une image mise en valeur, une IA libre qui parle wolof.

---

**KHALAM** — studio créatif sénégalais, à Dakar, fondé par Kha et Lamine.
Jeux, applications, animation, audiovisuel, intelligence artificielle, pour un
public d'abord ouest-africain francophone. `khalam.app`

© 2026 KHALAM.
