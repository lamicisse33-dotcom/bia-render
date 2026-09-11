/**
 * BIA Wolof Numbers
 * Génération et reconnaissance des nombres en wolof urbain de Dakar.
 * Plage sûre : de -999 999 999 999 à 999 999 999 999.
 */

const UNITS = [
  "tus", "benn", "ñaar", "ñett", "ñeent",
  "juróom", "juróom-benn", "juróom-ñaar", "juróom-ñett", "juróom-ñeent",
];

const LINK_UNITS = {
  1: "benni", 2: "ñaari", 3: "ñetti", 4: "ñeenti", 5: "juróomi",
  6: "juróom-benni", 7: "juróom-ñaari", 8: "juróom-ñetti", 9: "juróom-ñeenti",
};

const UNIT_VALUES = new Map([
  ["tus", 0], ["neen", 0], ["zéro", 0], ["zero", 0],
  ["benn", 1], ["benni", 1], ["ñaar", 2], ["ñaari", 2],
  ["ñett", 3], ["ñetti", 3], ["ñeent", 4], ["ñeenti", 4],
  ["juróom", 5], ["juróomi", 5], ["juróom-benn", 6], ["juróom-benni", 6],
  ["juróom-ñaar", 7], ["juróom-ñaari", 7], ["juróom-ñett", 8],
  ["juróom-ñetti", 8], ["juróom-ñeent", 9], ["juróom-ñeenti", 9],
]);

function assertSafeInteger(value) {
  if (!Number.isSafeInteger(value)) throw new TypeError("Le nombre doit être un entier JavaScript sûr.");
  if (Math.abs(value) > 999_999_999_999) throw new RangeError("Plage prise en charge : ±999 999 999 999.");
}

function under100(n) {
  if (n < 10) return UNITS[n];
  const tens = Math.floor(n / 10);
  const unit = n % 10;
  const tensText = tens === 1 ? "fukk" : `${UNITS[tens]}-fukk`;
  return unit ? `${tensText} ak ${UNITS[unit]}` : tensText;
}

function under1000(n) {
  if (n < 100) return under100(n);
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const hundredsText = hundreds === 1 ? "téeméer" : `${LINK_UNITS[hundreds]} téeméer`;
  return rest ? `${hundredsText} ak ${under100(rest)}` : hundredsText;
}

function thousandsUnderMillion(n) {
  const parts = [];
  const hundredThousands = Math.floor(n / 100_000);
  const tenThousands = Math.floor((n % 100_000) / 10_000);
  const thousands = Math.floor((n % 10_000) / 1_000);
  const rest = n % 1_000;

  if (hundredThousands) parts.push(
    hundredThousands === 1 ? "téeméeri junni" : `${LINK_UNITS[hundredThousands]} téeméeri junni`
  );
  if (tenThousands) parts.push(
    tenThousands === 1 ? "fukki junni" : `${UNITS[tenThousands]}-fukki junni`
  );
  if (thousands) parts.push(
    thousands === 1 ? "junni" : `${LINK_UNITS[thousands]} junni`
  );
  if (rest) parts.push(under1000(rest));
  return parts.join(" ak ") || "tus";
}

function scaleCount(n, label) {
  if (n === 1) return `benn ${label}`;
  if (n < 10) return `${LINK_UNITS[n]} ${label}`;
  return `${under1000(n)} ${label}`;
}

export function integerToWolof(value) {
  const n = Number(value);
  assertSafeInteger(n);
  if (n === 0) return "tus";
  if (n < 0) return `moins ${integerToWolof(-n)}`;

  const parts = [];
  const billions = Math.floor(n / 1_000_000_000);
  const millions = Math.floor((n % 1_000_000_000) / 1_000_000);
  const rest = n % 1_000_000;
  if (billions) parts.push(scaleCount(billions, "milliard"));
  if (millions) parts.push(scaleCount(millions, "million"));
  if (rest) parts.push(thousandsUnderMillion(rest));
  return parts.join(" ak ");
}

export function numberToWolof(value) {
  const raw = typeof value === "number" ? String(value) : String(value).trim().replace(/\s/g, "").replace(",", ".");
  if (!/^-?\d+(?:\.\d+)?$/.test(raw)) throw new TypeError("Format numérique non reconnu.");
  const negative = raw.startsWith("-");
  const unsigned = negative ? raw.slice(1) : raw;
  const [wholeRaw, decimalRaw] = unsigned.split(".");
  const whole = Number(wholeRaw);
  assertSafeInteger(whole);
  let result = integerToWolof(whole);
  if (decimalRaw !== undefined) {
    const decimals = [...decimalRaw].map((digit) => UNITS[Number(digit)]).join(" ");
    result = `${result} virgule ${decimals}`;
  }
  return negative ? `moins ${result}` : result;
}

function under100BeforeNoun(n) {
  if (n < 10) return n === 1 ? "benn" : LINK_UNITS[n];
  const tens = Math.floor(n / 10);
  const unit = n % 10;
  const tensText = tens === 1 ? "fukk" : `${UNITS[tens]}-fukk`;
  if (unit) return `${tensText} ak ${LINK_UNITS[unit]}`;
  return tens === 1 ? "fukki" : `${UNITS[tens]}-fukki`;
}

function under1000BeforeNoun(n) {
  if (n < 100) return under100BeforeNoun(n);
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const hundredsText = hundreds === 1 ? "téeméer" : `${LINK_UNITS[hundreds]} téeméer`;
  if (rest) return `${hundredsText} ak ${under100BeforeNoun(rest)}`;
  return hundreds === 1 ? "téeméeri" : `${LINK_UNITS[hundreds]} téeméeri`;
}

function integerBeforeNoun(value) {
  if (value < 1_000) return under1000BeforeNoun(value);
  const regular = integerToWolof(value);
  // Les groupes junni, million et milliard portent déjà leur liaison.
  return regular;
}

export function moneyToWolof(value) {
  const raw = typeof value === "number" ? value : Number(String(value).replace(/\s/g, ""));
  if (!Number.isSafeInteger(raw)) throw new TypeError("Le montant CFA doit être un entier sûr.");

  const sign = raw < 0 ? "moins " : "";
  const amount = Math.abs(raw);
  if (amount === 0) return "tus franc CFA";

  const derem = Math.floor(amount / 5);
  const remainingFrancs = amount % 5;
  const parts = [];
  if (derem) parts.push(`${integerBeforeNoun(derem)} dërëm`);
  if (remainingFrancs) {
    parts.push(`${integerToWolof(remainingFrancs)} ${remainingFrancs === 1 ? "franc CFA" : "francs CFA"}`);
  }
  return `${sign}${parts.join(" ak ")}`;
}

function normalizeBeforeNounNumber(text) {
  const unitForms = new Map([
    ["benni", "benn"], ["ñaari", "ñaar"], ["ñetti", "ñett"], ["ñeenti", "ñeent"],
    ["juróomi", "juróom"], ["juróom-benni", "juróom-benn"],
    ["juróom-ñaari", "juróom-ñaar"], ["juróom-ñetti", "juróom-ñett"],
    ["juróom-ñeenti", "juróom-ñeent"],
  ]);
  let s = text.trim();
  for (const [linked, plain] of unitForms) {
    if (s === linked) return plain;
    if (s.endsWith(` ak ${linked}`)) return `${s.slice(0, -(linked.length))}${plain}`;
  }
  if (s === "fukki") return "fukk";
  if (s.endsWith("-fukki")) return `${s.slice(0, -1)}`;
  if (s === "téeméeri") return "téeméer";
  if (s.endsWith(" téeméeri")) return `${s.slice(0, -1)}`;
  return s;
}

export function wolofMoneyToCfa(text) {
  let s = String(text).toLowerCase().trim().replace(/\s+/g, " ");
  if (!s) throw new TypeError("Montant vide.");
  let sign = 1;
  if (s.startsWith("moins ")) { sign = -1; s = s.slice(6); }

  let total = 0;
  const marker = " dërëm";
  const index = s.indexOf(marker);
  if (index >= 0) {
    total += wolofToInteger(normalizeBeforeNounNumber(s.slice(0, index))) * 5;
    s = s.slice(index + marker.length).replace(/^ ak /, "").trim();
  }
  if (s) {
    const francs = s.replace(/ francs? cfa$/, "").trim();
    if (!francs && total === 0) throw new TypeError("Montant wolof non reconnu.");
    if (francs) total += wolofToInteger(francs);
  }
  return sign * total;
}

export function percentToWolof(value) {
  return `${numberToWolof(value)} pour cent`;
}

const OPERATORS = {
  "+": "plus", plus: "plus",
  "-": "moins", moins: "moins",
  "*": "multiplié par", "×": "multiplié par", fois: "multiplié par",
  "/": "divisé par", "÷": "divisé par",
};

export function calculationToWolof(left, operator, right, result = undefined) {
  const op = OPERATORS[String(operator).toLowerCase()];
  if (!op) throw new TypeError("Opérateur accepté : +, -, *, ×, / ou ÷.");
  const expression = `${numberToWolof(left)} ${op} ${numberToWolof(right)}`;
  return result === undefined ? expression : `${expression}, égal ${numberToWolof(result)}`;
}

export function moneyCalculationToWolof(left, operator, right, result = undefined) {
  const op = OPERATORS[String(operator).toLowerCase()];
  if (!op) throw new TypeError("Opérateur accepté : +, -, *, ×, / ou ÷.");
  const expression = `${moneyToWolof(left)} ${op} ${moneyToWolof(right)}`;
  return result === undefined ? expression : `${expression}, égal ${moneyToWolof(result)}`;
}

function parseDigitWord(word) {
  const value = UNIT_VALUES.get(word);
  if (value === undefined) throw new TypeError(`Mot numérique non reconnu : ${word}`);
  return value;
}

function parseUnder100(text) {
  const normalized = text.trim();
  if (UNIT_VALUES.has(normalized)) return parseDigitWord(normalized);
  const parts = normalized.split(" ak ");
  const tensWord = parts[0];
  const unit = parts[1] ? parseDigitWord(parts[1]) : 0;
  if (tensWord === "fukk") return 10 + unit;
  const match = tensWord.match(/^(.+)-fukk$/);
  if (!match) throw new TypeError(`Nombre inférieur à 100 non reconnu : ${text}`);
  return parseDigitWord(match[1]) * 10 + unit;
}

function parsePlaceTerm(term) {
  const t = term.trim();
  if (t === "junni") return 1_000;
  if (t === "fukki junni") return 10_000;
  if (t === "téeméeri junni") return 100_000;
  if (t === "téeméer") return 100;

  let match = t.match(/^(.+) téeméeri junni$/);
  if (match) return parseDigitWord(match[1]) * 100_000;
  match = t.match(/^(.+)-fukki junni$/);
  if (match) return parseDigitWord(match[1]) * 10_000;
  match = t.match(/^(.+) junni$/);
  if (match) return parseDigitWord(match[1]) * 1_000;
  match = t.match(/^(.+) téeméer$/);
  if (match) return parseDigitWord(match[1]) * 100;
  return parseUnder100(t);
}

function parseAdditive(text) {
  const chunks = text.split(" ak ");
  let total = 0;
  for (let i = 0; i < chunks.length; i += 1) {
    let candidate = chunks[i];
    if ((candidate === "fukk" || candidate.endsWith("-fukk")) && i + 1 < chunks.length && UNIT_VALUES.has(chunks[i + 1])) {
      candidate += ` ak ${chunks[++i]}`;
    }
    total += parsePlaceTerm(candidate);
  }
  return total;
}

export function wolofToInteger(text) {
  let s = String(text).toLowerCase().trim().replace(/\s+/g, " ");
  if (!s) throw new TypeError("Texte vide.");
  let sign = 1;
  if (s.startsWith("moins ")) { sign = -1; s = s.slice(6); }

  let total = 0;
  for (const [label, scale] of [["milliard", 1_000_000_000], ["million", 1_000_000]]) {
    const marker = ` ${label}`;
    const index = s.indexOf(marker);
    if (index >= 0) {
      const coefficient = s.slice(0, index);
      total += parseAdditive(coefficient) * scale;
      s = s.slice(index + marker.length).replace(/^ ak /, "").trim();
    }
  }
  if (s) total += parseAdditive(s);
  assertSafeInteger(total);
  return sign * total;
}

export const BIA_WOLOF_NUMBER_RULES = Object.freeze({
  locale: "wo-SN",
  style: "wolof urbain de Dakar",
  million: "benn million",
  currency: "dërëm",
  currencyRule: "1 dërëm = 5 francs CFA",
  percent: "pour cent",
  zero: "tus",
  maxSafeValue: 999_999_999_999,
});
