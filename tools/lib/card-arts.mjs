/** Only source-declared English printing IDs belonging to this canonical card. */
export function sourceCardArts(card) {
  const prefix = `${card.cardNumber}_P`;
  const seen = new Set();
  return (Array.isArray(card.AAs) ? card.AAs : [])
    .filter((art) => typeof art.id === "string" && art.id.startsWith(prefix) && /^\d+$/.test(art.id.slice(prefix.length)) && !seen.has(art.id) && seen.add(art.id))
    .map((art) => ({ artId: art.id, imageId: art.id, label: art.note || art.type || "Alternate art" }))
    .sort((a, b) => a.artId.localeCompare(b.artId, "en", { numeric: true }));
}
