# BIA dans une vraie application — iPhone et Android

Lamine, le 17 septembre 2026 : *« je pense qu'avec ça, on aura plus d'accès au
micro. Et on pourra installer directement sur un téléphone certains fichiers
pour l'aider à réagir beaucoup plus vite. »*

Les deux sont vrais. Ce dossier est la première étape, et elle ne coûte rien.

## Ce que ce dossier est, et ce qu'il n'est pas

C'est une **enveloppe**. BIA reste exactement ce qu'elle est aujourd'hui :
`app.khalam.app`, sur Render, avec son serveur, ses routes et ses sons. On ne
réécrit rien, on ne duplique rien, on ne déploie rien de nouveau.

L'enveloppe ouvre cette même adresse, mais dans une fenêtre du téléphone au
lieu de Safari — et c'est ça qui change tout, parce que c'est l'application qui
demande la permission du micro, pas une page web.

**Ce dossier ne fait pas partie de la construction de Next.js.** Il a son propre
`package.json`, et `natif` est écarté dans le `tsconfig.json` de la racine.
Render ne le regarde pas, et ne peut pas casser à cause de lui.

## Ce qu'on va vérifier en premier, avant toute dépense

Une seule question, et elle décide de tout le reste :

> **Est-ce que le micro de BIA se comporte mieux dans l'application que dans
> Safari ?**

À l'intérieur d'une application iOS, la page ne tourne plus dans Safari mais
dans un `WKWebView`. L'accès au micro y obéit à d'autres règles. Ça marche —
mais il faut que la permission soit déclarée et accordée du côté natif, et
c'est précisément ce qu'on ne pouvait pas faire jusqu'ici.

Si ça ne s'améliore pas : on s'arrête là, on n'a rien payé, on a perdu une
soirée. Si ça s'améliore : alors seulement le compte Apple (99 $/an) et le
compte Google (25 $ une fois) valent la peine.

## Ce qu'il faut sur le Mac

- **Node** — déjà là.
- **Xcode**, depuis le Mac App Store, pour la partie iPhone. C'est un gros
  téléchargement (plusieurs gigaoctets) : lance-le avant d'aller dormir.
- **CocoaPods** : `sudo gem install cocoapods` (ou `brew install cocoapods`).
- Pour Android : **Android Studio**. Pas nécessaire pour le premier essai —
  commence par l'iPhone, c'est ton téléphone.

## Les commandes, dans l'ordre

Depuis `natif/` :

```bash
npm install
npx cap add ios          # crée le projet Xcode
npx cap sync ios
npx cap open ios         # ouvre Xcode
```

Dans Xcode : choisis ton iPhone branché en haut, puis le bouton ▶.

La première fois, iOS refusera de lancer une application d'un développeur
inconnu. Sur le téléphone : *Réglages → Général → VPN et gestion de
l'appareil → fais confiance à ton compte*.

**Aucun compte payant n'est nécessaire pour cet essai.** Un compte Apple
gratuit suffit pour installer sur ton propre téléphone ; l'application expire
au bout de sept jours, ce qui est largement assez pour répondre à la question
du micro.

## Les permissions, et pourquoi elles doivent être écrites à la main

Capacitor crée le projet iOS, mais les textes de permission sont à toi — c'est
ce que l'utilisateur lira dans la fenêtre du téléphone.

Dans Xcode, ouvre `ios/App/App/Info.plist` et ajoute :

| Clé | Texte proposé (à corriger si tu veux) |
|---|---|
| `NSMicrophoneUsageDescription` | BIA a besoin du micro pour t'entendre parler. |
| `NSCameraUsageDescription` | BIA a besoin de l'appareil photo pour lire les papiers que tu lui montres. |
| `NSPhotoLibraryUsageDescription` | BIA a besoin de tes photos pour lire les papiers que tu lui envoies. |

Pour Android, dans `android/app/src/main/AndroidManifest.xml` :

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
<uses-permission android:name="android.permission.CAMERA" />
```

## Ce que ça NE règle pas, et il faut le savoir avant

- **Le modèle et la voix restent au bout du réseau.** Anthropic et Soynade ne
  bougent pas d'un pouce. Les 3 secondes de modèle et les 3,9 de voix restent
  exactement les mêmes. Ce qui devient possible, c'est de mettre **les sons
  déjà enregistrés dans l'application** — et ceux-là deviennent instantanés,
  même sans connexion. C'est l'étape d'après, et c'est là qu'est la vitesse.
- **Apple et les codes d'accès.** Apple exige que ce qui débloque des
  fonctions *dans* l'application passe par ses achats intégrés, avec sa
  commission. Un code acheté sur khalam.app puis saisi dans l'application
  entre dans ce cadre et se fait examiner de près.

  J'avais d'abord dit à Lamine que c'était simplement interdit. **Sa correction
  du 17 septembre est plus juste que ma phrase**, et elle ouvre trois portes au
  lieu d'une — à examiner le jour de la soumission, pas avant :

  1. **Les achats intégrés d'Apple**, avec sa commission. Le chemin
     ordinaire.
  2. **Les codes promotionnels officiels d'Apple.** Apple permet d'engendrer
     des codes qui débloquent un achat intégré, saisis dans l'App Store ou
     dans l'application. L'expérience « je donne un code à quelqu'un » — qui
     est son idée depuis le début — serait conservée, mais portée par le
     système de chaque magasin.
  3. **Une application gratuite, compagnon d'un service web payant** : aucun
     achat dans l'application, aucun appel à acheter ailleurs, seulement une
     connexion. Apple prévoit ce cas, mais il dépend de la nature exacte du
     service et de la façon dont l'application se présente. À ne pas tenir
     pour acquis sans examen.

  Les règles varient aussi selon la région. Dans tous les cas : c'est une
  décision de modèle économique, pas de technique, et elle est à Lamine. Elle
  ne se pose qu'au moment de publier — **pas pour l'essai sur son propre
  téléphone**, qui ne passe par aucun magasin.

## L'étape d'après, si le micro est concluant

1. Embarquer les sons du répertoire **dans** l'application (`server.url`
   disparaît, on sert les fichiers depuis le téléphone et on n'appelle le
   serveur que pour ce qui l'exige vraiment).
2. Le micro qui continue quand l'écran se verrouille.
3. Un mot de réveil — « Hey BIA » — impossible dans une page web.
