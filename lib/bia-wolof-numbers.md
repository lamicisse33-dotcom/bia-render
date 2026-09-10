# BIA Wolof Numbers

Module JavaScript prêt à intégrer pour faire lire et reconnaître les nombres en wolof urbain de Dakar.

## Fonctions

- `integerToWolof(nombre)` : entier vers wolof, jusqu’à 999 999 999 999.
- `numberToWolof(nombre)` : entier ou nombre décimal.
- `wolofToInteger(texte)` : wolof généré par le module vers un entier.
- `moneyToWolof(montantCFA)` : convertit le montant selon `1 dërëm = 5 F CFA`.
- `wolofMoneyToCfa(texte)` : reconvertit un montant en dërëm vers sa valeur CFA.
- `percentToWolof(valeur)` : ajoute `pour cent`.
- `calculationToWolof(a, opérateur, b, résultat)` : lit un calcul complet.
- `moneyCalculationToWolof(a, opérateur, b, résultat)` : lit un calcul monétaire en dërëm.

## Intégration

```js
import {
  numberToWolof,
  moneyToWolof,
  percentToWolof,
  calculationToWolof,
} from "./bia-wolof-numbers.mjs";

numberToWolof(1250000);
// benn million ak ñaari téeméeri junni ak juróom-fukki junni

moneyToWolof(25000);
// juróomi junni dërëm

moneyToWolof(100);
// ñaar-fukki dërëm

percentToWolof(25);
// ñaar-fukk ak juróom pour cent

calculationToWolof(25, "+", 10, 35);
// ñaar-fukk ak juróom plus fukk, égal ñett-fukk ak juróom
```

## Règles retenues pour BIA

- Wolof urbain de Dakar.
- `benn million` pour 1 000 000.
- Pour l’argent en wolof : `1 dërëm = 5 francs CFA`.
- Exemples : `5 F = benn dërëm`, `100 F = ñaar-fukki dërëm`.
- Si un montant n’est pas divisible par 5, le reste est précisé en francs CFA :
  `26 F = juróomi dërëm ak benn franc CFA`.
- `pour cent` conservé en français.
- Les opérateurs compliqués restent en français : `plus`, `moins`, `multiplié par`, `divisé par`, `égal`.
- La conversion en `dërëm` s’applique seulement aux montants, jamais aux nombres ordinaires.

## Vérification

```bash
node test.mjs
```

Le test vérifie les nombres validés, les grands nombres, les décimaux, les montants, les pourcentages et les calculs.
