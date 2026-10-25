export type ChoixVoixBia = "piper-web" | "male" | "female";
const CLE_CHOIX = "bia-choix-voix-v1";

// The explicit choice in the app takes precedence over an old test link.
export function choixVoixBia(): ChoixVoixBia {
  if (typeof window === "undefined") return "female";
  try {
    const saved = window.localStorage.getItem(CLE_CHOIX);
    // Retired experiment: return its users to Khalam Voice without changing other choices.
    if (saved === "speecht5-web") {
      window.localStorage.setItem(CLE_CHOIX, "female");
      return "female";
    }
    if (saved === "piper") {
      window.localStorage.setItem(CLE_CHOIX, "piper-web");
      return "piper-web";
    }
    if (saved === "piper-web" || saved === "male" || saved === "female") return saved;
  } catch { /* The original link can still work when storage is unavailable. */ }
  const query = new URLSearchParams(window.location.search).get("voix");
  return query === "chatterbox-homme" ? "male" : query === "chatterbox-femme" ? "female" : "female";
}

export function choisirVoixBia(choice: ChoixVoixBia): boolean {
  if (typeof window === "undefined" || !["piper-web", "male", "female"].includes(choice)) return false;
  try {
    window.localStorage.setItem(CLE_CHOIX, choice);
    return window.localStorage.getItem(CLE_CHOIX) === choice;
  } catch { return false; }
}

export function essaiChatterboxActif(): boolean {
  const choice=choixVoixBia(); return choice === "male" || choice === "female";
}

export function voixChatterboxBia(): "male" | "female" {
  return choixVoixBia() === "female" ? "female" : "male";
}

export function routeVoixBia(): string {
  if(choixVoixBia()==="piper-web")return "/api/piper-web/synthese";
  return essaiChatterboxActif() ? "/api/chatterbox-test/bia" : "/api/voix";
}
