# BIA

Intelligence artificielle de KHALAM, à Dakar. Elle parle wolof.

## Ce qu'elle est

Une assistante **complète**, pas un guichet d'information sur KHALAM. Elle aide
sur tout — mathématiques, santé, école, démarches, cuisine, code, écriture,
traduction — et répond **dans la langue où on lui écrit**, le wolof par défaut.

## Déposer sur Render

1. Un dépôt GitHub avec ces fichiers **à la racine**.
2. **render.com → New → Web Service**, connecter le dépôt.
   - Runtime : **Node**
   - Build Command : `npm install && npm run build`
   - Start Command : `npm start`
3. **Environment → Environment Variables**, les DEUX :

   | Nom | Valeur | Obligatoire |
   |---|---|---|
   | `BIA_LLM_API_KEY` | ta clé Anthropic — la même que BIBA | oui |
   | `BIA_CODE_MAITRE` | ton code à toi, sans limite ni durée | oui |
   | `BIA_SECRET` | une longue phrase secrète, elle signe les codes | oui |
   | `BIA_LLM_MODEL` | par défaut `claude-sonnet-5` | non |
   | `BIA_MAX_QUESTIONS` | par défaut 15 | non |
   | `SOYNADE_API_KEY` | ta clé Soynade — la même que l'Interprète | pour la voix |
   | `SUPABASE_URL` | `https://mguiuamwggokbirxbyqc.supabase.co` | pour le lexique |
   | `SUPABASE_SERVICE_KEY` | la clé *service_role* du projet | pour le lexique |
   | `ELEVENLABS_API_KEY` | ta clé ElevenLabs | pour le micro wolof |

   Les autres réglages de Soynade portent les mêmes noms que dans
   l'Interprète (`SOYNADE_BASE_URL`, `SOYNADE_TTS_MODEL`,
   `SOYNADE_EXAGGERATION`, `SOYNADE_TEMPERATURE`, `SOYNADE_CFG_WEIGHT`) et
   ont les mêmes valeurs par défaut : rien à régler si tu gardes les siennes.

   Sans `BIA_LLM_API_KEY`, BIA n'appelle jamais le modèle.
   Sans `BIA_SECRET`, plus aucun code de testeur n'est reconnu — seul le tien passe.
   Ne change JAMAIS `BIA_SECRET` ensuite : tous les codes déjà distribués mourraient.

## Les codes de testeur

Personne n'atteint BIA sans code : sinon, qui trouve l'adresse dépense ton crédit.

**Fabriquer des codes** — sur ton téléphone ou ton ordinateur :

```
curl -X POST https://TON-ADRESSE/api/codes \
  -H "content-type: application/json" \
  -d '{"maitre":"TON-CODE-MAITRE","heures":2,"nombre":5}'
```

Tu reçois cinq codes de dix lettres. Chacun vaut **2 heures et 15 questions**.
Ton code maître à toi n'a ni durée ni limite.

Chaque code porte sa propre date d'expiration, signée : le serveur n'a aucune
liste à garder, et la limite de temps survit au sommeil de Render. Le compteur
de questions, lui, vit en mémoire — il repart à zéro quand le service se
réveille. La durée reste, elle.

## Savoir si le modèle répond

Chaque réponse porte un champ `source` :

| Source | Ce que ça veut dire |
|---|---|
| `BIA intelligente` | le modèle a répondu — tout va bien |
| `BIA locale (secours)` | le modèle n'a pas répondu, une réponse enregistrée a pris le relais |
| `Réponse prudente` | le modèle n'a pas répondu et aucun secours ne correspondait |
| `Erreur sûre` | requête mal formée |

Si tu vois autre chose que `BIA intelligente`, regarde les journaux de Render :
un refus du modèle y est écrit avec son code d'erreur.

## Sur l'offre gratuite de Render

Le service s'endort après quinze minutes sans visite ; le réveil prend une
trentaine de secondes. Ce n'est pas BIA qui est lente.

## Les fichiers

| Fichier | Rôle |
|---|---|
| `app/page.tsx` | l'interface |
| `app/api/chat/route.ts` | le message système et l'appel au modèle |
| `app/globals.css` | les styles, écrits à la main |
| `app/layout.tsx` | titre et icône |
| `app/api/voix/route.ts` | la voix : Oolel Voices (Soynade) |
| `app/api/ecouter/route.ts` | le micro : ElevenLabs Scribe |
| `app/api/etat/route.ts` | dit à l'interface quels moteurs sont branchés |
| `lib/voix.ts` | l'appel à Soynade et le découpage à 480 caractères |
| `lib/ecoute.ts` | l'appel à Scribe |
| `lib/langue.ts` | français ou wolof, pour savoir comment lire |
| `lib/codes.ts` | les codes de testeur |

## La voix et le micro

BIA parle avec **Oolel Voices**, la même voix que BIBA, appelée à la même
adresse avec les mêmes réglages. Elle écoute avec **ElevenLabs Scribe**.

Si `SOYNADE_API_KEY` manque, ou si Soynade refuse, le téléphone lit lui-même
le texte avec sa voix française — BIA n'est jamais muette, mais tu l'entends
tout de suite : la voix redevient mécanique. La raison du refus est écrite
dans les journaux de Render.

Si `ELEVENLABS_API_KEY` manque, le micro retombe sur la reconnaissance du
navigateur, réglée en français. Elle déforme le wolof : c'est un dépannage,
pas une solution.

### Sa voix à elle

Oolel-Voices sait **cloner une voix** : on lui donne un extrait de référence,
il imite la voix qu'il y entend.

L'extrait de BIA est `public/voix-bia.wav` — 19 secondes de parole nette,
mono, 24 kHz, tirées de l'enregistrement de Lamine. Il est servi par BIA
elle-même, donc joignable à
`https://bia-render.onrender.com/voix-bia.wav`, ce qui est nécessaire :
l'API doit pouvoir aller le chercher.

Pour l'activer, dans Render :

| Variable | Valeur |
|---|---|
| `SOYNADE_AUDIO_PROMPT` | `https://bia-render.onrender.com/voix-bia.wav` |

**Si ça ne marche pas du premier coup**, c'est probablement le nom du champ.
La documentation du modèle ouvert l'appelle `audio_prompt_path`, et c'est ce
que BIA envoie ; l'API hébergée de Soynade pourrait le nommer autrement.
Dans ce cas, `SOYNADE_AUDIO_PROMPT_FIELD` permet d'en essayer un autre
(`audio_prompt`, `reference_audio`, `voice_prompt`…) sans toucher au code.

`/api/etat` affiche `voix_clonee`, et la page `/reglage` a une case pour
comparer avec et sans, dans la même minute.

### Régler sa voix

`TON-ADRESSE/reglage`, avec ton code maître. Tu écris une phrase, tu bouges
trois curseurs, tu écoutes. Quand ça te plaît, la page t'affiche les trois
lignes à recopier dans Render → Environment.

| Réglage | Bas | Haut |
|---|---|---|
| `SOYNADE_EXAGGERATION` | calme, retenue | emphase, insistance |
| `SOYNADE_CFG_WEIGHT` | débit lent et posé | débit rapide et net |
| `SOYNADE_TEMPERATURE` | régulière, mécanique | vivante, variable |

BIA part sur 0,12 / 0,28 / 0,35 : une voix douce et posée. Ce ne sont PAS les
valeurs de l'Interprète (0,20 / 0,50 / 0,10), qui visent la netteté d'une
traduction. Les deux services étant séparés sur Render, changer l'un ne
touche pas l'autre.

Deux limites héritées des moteurs, pas du code : Soynade ne lit que 500
caractères d'un coup, donc les longues réponses sont découpées aux frontières
de phrase et enchaînées ; et Scribe se trompe sur environ 40 % des mots
wolof — aucun moteur ne fait mieux aujourd'hui.

## Sa mémoire

BIA retrouve la conversation là où on l'a laissée, même après avoir fermé
l'onglet. Tout reste **sur l'appareil** : rien n'est envoyé ailleurs, et deux
testeurs ne se voient pas.

Au-delà de trente messages, les plus anciens sont condensés en un mémo — le
prénom, le métier, la ville, ce qui a été décidé — puis retirés du fil. Le
mémo, lui, est renvoyé au modèle à chaque question. C'est ce qui fait qu'elle
se souvient d'une personne d'une visite à l'autre sans que la conversation
gonfle sans fin.

Deux boutons dans le panneau du clavier : **Nouvelle conversation** vide le
fil mais garde les notes ; **Tout oublier** efface aussi les notes.

## Son wolof grandit

Sous chaque réponse de BIA, un bouton **Mal dit**. Le testeur écrit la bonne
formulation, elle part dans Supabase.

Ensuite, à chaque question :
- si la **même** question a déjà été corrigée, la formulation validée est
  imposée au modèle ;
- sinon, les corrections **proches** (mots en commun) lui sont montrées comme
  exemples faisant autorité.

Sur le wolof de Dakar, un locuteur d'ici a toujours raison contre un modèle
entraîné ailleurs. C'est le sens de cette priorité.

Le lexique est lu au maximum une fois par minute (cache), sinon chaque
question ajouterait un aller-retour Supabase au délai de réponse.

### Une table pour les trois applications

Le lexique est **commun à BIA, BIBA et l'Interprète**. Une correction faite
dans l'une profite aux trois : c'est de la langue wolof, pas de la marque.
La colonne `application` dit d'où vient chaque correction ; toutes sont lues,
quelle que soit leur origine.

**Si tu pars de zéro**, dans l'éditeur SQL de Supabase :

```sql
create table khalam_lexique (
  id           bigserial primary key,
  source       text not null,
  corrigee     text not null,
  proposee     text,
  langue       text,
  auteur       text,
  application  text,
  date         timestamptz default now()
);
alter table khalam_lexique enable row level security;
```

**Si `bia_lexique` existe déjà**, il suffit de la renommer et d'ajouter la
colonne — rien n'est perdu :

```sql
alter table bia_lexique rename to khalam_lexique;
alter table khalam_lexique add column if not exists application text;
update khalam_lexique set application = 'bia' where application is null;
```

Pour brancher GÉWEL et l'Interprète dessus, leur donner les mêmes
`SUPABASE_URL` et `SUPABASE_SERVICE_KEY`, la même table, et un `KHALAM_APP`
différent (`biba`, `interprete`).

### Verser un lexique existant

Les corrections déjà accumulées par l'Interprète (`data/lexique.json`) se
versent dans la table commune en une fois. Réservé au code maître, et les
doublons sont écartés — rejouer le même fichier ne gonfle pas la base :

```
curl -X POST https://bia-render.onrender.com/api/importer \
  -H "content-type: application/json" \
  -H "x-bia-code: TON-CODE-MAITRE" \
  -d @lexique-pret.json
```

Le fichier attendu : `{"entrees":[{"source":"…","corrigee":"…","langue_source":"fr"}, …]}`.
C'est presque la forme du `lexique.json` de l'Interprète — il suffit de
l'envelopper dans `{"entrees": …}`.

La sécurité au niveau des lignes est activée sans aucune politique : personne
ne peut lire la table depuis l'extérieur. Seule la clé *service_role*, qui
vit uniquement sur le serveur de BIA, la traverse.

Sans `SUPABASE_URL` et `SUPABASE_SERVICE_KEY`, les corrections tiennent en
mémoire vive et disparaissent au réveil de Render. `/api/etat` le dit
franchement.

## Ce qu'elle sait de KHALAM

Tout est dans **`data/khalam.md`**, en français lisible. C'est la seule source
de BIA sur le studio : elle a pour consigne de ne rien inventer au-delà et de
dire qu'elle ne sait pas quand la réponse n'y est pas.

**Pour l'enrichir : modifie ce fichier, dépose-le sur GitHub.** Render
redéploie, BIA sait la suite. Aucun code à toucher.

Le fichier se termine par une liste « À COMPLÉTER » — les trous connus. Cette
partie n'est jamais envoyée au modèle : c'est un pense-bête, pas un savoir.

## Ce qui reste à faire

- **Le wolof est à éprouver** sur de vraies questions dakaroises.
- **Aucun corpus audio** : les corrections de texte sont gardées, mais pas
  les enregistrements. Rien ne permettra d'affiner un modèle d'écoute.
- **La voix** : le projet parle d'assistante vocale, il n'y a rien dans le code.
- **Le wolof est à éprouver** sur de vraies questions dakaroises.

© 2026 KHALAM (Khadi & Lamine).
