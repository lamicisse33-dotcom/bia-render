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

Deux limites héritées des moteurs, pas du code : Soynade ne lit que 500
caractères d'un coup, donc les longues réponses sont découpées aux frontières
de phrase et enchaînées ; et Scribe se trompe sur environ 40 % des mots
wolof — aucun moteur ne fait mieux aujourd'hui.

## Ce qui reste à faire

- **Le wolof est à éprouver** sur de vraies questions dakaroises.
- **Aucun corpus** : contrairement à l'Interprète, BIA ne garde ni les
  enregistrements ni les corrections. Rien ne l'améliore avec l'usage.
- **Aucune mémoire** entre les sessions ; seuls les six derniers échanges
  sont renvoyés au modèle.
- **La voix** : le projet parle d'assistante vocale, il n'y a rien dans le code.
- **Le wolof est à éprouver** sur de vraies questions dakaroises.

© 2026 KHALAM (Khadi & Lamine).
