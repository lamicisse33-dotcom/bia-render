# BIA — dossier de reprise

À déposer au début d'une nouvelle discussion consacrée à BIA, avec le dossier
`bia-render`. Ce document dit d'où l'on part et où l'on va.

---

## 1. Ce que BIA doit être

> « Une IA qui parle wolof, complète, comme ChatGPT — mais en wolof.
> Elle répond dans la langue où on lui parle. »

Ce n'est pas un assistant limité à KHALAM. C'est une assistante générale,
dont la langue première est le wolof urbain de Dakar.

## 2. D'où l'on part

BIA a été créée avec l'outil Sites de ChatGPT. Le projet d'origine tenait en
226 fichiers, mais **l'application n'en occupait que quatre** : une page, une
route de chat, une feuille de style, un gabarit.

Tout le reste — Cloudflare Workers, base D1, stockage R2, Tailwind, soixante
composants shadcn — **n'était pas utilisé** : `hosting.json` déclarait
`d1: null` et `r2: null`, le schéma de base était vide, et pas une classe
Tailwind n'apparaissait dans la page. Retiré.

Le dossier livré compte onze fichiers. Il a été installé, compilé, mis en
service et interrogé : BIA répond.

## 3. Ce qui a été corrigé

Quatre brides étouffaient BIA, toutes dans son propre code :

- **« 1 à 4 phrases »** dans le message système — elle ne pouvait rien
  expliquer. Levé : elle s'adapte à la question.
- **`max_tokens: 320`** — elle était coupée au milieu. Porté à 2000.
- **Le message système ne parlait que de KHALAM** — le modèle en déduisait
  qu'elle était un guichet. Réécrit : assistante générale.
- **Six réponses en dur passaient AVANT le modèle** — une question riche
  contenant « wolof » recevait une fiche au lieu d'une réflexion. Elles sont
  devenues un secours, consulté seulement si le modèle échoue.

Ajouté : elle répond dans la langue où on lui écrit. Et un journal d'erreur
écrit le refus du modèle avec son code, pour ne plus confondre « clé absente »
et « clé refusée ».

## 4. Où en est le dépôt GitHub

`github.com/lamicisse33-dotcom/bia` contient encore **le projet d'origine**,
pas cette version. GitHub Pages y a été activé — ça ne peut pas fonctionner :
Pages ne sert que des fichiers immobiles, or BIA a besoin d'un serveur pour
sa route `/api/chat`.

**À faire** : déposer `bia-render` (nouveau dépôt, branche, ou remplacement —
au choix de Lamine), brancher Render, éteindre Pages.

## 5. Les trois chantiers, par ordre d'urgence

**1. Protéger la clé.** Aujourd'hui, quiconque atteint l'adresse consomme le
crédit Anthropic de Lamine, sans limite ni compteur. C'est le plus urgent —
avant toute fonctionnalité.

**2. La mémoire.** BIA oublie tout entre deux visites. Seuls les six derniers
échanges sont renvoyés au modèle, et rien ne survit à la fermeture de l'onglet.

**3. La voix.** Le projet la décrit comme « assistante vocale ». Il n'y a
aucune voix dans le code.

Ensuite : éprouver son wolof sur de vraies questions dakaroises, et enrichir
ce qu'elle sait de KHALAM.

## 6. Comment travailler

Lamine attend qu'on vérifie plutôt qu'on affirme. Les erreurs trouvées ici
l'ont été en faisant tourner le code, pas en le lisant : la version pour
Render a été compilée et interrogée avant d'être livrée.

Ne rien inventer sur KHALAM. Si une information manque, la demander.

---

**KHALAM** — studio créatif sénégalais, à Dakar, fondé par Khadi et Lamine.
Jeux, applications, animation, audiovisuel, intelligence artificielle, pour un
public d'abord ouest-africain francophone. `khalam.app`

© 2026 KHALAM.
