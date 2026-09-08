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

### Le visage : 24 expressions

`public/bia-24.webp`, planche de 6 colonnes sur 4 lignes, **cases carrées de
620 px** (821 Ko au total). Cadre carré, les deux épaules visibles.

Une première série livrée en 209 × 314 a été remplacée : trop petite, et les
épaules coupées. La leçon vaut pour la suite — exiger des **fichiers
individuels carrés d'au moins 1024 px, jamais découpés d'une planche**, le
découpage divisant la définition par six.
Ordre : 01-07 les bouches, 08-11 le repos, 12-20 les émotions, 21-24 les
rires. Les noms des cases sont dans `CASES` en haut de `app/page.tsx`.

Les images sont **recalées par corrélation sur le front et les yeux** — sur
les épaules pour la seule image 22, dont la tête renversée est voulue.
Les 7 bouches sont à 0 px d'écart : c'est ce qui supprime le tremblement
quand elles alternent.

Piège à connaître : l'image 24 a les **épaules remontées** par construction,
la caler sur le buste décalerait tout le visage. C'est pourquoi seule la 22
utilise le buste comme repère.

**Si de nouvelles images arrivent, refaire ce recalage.** Coller les images
brutes telles quelles fera trembler le visage.

### L'émotion vient du modèle

BIA termine chaque réponse par `[[emotion:X]]`, retiré du texte avant
affichage et avant la voix. X ∈ neutre, douce, joie, rire, fourire,
etonnement, surprise, ecoute, concernee, triste, malice, pensive.

Avant, l'émotion était devinée par mots-clés dans la réponse — grossier et
souvent faux. Le modèle sait ce qu'il dit ; il est mieux placé. Si la balise
manque, le visage reste neutre : on ne devine pas.

Les rires et la surprise ne sont pas une image fixe mais une petite suite
(`SUITES` dans `app/page.tsx`) — un rire, ça bouge.

### Le rythme

Réglé le 8 septembre après un premier essai jugé trop nerveux :
tranches de **75 ms** (au lieu de 30) et **130 ms minimum** entre deux images
de bouche. Mesuré : **6 changements par seconde** au lieu de 20,8 — la parole
humaine en fait 4 à 6. Clignement toutes les 5,6 s, respiration sur 5,2 s,
suites de rire deux fois plus lentes.

Ne pas accélérer sans mesurer : c'est le défaut que Lamine repère en premier.

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

### Sa mémoire

Le fil est gardé sur l'appareil (localStorage), pas sur le serveur : deux
testeurs ne se voient pas. Au-delà de trente messages, les plus anciens sont
condensés par `/api/resumer` en un mémo (prénom, métier, ville, décisions),
retirés du fil, et le mémo est renvoyé au modèle à chaque question. Douze
échanges au lieu de six.

### Son lexique

Bouton « Mal dit » sous chaque réponse → `/api/corriger` → Supabase, table
`bia_lexique` du projet `khalam-classement`. Sécurité au niveau des lignes
active sans aucune politique : seule la clé *service_role*, côté serveur, y
accède.

À chaque question : correction de la MÊME question → imposée au modèle ;
questions proches → montrées comme exemples faisant autorité. Cache d'une
minute, sinon chaque question ajoute un aller-retour Supabase.

### Ce qu'elle sait de KHALAM

`data/khalam.md`, en français lisible, injecté dans la consigne. Seule source
autorisée ; la section « À COMPLÉTER » est retirée avant l'envoi. Pour
enrichir : modifier le fichier, déposer sur GitHub. **Ne jamais écrire dans ce
fichier une information que Lamine n'a pas confirmée.**

## 5. Ce qui reste, par ordre

**1. Éprouver le wolof** sur de vraies questions dakaroises. Rien ne l'a
encore été.

**2. Le quota de questions ne survit pas au réveil.** Voir plus haut.

**3. Compléter `data/khalam.md`.** Les trous connus y sont listés : histoire du
studio, règles des jeux, prix, contact, réseaux, ce qui arrive. Les DEMANDER à
Lamine, jamais les deviner.

**4. Aucun corpus audio.** Les corrections de texte sont gardées, pas les
enregistrements. Rien ne permettra d'affiner un modèle d'écoute.

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
