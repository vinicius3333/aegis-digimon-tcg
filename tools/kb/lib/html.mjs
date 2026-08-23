// Minimal, dependency-free HTML text utilities. The target pages are static and
// regularly structured, so targeted extraction beats pulling in a parser. Each
// page parser validates its output (expected counts, known entries) to catch
// markup drift instead of silently producing garbage.

const NAMED_ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  hellip: "…",
  mdash: "—",
  ndash: "–",
};

export function decodeEntities(input) {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (match, body) => {
    if (body[0] === "#") {
      const code = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, body) ? NAMED_ENTITIES[body] : match;
  });
}

export function collapseWhitespace(input) {
  return input.replace(/\s+/g, " ").trim();
}

// Strip tags to plain text. <br> becomes the separator (default single space).
export function textOf(html, { brTo = " " } = {}) {
  const withBreaks = html.replace(/<br\s*\/?>/gi, brTo);
  const stripped = withBreaks.replace(/<[^>]+>/g, "");
  return collapseWhitespace(decodeEntities(stripped));
}

// Like textOf but keeps <br>-delimited lines (used for multi-sentence answers).
export function linesOf(html) {
  const withBreaks = html.replace(/<br\s*\/?>/gi, "\n");
  const stripped = withBreaks.replace(/<[^>]+>/g, "");
  return decodeEntities(stripped)
    .split("\n")
    .map((line) => collapseWhitespace(line))
    .filter(Boolean)
    .join("\n");
}

const MONTHS = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

// "May 29, 2026" | "Sep. 5, 2025" | "September 01, 2025" -> "2026-05-29"
export function parseDate(input) {
  const match = input.match(/([A-Za-z]+)\.?\s+(\d{1,2}),\s*(\d{4})/);
  if (!match) return null;
  const month = MONTHS[match[1].slice(0, 3).toLowerCase()];
  if (!month) return null;
  const day = String(Number(match[2])).padStart(2, "0");
  return `${match[3]}-${String(month).padStart(2, "0")}-${day}`;
}
