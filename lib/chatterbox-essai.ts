// Explicit opt-in for this page only. Opening BIA normally keeps its voice.
export function essaiChatterboxMasculin(): boolean {
  return typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("voix") === "chatterbox-homme";
}

export function routeVoixBia(): string {
  return essaiChatterboxMasculin() ? "/api/chatterbox-test/bia" : "/api/voix";
}
