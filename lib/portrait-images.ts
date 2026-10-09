export function planchesDuPortrait(persona: string, tenue: string): string[] {
  if (persona === "rara") return ["rara-24", "rara-gestes-24", "rara-mains-24", "rara-mains2-24", "rara-mains3-24"].map(n => "/" + n + ".webp");
  const suffix = tenue === "nouvelle" ? "-nouvelle" : tenue === "wax" ? "-wax" : "";
  return ["/bia-24" + suffix + ".webp", "/bia-gestes-24" + suffix + ".webp",
    "/bia-mains-24" + suffix + ".webp", "/bia-mains2-24" + (suffix || "-wax") + ".webp",
    ...(tenue === "nouvelle" ? ["/bia-mains3-24-nouvelle.webp"] : [])];
}
const images = new Map<string, Promise<HTMLImageElement>>();
export function chargerPortrait(persona: string, tenue: string): Promise<HTMLImageElement[]> {
  const sources = [...planchesDuPortrait(persona, tenue), ...(persona === "rara" ? [1, 2, 3, 4].map(n => `/rara-intro-${n}.webp`) : [])];
  return Promise.all(sources.map(src => {
    let pending = images.get(src);
    if (!pending) {
      pending = new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
          const decoded = typeof image.decode === "function" ? image.decode() : Promise.resolve();
          decoded.then(() => resolve(image), reject);
        };
        image.onerror = () => reject(new Error("Image du portrait indisponible"));
        image.src = src;
      });
      images.set(src, pending);
      pending.catch(() => { if (images.get(src) === pending) images.delete(src); });
    }
    return pending;
  }));
}
