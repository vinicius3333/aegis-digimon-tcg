// Parse a single card's Q&A page into an array of rulings.
//
// Page shape (repeated):
//   <dt class="qa_category">[On Play] ...</dt>        (optional grouping label)
//   <dl class="questions"><dt>Q5012</dt><dd>QUESTION<span>Sep. 5, 2025 Updated</span></dd></dl>
//   <dl class="answer"><dt>A5012</dt><dd>ANSWER</dd></dl>
//   <div class="relation"> ... <a href="...card_no=EX10-010">EX10-010</a> ... </div>
//
// Related cards are associated to a ruling by taking the card_no links that
// appear between this ruling's answer and the next ruling (or end of results).

import { textOf, linesOf, parseDate } from "./html.mjs";

const TOKEN_RE = new RegExp(
  [
    '<dt class="qa_category">([\\s\\S]*?)<\\/dt>',
    [
      '<dl class="questions">\\s*<dt>([^<]+)<\\/dt>\\s*<dd>([\\s\\S]*?)<\\/dd>\\s*<\\/dl>',
      '\\s*<dl class="answer">\\s*<dt>([^<]+)<\\/dt>\\s*<dd>([\\s\\S]*?)<\\/dd>\\s*<\\/dl>',
    ].join(""),
  ].join("|"),
  "g",
);

const DATE_SPAN_RE = /<span>([^<]*)<\/span>/;
const CARD_NO_RE = /card_no=([A-Za-z0-9-]+)/g;

function categoryIsForCard(categoryHtml, cardId) {
  // The server joins the numeric database id and card number with no text separator
  // (`522901LM-029 Yellow Scramble`), so a word-boundary match would reject the
  // requested category. A category is only its card-number/name label, making this
  // exact substring the appropriate identity check.
  return textOf(categoryHtml).includes(cardId);
}

function relatedCardsBetween(html, fromIndex, toIndex, selfCardId) {
  const window = html.slice(fromIndex, toIndex);
  const found = new Set();
  let match;
  CARD_NO_RE.lastIndex = 0;
  while ((match = CARD_NO_RE.exec(window))) {
    if (match[1] !== selfCardId) found.add(match[1]);
  }
  return [...found];
}

export function parseQa(html, selfCardId) {
  const matches = [];
  let token;
  let inRequestedCardCategory = false;
  TOKEN_RE.lastIndex = 0;
  while ((token = TOKEN_RE.exec(html))) {
    // A search result can include one or more related cards after the requested card. Their
    // rulings are visible in the same document, but they are not rulings OF `selfCardId`.
    // Keep category identity while scanning so related-card Q&A cannot be attributed to the
    // requested card (LM-029's search page also renders EX8-037's Q4737/Q4738).
    if (token[1] !== undefined) {
      inRequestedCardCategory = categoryIsForCard(token[1], selfCardId);
      continue;
    }
    if (!inRequestedCardCategory) continue;
    matches.push({
      qno: textOf(token[2]),
      questionHtml: token[3],
      answerHtml: token[5],
      start: token.index,
      end: TOKEN_RE.lastIndex,
    });
  }

  return matches.map((entry, i) => {
    const dateMatch = entry.questionHtml.match(DATE_SPAN_RE);
    const question = textOf(entry.questionHtml.replace(DATE_SPAN_RE, ""));
    // Related links live between this ruling's answer and the next ruling's start.
    const nextStart = i + 1 < matches.length ? matches[i + 1].start : html.length;
    return {
      qno: entry.qno,
      question,
      answer: linesOf(entry.answerHtml),
      date: dateMatch ? parseDate(dateMatch[1]) : null,
      related: relatedCardsBetween(html, entry.end, nextStart, selfCardId),
    };
  });
}

export function emptyQaPage(html) {
  // A card with no rulings still renders the results container but no question dls.
  return !/<dl class="questions">/.test(html);
}
