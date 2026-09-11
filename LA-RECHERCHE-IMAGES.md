# Qu'elle aille chercher elle-même — images et vidéos

**Deux clés, deux fournisseurs.** Ce n'était pas prévu ainsi, et voici pourquoi.

J'avais tout branché sur une seule clé Google. En allant chercher le lien exact
à te donner, j'ai lu le bandeau de la page officielle :

> « The Custom Search JSON API is closed to new customers. »

**Cette porte est fermée.** Google a arrêté d'accepter de nouveaux clients pour
son moteur d'images ; ceux qui l'utilisaient déjà ont jusqu'au 1er janvier 2027.
Toi tu es un nouveau client. Le code était juste et inutilisable.

Les **vidéos**, elles, passent toujours par Google : l'API YouTube est ouverte et
gratuite.

---

## 1. Les images — Brave Search

**→ https://api-dashboard.search.brave.com/register**

1. Créer un compte, confirmer l'adresse e-mail
2. Choisir un abonnement (**Data for Search** suffit). Une carte bancaire est
   demandée à l'inscription
3. **API Keys** → **Add API key** → copier la clé

**Ce que ça coûte :** **5 $ de crédit inclus chaque mois**, soit environ mille
recherches. Au-delà, 5 $ les mille — un demi-centime la recherche.

**Ce que Brave demande en échange :** d'être cité. Son nom apparaît déjà en petit
dans l'écran de BIA. **Ajoute aussi une ligne sur khalam.app** (par exemple en
bas de la page Applications) : « Recherche d'images : Brave Search ». C'est écrit
dans leurs conditions, et c'est la contrepartie du crédit mensuel.

## 2. Les vidéos — Google

**→ https://console.cloud.google.com/projectcreate** (nom : `khalam`)

**→ https://console.cloud.google.com/apis/library/youtube.googleapis.com**
puis **Enable**

**→ https://console.cloud.google.com/apis/credentials**
puis **Create credentials** → **API key** → copier

**Ce que ça coûte :** rien. **Cent recherches par jour**, gratuites.

## 3. Les poser sur Render

Service BIA → **Environment** → deux variables :

| Nom | Valeur |
|---|---|
| `BRAVE_CLE` | la clé de l'étape 1 (images) |
| `GOOGLE_CLE` | la clé de l'étape 2 (vidéos) |

C'est toi qui les poses — je ne touche pas à tes accès.

**Tu peux n'en poser qu'une.** Avec `BRAVE_CLE` seule, elle cherche des images
et pas de vidéos ; avec `GOOGLE_CLE` seule, l'inverse. Sa consigne s'ajuste
d'elle-même : elle ne promet jamais ce qu'elle ne peut pas faire.

---

## Le robinet d'arrêt

**Trente recherches d'images par jour** (`BIA_IMAGES_JOUR`) et **cent vidéos**
(`BIA_VIDEOS_JOUR`).

Trente par jour, c'est neuf cents par mois : le crédit Brave tient le mois entier
sans que tu aies à y penser. Passé le plafond, BIA répond **sans image** au lieu
d'ouvrir une facture. Le compteur repart chaque jour, et se lit sur `/api/etat`,
champ `trouver`.

Deux personnes qui demandent la même chose dans la même demi-heure ne consomment
**qu'une** recherche.

---

## Ce qu'elle fait avec

Quelqu'un dit ce qu'il veut voir — en wolof, en français, ou les deux mêlés — et
l'écran s'ouvre sous son menton.

> — Propose-moi des lunettes.
> — Elle choisit un style, une matière, une couleur. Deux phrases, « xool », et
>   l'écran s'ouvre.

**Elle traduit la demande en français** dans sa recherche : les moteurs d'images
comprennent mal le wolof, et elle repartirait les mains vides.

**Et elle propose vraiment.** « Propose-moi des lunettes » ne devient pas
« lunettes » dans sa recherche — ça ne propose rien — mais par exemple
« lunettes de soleil homme monture fine métal doré ».

Chaque image porte le nom de son site et mène dessus. BIA ne connaît ni le prix,
ni le stock, ni la boutique — et elle le dit. Ce sont des résultats de recherche,
pas une boutique.

Recherche en mode sécurisé au maximum : BIA passe entre toutes les mains.

---

## Si tu ne poses aucune clé

Rien ne casse et rien ne se dégrade. La consigne qui lui donne ce pouvoir n'est
même pas envoyée : elle ne promet jamais une image qu'elle ne peut pas aller
chercher.
