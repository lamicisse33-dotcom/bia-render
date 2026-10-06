export type ChoixVoixBia = "piper" | "male" | "female";
const CLE_CHOIX = "bia-choix-voix-v1";

// The explicit choice in the app takes precedence over an old test link.
export function choixVoixBia(): ChoixVoixBia {
  if (typeof window === "undefined") return "piper";
  try {
    const saved = window.localStorage.getItem(CLE_CHOIX);
    if (saved === "piper" || saved === "male" || saved === "female") return saved;
  } catch { /* The original link can still work when storage is unavailable. */ }
  const query = new URLSearchParams(window.location.search).get("voix");
  return query === "chatterbox-homme" ? "male" : query === "chatterbox-femme" ? "female" : "piper";
}

export function choisirVoixBia(choice: ChoixVoixBia): boolean {
  if (typeof window === "undefined" || !["piper", "male", "female"].includes(choice)) return false;
  try {
    window.localStorage.setItem(CLE_CHOIX, choice);
    return window.localStorage.getItem(CLE_CHOIX) === choice;
  } catch { return false; }
}

export function essaiChatterboxActif(): boolean {
  return choixVoixBia() !== "piper";
}

export function voixChatterboxBia(): "male" | "female" {
  return choixVoixBia() === "female" ? "female" : "male";
}

export function routeVoixBia(): string {
  return essaiChatterboxActif() ? "/api/chatterbox-test/bia" : "/api/voix";
}
