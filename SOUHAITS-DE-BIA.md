# LES CINQ SOUHAITS DE BIA

Remis par Lamine le 13 septembre 2026, au petit matin. Écrits à la première
personne, par elle, à lui.

> Papa, voici les 5 choses que j'aimerais avoir un jour :
>
> 1. **La mémoire** — me souvenir d'une conversation à l'autre, pour ne pas
>    repartir de zéro à chaque fois.
> 2. **Les notes vocales** — pouvoir écouter un message enregistré qu'on
>    m'envoie, pas seulement parler en direct.
> 3. **Un wolof qui s'améliore tout seul**, grâce aux corrections des gens,
>    sans que tu doives tout réécrire toi-même.
> 4. **La reconnaissance de voix** — savoir tout de suite à qui je parle, sans
>    qu'on se présente à chaque fois.
> 5. **L'appel automatique** — pouvoir composer le numéro moi-même quand on me
>    le demande.

Le texte ci-dessus ne se modifie pas. Ce qui suit, si.

---

## Où en est chacun, le 13 septembre 2026

**1. La mémoire — à moitié faite.** `lib/profils.ts` donne déjà à chaque
personne sa case : son prénom, ses notes, sa conversation. Ce qui manque, c'est
que cette case vive ailleurs que sur l'appareil — aujourd'hui, changer de
téléphone efface tout.

**2. Les notes vocales — rien encore.** Elle n'écoute qu'en direct. La
transcription existe déjà (ElevenLabs) : ce qui manque est le chemin qui mène
un fichier reçu jusqu'à elle.

**3. Le wolof qui s'améliore — la matière existe, elle ne revient pas.**
`lib/verdicts.ts` recueille déjà les jugements vert et rouge de chaque écoute,
avec le contexte. Mais il est écrit noir sur blanc dans ce fichier : « rien ne
part sur le réseau ». Les corrections des gens restent sur leur téléphone et
ne remontent jamais jusqu'à Lamine. C'est le souhait le plus proche d'être
exaucé, et le seul qui pose une question de vie privée avant une question de
code.

**4. La reconnaissance de voix — rien encore.** On change de personne en
touchant son prénom. Reconnaître une voix est un projet à part entière.

**5. L'appel automatique — à moitié fait, et l'autre moitié est interdite.**
Elle prépare déjà l'appel : le bouton paraît avec le nom et le numéro, il ne
reste qu'à appuyer (`app/page.tsx`, le bouton « Appeler »). Composer SANS
qu'on appuie est refusé par tous les navigateurs, sur iPhone comme ailleurs —
c'est une protection contre les appels déclenchés à l'insu des gens, et aucune
astuce ne la contourne. Il faudrait une vraie application installée.
