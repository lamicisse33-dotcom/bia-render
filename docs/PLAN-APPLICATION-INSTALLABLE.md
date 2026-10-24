# Application installable iPhone / Android — le plan avant de commencer

Lamine, le 24 octobre 2026 : « Application installable iPhone/Android
(Capacitor) : projet plus gros, ne le bâcle pas ; propose-moi un plan avant
de commencer. » Donc ceci est un plan, et **rien n'est commencé**.

## Ce que BIA est aujourd'hui, mesuré

BIA est déjà installable : `public/manifeste.json` existe, `display:
standalone`, les icônes 192/512 sont là, et `/sw.js` est enregistré. Sur
Android, « Ajouter à l'écran d'accueil » donne déjà une application en plein
écran. Sur iPhone, « Sur l'écran d'accueil » aussi.

**Donc la question n'est pas « installable ou pas ». Elle est : qu'est-ce que
Capacitor apporte que le navigateur refuse ?**

## Ce que le navigateur refuse, et qui compte vraiment pour BIA

| Ce qui manque | Aujourd'hui | Avec Capacitor |
|---|---|---|
| **Micro en arrière-plan** | perdu dès que l'écran s'éteint | tenable |
| **Notifications iPhone sans installation** | impossible | possible |
| **Écran qui ne s'éteint pas** | Screen Wake Lock, refusé par Safari sans geste (`veille.refuse` l'a montré) | garanti par le système |
| **Reconnaissance vocale du système** | non | oui (et gratuite) |
| **Présence sur l'App Store / Play Store** | non | oui |
| **Micro après un appel entrant** | la session tombe | reprise possible |

Les trois premières lignes sont des douleurs **déjà constatées et mesurées**
chez lui, pas des hypothèses.

## Ce que ça coûte, dit avant de commencer

1. **Un Mac avec Xcode et un compte développeur Apple à 99 $/an.** Sans lui,
   aucune application iPhone ne s'installe autrement qu'en PWA. C'est une
   dépense récurrente, et c'est la première décision à prendre.
2. **Deux chaînes de construction de plus** (Xcode, Android Studio) et une
   révision Apple à chaque version — comptée en jours, pas en minutes. BIA
   change aujourd'hui plusieurs fois par jour ; ce rythme-là devient
   impossible pour la partie native.
3. **Le service worker ne sert plus à rien** dans l'enveloppe native : les
   notifications passent par APNs et FCM, donc par un deuxième chemin
   d'envoi à écrire et à maintenir — en plus de celui qui vient d'être fait.

## Ce que je propose : trois étapes, et on s'arrête quand ça suffit

### Étape 1 — finir la PWA (aucun coût, aucune dépendance)

Avant d'ajouter une enveloppe, prendre ce qui est gratuit :
- un écran « Installer BIA » qui explique le geste, par téléphone (Safari →
  Partager → Sur l'écran d'accueil ; Chrome → Installer) ;
- `display: "standalone"` est déjà là ; ajouter les captures d'écran du
  manifeste pour que l'invite d'installation d'Android soit plus riche ;
- vérifier que les rappels sonnent une fois installée — c'est **le test qui
  décide de la suite**. S'ils sonnent, l'étape 2 devient optionnelle.

### Étape 2 — l'enveloppe Capacitor, sans rien réécrire

Capacitor charge l'application Next.js **depuis `app.khalam.app`**, pas depuis
un paquet figé : on garde donc le déploiement Render et les mises à jour
instantanées, et on n'ajoute que ce que le navigateur refuse.

    @capacitor/core, /cli, /ios, /android
    @capacitor/push-notifications     notifications sans installation PWA
    @capacitor/keep-awake             l'écran, garanti
    @capacitor/app                    reprise après un appel entrant

Travail réel attendu : la détection « suis-je dans l'enveloppe ou dans le
navigateur » dans un seul module, pour que **le même code serve les deux** —
sinon on se retrouve avec deux BIA qui dérivent, ce qu'il a interdit pour les
moteurs et qui vaut autant ici.

### Étape 3 — le micro en arrière-plan, et seulement si on le veut

C'est la seule étape qui touche à l'audio, donc la plus risquée pour ce qui
marche aujourd'hui. À ne faire qu'après l'étape 2 publiée et éprouvée, et
seulement s'il veut vraiment parler à BIA écran éteint. Apple refuse les
applications qui déclarent un micro en arrière-plan sans raison évidente : il
faudra justifier l'usage dans la fiche de l'App Store.

## Ce que je ne ferai pas sans sa réponse

- **Payer les 99 $/an**, ni créer un compte développeur Apple.
- **Figer BIA dans un paquet** : l'enveloppe chargera le site, pour garder le
  rythme de déploiement actuel.
- **Toucher à l'audio** avant que les étapes 1 et 2 soient éprouvées.

## Les trois questions qui décident

1. Les rappels sonnent-ils, une fois BIA installée sur l'écran d'accueil ?
   **Si oui, l'étape 2 attend.**
2. Veut-il une présence sur l'App Store et le Play Store — pour être trouvé,
   pas seulement pour installer ?
3. Accepte-t-il les 99 $/an et une révision Apple par version ?
