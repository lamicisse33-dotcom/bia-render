/* Le module wolof est de Lamine, écrit en JavaScript avec ses propres tests.
   On ne le réécrit pas en TypeScript : on décrit seulement ce qu'il expose,
   pour que le reste du projet le voie sans avoir à y toucher. */
declare module "*/bia-wolof-numbers.mjs" {
  export function integerToWolof(value: number | string): string;
  export function numberToWolof(value: number | string): string;
  export function wolofToInteger(text: string): number;
  export function moneyToWolof(value: number | string): string;
  export function wolofMoneyToCfa(text: string): number;
  export function percentToWolof(value: number | string): string;
  export function calculationToWolof(left: number, operator: string, right: number, result?: number): string;
  export function moneyCalculationToWolof(left: number, operator: string, right: number, result?: number): string;
  export const BIA_WOLOF_NUMBER_RULES: Readonly<Record<string, unknown>>;
}
