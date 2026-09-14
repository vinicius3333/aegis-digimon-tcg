/** Convert a normalized server keyword into compact printed spelling for the UI. */
export function formatKeyword(keyword: string): string {
  return keyword
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^De Digivolve$/, "De-Digivolve")
    .replace(/^Digi Burst$/, "Digi-Burst");
}

/** Show the signed keyword parameter, preserving modifiers below the zero-check floor. */
export function formatResolvedKeyword(keyword: string, modifier?: number, label?: string): string {
  if (keyword === "SecurityAttack" && modifier !== undefined) {
    return `${formatKeyword(keyword)} ${modifier >= 0 ? "+" : ""}${modifier}`;
  }
  return label ?? formatKeyword(keyword);
}
