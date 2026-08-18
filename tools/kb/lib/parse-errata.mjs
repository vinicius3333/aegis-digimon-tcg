// Parse the errata page into { [cardId]: entry }.
//
// Page shape (per card):
//   <h4 class="... subTit_rule" id="EX02-053">Jun. 24, 2022<br>EX2-053 ADR-08 Optimizer</h4>
//   ... <div class="beforeCol"><b>Before</b><br>OLD</div>
//       <div class="afterCol"><b>After</b><br>NEW</div>
//   optional: <dt>Errata Notes</dt><dd>NOTE</dd>
//
// The id="" attribute is an anchor slug with inconsistent formatting (EX02-053,
// P-123_P2, Errata-01), so the canonical cardId is taken from the visible heading
// text after the <br> ("EX2-053 ..."). Headings with no card number (general
// errata announcements) are skipped. A card may carry multiple before/after pairs.

import { textOf, linesOf, parseDate } from "./html.mjs";
import { SOURCES } from "./paths.mjs";

const HEADING_RE = /<h4[^>]*class="[^"]*subTit_rule[^"]*"[^>]*>([\s\S]*?)<\/h4>/g;
const BEFORE_RE = /<div class="beforeCol">([\s\S]*?)<\/div>/g;
const AFTER_RE = /<div class="afterCol">([\s\S]*?)<\/div>/g;
const NOTES_RE = /<dt>\s*Errata Notes\s*<\/dt>\s*<dd>([\s\S]*?)<\/dd>/i;
const CARD_ID_RE = /^([A-Z][A-Z0-9]*-\d+[A-Z0-9]*)\b/;

function cleanCol(html) {
  // Drop the leading <b>Before</b> / <b>After</b> label, keep the text.
  return linesOf(html.replace(/<b>\s*(Before|After)\s*<\/b>/i, ""));
}

function parseHeading(inner) {
  const [datePart, ...rest] = inner.split(/<br\s*\/?>/i);
  const date = parseDate(textOf(datePart));
  const remainder = textOf(rest.join(" "));
  const idMatch = remainder.match(CARD_ID_RE);
  if (!idMatch) return null; // general announcement, not a card
  const cardId = idMatch[1];
  const name = remainder.slice(idMatch[0].length).trim();
  return { cardId, name, date };
}

export function parseErrata(html) {
  const headings = [];
  let match;
  HEADING_RE.lastIndex = 0;
  while ((match = HEADING_RE.exec(html))) {
    headings.push({ inner: match[1], start: match.index, end: HEADING_RE.lastIndex });
  }

  const result = {};
  for (let i = 0; i < headings.length; i++) {
    const heading = parseHeading(headings[i].inner);
    if (!heading) continue;

    const bodyEnd = i + 1 < headings.length ? headings[i + 1].start : html.length;
    const body = html.slice(headings[i].end, bodyEnd);

    const befores = [...body.matchAll(BEFORE_RE)].map((m) => cleanCol(m[1]));
    const afters = [...body.matchAll(AFTER_RE)].map((m) => cleanCol(m[1]));
    if (befores.length === 0 && afters.length === 0) continue;

    const pairCount = Math.max(befores.length, afters.length);
    const changes = [];
    for (let j = 0; j < pairCount; j++) {
      changes.push({ before: befores[j] ?? null, after: afters[j] ?? null });
    }

    const notesMatch = body.match(NOTES_RE);
    result[heading.cardId] = {
      cardId: heading.cardId,
      name: heading.name,
      date: heading.date,
      changes,
      notes: notesMatch ? linesOf(notesMatch[1]) : null,
      source: SOURCES.errata,
    };
  }
  return result;
}
