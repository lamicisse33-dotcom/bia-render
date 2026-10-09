/** Ouverture d'un brouillon dans l'application choisie, jamais une preuve d'envoi. */
export function lienMessage(canal: "mail" | "sms" | "whatsapp", destinataire: string, texte: string, objet = ""): string | null {
  const cible = destinataire.trim();
  if (canal === "mail") {
    if (!/^[^\s@<>?&#]+@[^\s@<>?&#]+\.[^\s@<>?&#]+$/.test(cible)) return null;
    return `mailto:${encodeURIComponent(cible)}?subject=${encodeURIComponent(objet)}&body=${encodeURIComponent(texte)}`;
  }
  if (!/^\+?[\d ()-]+$/.test(cible)) return null;
  const numero = cible.replace(/[ ()-]/g, "");
  if (!/^\+?\d{6,15}$/.test(numero)) return null;
  if (canal === "whatsapp") {
    // Aucun indicatif deviné : l'utilisateur peut écrire à un proche à l'étranger.
    if (!/^\+[1-9]\d{6,14}$/.test(numero)) return null;
    return `https://wa.me/${numero.slice(1)}?text=${encodeURIComponent(texte)}`;
  }
  return `sms:${numero}?body=${encodeURIComponent(texte)}`;
}
