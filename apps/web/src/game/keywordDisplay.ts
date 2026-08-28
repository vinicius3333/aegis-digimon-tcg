/** Convert a normalized server keyword into compact printed spelling for the UI. */
export function formatKeyword(keyword: string): string {
  return keyword
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^De Digivolve$/, "De-Digivolve")
    .replace(/^Digi Burst$/, "Digi-Burst");
}
