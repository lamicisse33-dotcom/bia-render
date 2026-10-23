# Les 3,3 secondes — ce qu'elles étaient, 23 octobre 2026

Suite de `DIAGNOSTIC-AUTONOME-2026-10-22.md`, qui finissait sur une dette :

> « Environ 3 289 ms après le modèle restent donc à tracer. »

Lu sur `https://app.khalam.app/api/etat`, version servie `f8878b0e5067`,
série du 23 octobre à 21:39–21:40 UTC. Six échanges HTTP réels, aucun
échec. Rien n'est déduit d'un calcul local : les nombres ci-dessous sortent
du champ public `diagnostic_latence_autonome`.

## 1. Le compte est bon, et il ne restait rien

`premier_audio_ms` est mesuré depuis le début de la reconnaissance. En
reprenant les trois durées que le même rapport publie — reconnaissance,
première phrase, voix — l'addition tombe juste, à la milliseconde :

| échange | ASR | 1ʳᵉ phrase | voix | somme | premier audio | **reste** |
|---|---|---|---|---|---|---|
| repas_fr 1 | 1 397 | 1 577 | 1 462 | 4 436 | 4 436 | **0** |
| repas_wo 1 | 1 123 | 1 180 | 1 630 | 3 933 | 3 933 | **0** |
| suite_wo 1 | 979 | 1 372 | 939 | 3 290 | 3 291 | **1** |
| suite_wo 2 | 816 | 1 494 | 2 090 | 4 400 | 4 400 | **0** |
| repas_wo 2 | 1 025 | 2 159 | 196 | 3 380 | 3 380 | **0** |
| repas_fr 2 | 939 | 1 511 | 2 997 | 5 447 | 5 447 | **0** |

Et côté serveur, `reponse_prete_ms` vaut exactement
`preparation_ms + modele_complet_ms` dans les six cas, à 7 ms près. Il n'y a
donc pas de trou de 3,3 s dans le chemin où le modèle répond librement.

## 2. La finalisation apprise prend 332 ms, pas 3 289

`reponses_apprises`, ajouté après le 22 octobre, mesure les briques que le
22 soupçonnait — la lecture des devoirs, la provenance, l'audio mémorisé :

```
repas_wo   choix 217 ms · devoirs 1 ms · provenance 1 ms · audio 115 ms · total 332 ms
suite_wo   choix  16 ms · rien en cache pour cette question
```

**L'hypothèse du 22 octobre est écartée** : à serveur chaud, aucune de ces
trois lectures ne coûte plus de 115 ms. Les 3 289 ms ne venaient pas de là.

## 3. Ce qui restait quand même hors de toute mesure

Et c'est le vrai défaut, celui que cette session répare.

Le 22 octobre, le délai a été vu **sur la sélection apprise**. Il existe deux
chemins pour ça dans `app/api/chat/route.ts` :

- celui où le **modèle** choisit (`[[replique:`) — chronométré depuis le 22 ;
- celui où la **sélection est déjà en cache** — le plus emprunté des deux, et
  il repartait **sans aucun chronomètre**.

Pire : le diagnostic autonome ne pouvait pas le voir. Il pose `forcer_calcul`,
dont le seul rôle est d'annuler cette lecture de cache pour mesurer des
calculs neufs. **Le chemin le plus rapide de BIA était donc aussi le seul que
personne ne mesurait**, et c'est exactement le profil d'une attente qui
revient sans qu'on sache d'où elle vient. C'est la RÈGLE 3 de
`AVANT-DE-DIRE-QUE-C-EST-BON.md`, prise par l'autre bout : un compteur
absent cache une faute aussi bien qu'un compteur aveuglé.

Trois corrections, toutes en lecture seule :

1. Le chemin appris servi depuis le cache publie maintenant `devoirs_ms`,
   `origine_ms` et `audio_memoire_ms`, comme celui du modèle. Les deux
   portent en plus un champ `chemin` (`choix_en_cache` / `choix_du_modele`),
   sans quoi on compare deux chemins sans savoir lequel on lit.
2. Le diagnostic autonome ajoute `chemin_appris_http` : les mêmes
   transcriptions wolof renvoyées **sans** `forcer_calcul`, par la vraie
   route. Il publie `reponse_http_complete_ms`, `nomme_ms` et
   **`sans_nom_ms`** — ce qui reste après soustraction de tout ce que le
   serveur a su nommer. C'est ce champ-là qu'il faudra lire si l'attente
   revient ; il n'y a plus à la deviner.
3. Les trois dernières attentes anonymes de la fenêtre de préparation sont
   nommées dans `preparation_detaillee` : `salutation`, `relations`,
   `repertoire_correction`.

## 4. Les lectures Supabase « en série » étaient déjà parallèles

Demande du jour : paralléliser les lectures Supabase en série de
`app/api/chat/route.ts`. Mesure avant de toucher — `preparation_detaillee`,
60 relevés servis en ligne :

| lecture | min | médiane | max |
|---|---|---|---|
| choix | 91 | 117 | 517 |
| devoirs | 22 | 38 | 495 |
| souvenirs | 213 | 229 | 303 |
| instructions | 3 | 38 | 192 |
| fiches | 36 | 91 | 117 |
| vitrine | 4 | 26 | 39 |
| mots_corriges | 3 | 26 | 39 |
| exemples | 3 | 4 | 86 |
| correction_exacte | 1 | 1 | 2 |
| khalam / produits | 0 | 1 | 1 |

Ce que ça dit, et pourquoi **aucun `Promise.all` n'a été ajouté** :

- `khalam`, `produits`, `vitrine`, `devoirs`, `instructions`, `maitrises`,
  `fiches`, `choix` partent déjà ensemble dans un seul `Promise.all`
  (`contexteEnCours`), et `souvenirs` encore avant (`laMemoire`). Deux
  `await` qui suivent deux promesses lancées ensemble coûtent le **maximum**
  des deux, pas leur somme.
- `correction_exacte`, `exemples` et `mots_corriges` passent tous par
  `toutes()` dans `lib/lexique.ts`, qui dédoublonne sa requête et garde son
  résultat 60 s : **une seule lecture réseau pour les trois**. Mesurées à
  1 ms et 4 ms, ce ne sont plus des lectures mais des calculs sur un tableau
  déjà en mémoire. Les mettre en parallèle ne gagnerait rien.
- Il reste **une** lecture vraiment en série avant le groupe :
  `choix_cache` (`dialoguerAvecDevoirs(…,{cacheSeulement:true})`). La
  remonter au-dessus du groupe ferait travailler `choix` (jusqu'à 517 ms)
  et `fiches` sur des tours qui repartent aussitôt par le répertoire, une
  salutation ou le cache lui-même — c'est-à-dire **ralentir le chemin le plus
  rapide pour accélérer l'autre**, sur une machine Render partagée. Ça se
  décide sur un chiffre de trafic réel, pas sur une intuition : `choix_cache`
  est déjà chronométré, et ses relevés de production trancheront.

Le temps non expliqué de la fenêtre de préparation (`preparation_ms` va de
299 à 930 ms alors que les lectures nommées en expliquent au plus ~520) n'est
donc pas de l'attente réseau en série : c'est l'assemblage de la consigne,
du calcul. C'est le prochain endroit à regarder — avec les trois noms
ajoutés ci-dessus, il se lit maintenant par soustraction.

## Ce qui n'est pas mesuré ici

Ni le silence de fin de parole, ni le réseau du téléphone, ni le haut-parleur.
Aucun gain avant/après n'est déduit de cette série. Et aucune de ces durées ne
dit ce que Lamine entend : pour l'oreille, la voix et le micro, la RÈGLE 1
tient — ça se mesure dans sa bouche et dans ses oreilles.
