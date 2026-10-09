// Only fixed public acknowledgements: never store a user's teaching material.
const PHRASES = new Set([
  "D'accord papa, mode apprentissage activé.",
  "D'accord papa, je reviens en mode normal.",
  "C'est mémorisé, papa.",
  "D'accord papa.",
]);
export class CacheAccusesLecon<T> {
  private entries = new Map<string, {value:T; expires:number}>();
  constructor(private now = Date.now) {}
  get(key:string, phrase:string):T | undefined {
    if (!PHRASES.has(phrase)) return undefined;
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expires <= this.now()) { this.entries.delete(key); return undefined; }
    return entry.value;
  }
  set(key:string, phrase:string, value:T) {
    if (!PHRASES.has(phrase)) return;
    if (this.entries.size >= 16 && !this.entries.has(key)) this.entries.delete(this.entries.keys().next().value!);
    this.entries.set(key, {value, expires:this.now()+300_000});
  }
}
