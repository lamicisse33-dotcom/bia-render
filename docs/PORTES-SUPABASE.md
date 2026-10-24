# Les tables privées sont-elles fermées au public ?

Demandé par Lamine le 24 octobre 2026 : « Teste avec la clé PUBLIQUE de
Supabase si les tables khalam_rappels, khalam_souvenirs et khalam_corpus sont
lisibles. Elles doivent être fermées au public. Dis-moi le résultat. Ne
corrige rien sans me le dire. » **Rien n'a été corrigé.**

## La lecture : fermée, et c'est prouvé

Mesuré depuis le Mac avec la clé publiable du projet, et comparé à ce que la
clé de service voit sur `/api/etat → portes_supabase` :

| Table | Clé publique | Clé de service | Verdict |
|---|---|---|---|
| `khalam_souvenirs` | 200, **zéro ligne** | **13 048** lignes | **fermée, prouvé** |
| `khalam_corpus` | 200, **zéro ligne** | 11 lignes | **fermée, prouvé** |
| `bia_lexique` | 200, **zéro ligne** | 829 lignes | **fermée, prouvé** |
| `khalam_rappels` | 200, zéro ligne | 0 ligne | **indéterminé** — la table est vide, donc rien n'est prouvé |
| `reglages` | 200, zéro ligne | non mesuré ce jour-là | **indéterminé** |

### Pourquoi un 200 ne veut pas dire « ouverte », ni « fermée »

Avec la sécurité par ligne activée et **aucune règle posée**, PostgREST ne
répond pas 401 à la clé publique : il répond **200 et une liste vide**. La
lecture est autorisée au rôle, et la sécurité filtre toutes les lignes.

Et une liste vide ne prouve rien toute seule : une table réellement vide rend
zéro à tout le monde, clé de service comprise. **C'est la comparaison des
deux côtés qui tranche** — 13 048 contre zéro ne s'explique que par la
sécurité par ligne.

### `khalam_lexique` n'existe pas

PostgREST a répondu 404 avec, en toutes lettres : *« Perhaps you meant the
table public.bia_lexique »*. Le vrai nom est `bia_lexique`, porté par
`SUPABASE_TABLE_LEXIQUE` sur Render. Le repli écrit dans le code était faux
depuis le début — invisible, parce que la variable est toujours posée en
production. Corrigé.

## VERDICT FINAL — 24 octobre 2026, vérifié par Lamine

Il a exécuté la requête 1 dans Supabase : **`securite_activee = true` sur les
cinq tables.** Rien à corriger.

Ce que ça règle, et ça règle TOUT :

- la **lecture** était déjà prouvée fermée par la comparaison des compteurs ;
- l'**écriture** l'est maintenant aussi, et sans avoir eu à écrire quoi que ce
  soit : la sécurité par ligne s'applique à `INSERT`, `UPDATE` et `DELETE`
  autant qu'à `SELECT`. Activée **et sans aucune règle permissive**, elle
  refuse tout ce que la clé publique tenterait. C'est pour ça que les trois
  requêtes valent mieux qu'une sonde — elles répondent sur les quatre verbes
  d'un coup, là où mes tâtonnements ne répondaient sur aucun.

Les cinq tables sont donc **fermées à la clé publique, en lecture comme en
écriture.** `reglages`, qui n'a pourtant aucun fichier SQL dans ce dépôt,
porte bien la sécurité : quelqu'un l'a activée à la main, et c'était juste.

La section qui suit garde la trace de ce qui m'a fait tourner en rond, pour
qu'on ne refasse pas le chemin.

## L'écriture vue depuis le réseau : deux sondes qui mentent

C'est la question qui reste, et c'est la plus importante : une table fermée en
lecture mais ouverte en écriture laisserait n'importe qui injecter un faux
souvenir que BIA réciterait, ou changer la tenue de BIA.

**Deux sondes m'ont donné de fausses réponses, et je m'y suis fait prendre
deux fois :**

1. **Écrire sur une colonne inexistante** rend `PGRST204`. Ça ressemble à
   « l'écriture est permise, seul le nom de colonne est faux ». C'est faux :
   PostgREST lit son **cache de schéma avant la base**, donc cette erreur
   arrive même sans le moindre privilège.
2. **L'en-tête `Allow` d'une requête OPTIONS** annonce `GET, HEAD, POST,
   OPTIONS` sur les cinq tables. Il vient du même cache de schéma, pas des
   droits du rôle. Il n'annonce pas ce qui est permis, il annonce ce qui
   existe.

Une vraie écriture de test trancherait, mais elle **écrit** : un faux souvenir
dans `khalam_souvenirs` serait une ligne que BIA pourrait citer, et je n'ai
pas la clé de service pour l'enlever ensuite.

### La bonne façon de trancher : demander à la base, pas tâtonner

À coller dans Supabase → SQL Editor. Ça ne modifie rien.

```sql
-- 1. La sécurité par ligne est-elle activée sur chaque table ?
select relname as table_, relrowsecurity as securite_activee
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in ('khalam_rappels','khalam_souvenirs','khalam_corpus',
                  'bia_lexique','reglages')
order by 1;

-- 2. Quelles règles existent, et pour quels rôles ?
select tablename, policyname, cmd, roles, permissive
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 3. Ce que le rôle public a le droit de faire, table par table
select table_name, grantee, string_agg(privilege_type, ', ' order by privilege_type) as droits
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon','authenticated','public')
  and table_name in ('khalam_rappels','khalam_souvenirs','khalam_corpus',
                     'bia_lexique','reglages')
group by 1, 2
order by 1, 2;
```

**Ce qu'il faut lire :**

- Requête 1 : `securite_activee` doit être **true** sur les cinq. Si une
  ligne dit `false`, cette table est ouverte en lecture ET en écriture à
  qui possède la clé publique.
- Requête 2 : s'il n'y a **aucune** règle pour ces tables, c'est le bon cas —
  la sécurité est activée et rien n'est permis à personne d'autre que la clé
  de service.
- Requête 3 : voir `INSERT`, `UPDATE` ou `DELETE` pour `anon` n'est **pas**
  alarmant en soi — Supabase les accorde par défaut, et c'est la sécurité par
  ligne qui bloque. Ça ne devient grave que combiné à un `false` en requête 1.

## Ce qui est à corriger seulement s'il le demande

- Si `reglages` n'a pas la sécurité activée :
  `alter table reglages enable row level security;`
- Rien d'autre. Les trois tables de contenu sont prouvées fermées en lecture.
