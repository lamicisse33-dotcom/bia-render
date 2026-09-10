import assert from "node:assert/strict";
import {
  integerToWolof, numberToWolof, wolofToInteger,
  moneyToWolof, wolofMoneyToCfa, percentToWolof,
  calculationToWolof, moneyCalculationToWolof,
} from "./bia-wolof-numbers.mjs";

const expected = new Map([
  [11, "fukk ak benn"],
  [17, "fukk ak juróom-ñaar"],
  [25, "ñaar-fukk ak juróom"],
  [50, "juróom-fukk"],
  [99, "juróom-ñeent-fukk ak juróom-ñeent"],
  [250, "ñaari téeméer ak juróom-fukk"],
  [1000, "junni"],
  [15000, "fukki junni ak juróomi junni"],
  [25000, "ñaar-fukki junni ak juróomi junni"],
  [300000, "ñetti téeméeri junni"],
  [1250000, "benn million ak ñaari téeméeri junni ak juróom-fukki junni"],
]);

for (const [value, wolof] of expected) {
  assert.equal(integerToWolof(value), wolof);
  assert.equal(wolofToInteger(wolof), value);
}

for (const value of [0, 1, 9, 10, 35, 100, 101, 999, 2026, 999999, 2000000, 1000000000, 999999999999]) {
  assert.equal(wolofToInteger(integerToWolof(value)), value, `aller-retour ${value}`);
}

assert.equal(numberToWolof("12,05"), "fukk ak ñaar virgule tus juróom");
const moneyExpected = new Map([
  [1, "benn franc CFA"],
  [5, "benn dërëm"],
  [10, "ñaari dërëm"],
  [25, "juróomi dërëm"],
  [100, "ñaar-fukki dërëm"],
  [250, "juróom-fukki dërëm"],
  [500, "téeméeri dërëm"],
  [1000, "ñaari téeméeri dërëm"],
  [25000, "juróomi junni dërëm"],
  [26, "juróomi dërëm ak benn franc CFA"],
]);
for (const [amount, wolof] of moneyExpected) {
  assert.equal(moneyToWolof(amount), wolof);
  assert.equal(wolofMoneyToCfa(wolof), amount);
}
assert.equal(percentToWolof(25), "ñaar-fukk ak juróom pour cent");
assert.equal(calculationToWolof(25, "+", 10, 35), "ñaar-fukk ak juróom plus fukk, égal ñett-fukk ak juróom");
assert.equal(moneyCalculationToWolof(100, "+", 50, 150), "ñaar-fukki dërëm plus fukki dërëm, égal ñett-fukki dërëm");

console.log("Tous les tests BIA Wolof Numbers sont réussis.");
