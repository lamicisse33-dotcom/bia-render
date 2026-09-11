# Qu'elle aille chercher elle-même — images et vidéos

BIA sait déjà chercher du TEXTE sur Internet. Pour des images et des vidéos, il
faut un moteur d'images et un moteur de vidéos : ce n'est pas la même chose, et
aucune consigne n'y change rien.

**Une seule clé Google fait les deux.** C'est ce qui a décidé du choix.

---

## Les trois étapes, une seule fois

### 1. Une clé Google Cloud

console.cloud.google.com → nouveau projet (nom : `khalam`) →
**APIs & Services** → **Credentials** → **Create credentials** → **API key**

Puis, dans **Enabled APIs & services** → **Enable APIs**, active les deux :

- **Custom Search API** — pour les images
- **YouTube Data API v3** — pour les vidéos

### 2. Un moteur de recherche d'images

programmablesearchengine.google.com → **Add**

- Cocher **Search the entire web** (sans ça, elle ne cherche que sur un site)
- Une fois créé : **Image search → ON**
- Copier le **Search engine ID** (ça ressemble à `a12b3c4d5e6f7g8h9`)

### 3. Les poser sur Render

Service BIA → **Environment** → deux variables :

| Nom | Valeur |
|---|---|
| `GOOGLE_CLE` | la clé de l'étape 1 |
| `GOOGLE_CSE` | l'identifiant de l'étape 2 |

C'est toi qui les poses — je ne touche pas à tes accès.

---

## Ce que ça coûte

**Rien, jusqu'à cent recherches par jour** — cent pour les images, cent pour les
vidéos, comptées séparément.

Au-delà, l'image se paie **5 $ les mille**. C'est pour ça qu'il y a un robinet
d'arrêt : passé cent recherches dans la journée, BIA répond **sans image** au
lieu d'ouvrir une facture. Le compteur repart chaque jour.

Tu peux déplacer le plafond avec `BIA_IMAGES_JOUR` et `BIA_VIDEOS_JOUR`, mais
ne le fais qu'en sachant ce que ça coûte.

Le compteur du jour se lit sur `/api/etat`, champ `trouver`.

Et deux personnes qui demandent la même chose dans la même demi-heure ne
consomment **qu'une** recherche.

---

## Ce qu'elle fait avec

Quelqu'un décrit ce qu'il veut voir — en wolof, en français ou dans les deux —
et les images arrivent sous sa réponse.

> — Dama bëgg ay chaussures de sport yu weex, yu cuir.
> — BIA répond avec des mots, puis « xool », et six modèles apparaissent.

**Elle traduit la demande en français dans sa recherche** : les moteurs d'images
comprennent mal le wolof, et elle repartirait les mains vides.

Chaque image porte **le nom du site** et mène à ce site. C'est ce qui compte :
on montre où c'est, on ne s'attribue rien, et quelqu'un qui veut acheter sait où
aller. BIA ne connaît ni le prix, ni le stock, ni la boutique — et elle le dit.

Les vidéos ne chargent **aucun lecteur** avant qu'un doigt se pose dessus. Et la
recherche est en mode sécurisé au maximum : BIA passe entre toutes les mains.

---

## Si tu ne poses pas les clés

Rien ne casse, et rien ne se dégrade. La consigne qui lui donne ce pouvoir n'est
même pas envoyée : elle ne promet donc jamais une image qu'elle ne peut pas
aller chercher.
