# Quatre fois le même son, dans quatre emballages

Ces fichiers ne servent qu'à **une** question, et ils ne servent qu'à l'essai
de l'oreille (`/api/essai-oreille`) : **quels formats audio le moteur de
transcription accepte-t-il ?**

C'est la question qui décide de toute l'architecture. Le téléphone enregistre
en `webm/opus` sur Android et en `mp4/aac` sur iPhone. La documentation de
Soynade annonce `wav`, `mp3`, `flac`. Si leur API accepte quand même les deux
formats du téléphone, il n'y a rien à convertir. Sinon, il faut installer
`ffmpeg` sur le serveur et convertir à chaque tour — une dépendance de plus et
environ 50 ms par tour.

Aucune annonce ne remplace un appel : ces quatre fichiers le font.

| Fichier | Ce qu'il imite | Poids |
|---|---|---|
| `format-webm-opus.webm` | ce qu'enregistre un Android (opus 24 kbps mono) | 4 ko |
| `format-mp4-aac.m4a` | ce qu'enregistre un iPhone (aac 32 kbps mono) | 5 ko |
| `format-wav16.wav` | la conversion proposée (PCM 16 bits, 16 kHz mono) | 29 ko |
| `format-mp3.mp3` | le témoin : le format dont on sait qu'il passe | 12 ko |

## Ce qu'ils NE mesurent pas

**Ils ne mesurent aucune qualité de transcription.** C'est un « mmm » de Kha,
sans un seul mot : il n'y a pas de texte attendu, donc pas de taux de mots
faux à calculer. Ce qu'on lit, c'est uniquement le code de réponse du serveur
— accepté ou refusé, et le motif.

La qualité, elle, se mesure sur les dix enregistrements parlés du répertoire,
dont on connaît le texte mot pour mot. C'est l'autre moitié du même essai.

## D'où ils viennent

Du même son : `sons-mis-de-cote/reflexion-2.mp3`, une des découpes de la prise
du 17 septembre, mise de côté parce que trop courte pour servir de souffle.
Elle sert ici, et c'est très bien : c'est une vraie voix, pas un bip.

Le poids du wav est instructif à lui seul : **29 ko contre 4 ko pour l'opus.**
Sept fois plus. C'est la raison pour laquelle on ne convertit PAS dans le
téléphone — sur une connexion mobile à Dakar, ces sept fois se paient en
secondes d'attente à chaque phrase.
