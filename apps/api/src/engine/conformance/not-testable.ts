import { markNotTestable, type NonEmptyString } from "./_kb.js";

/**
 * The manifest of KB chunks that carry no normative rule content, and so are
 * permanently out of scope for behavioral conformance tests — not because they're
 * hard to test, but because there is nothing in them to test. Every entry needs a
 * real, specific reason; see `NonEmptyString` on `reason` (empty reasons don't
 * compile).
 *
 * Seeded by reading `data/kb/rules-index.json` directly (not by
 * skimming the PDFs) and classifying every `comprehensive-*` chunk with under 40
 * characters of text as either the title page, a table-of-contents dot-leader
 * entry, or a bare section/chapter heading with no body text of its own (the
 * heading and its body land in separate chunks — see README). `manual-*` and
 * `glossary-*` chunks were checked too: neither source has a title-page-only or
 * dot-leader-only chunk (their first chunks already carry dense content), so
 * nothing from those sources is seeded here.
 *
 * Importing this module registers every entry with the `_kb.ts` runtime registry
 * as a side effect, so any test file (chapter tests or `_kb.meta.test.ts`) that
 * imports it causes these ids to count as not-testable in that process.
 */
interface NotTestableEntry {
  id: string;
  reason: string;
}

function entry<Reason extends string>(id: string, reason: NonEmptyString<Reason>): NotTestableEntry {
  return { id, reason };
}

export const NOT_TESTABLE: readonly NotTestableEntry[] = [
  entry(
    "comprehensive-0000",
    "Title page: document title and version stamp only, no rule content.",
  ),

  // Table of contents: each chunk is one dot-leader line ("N. Title .......... page"),
  // reproducing a heading that has its own real content chunk later in the document.
  entry("comprehensive-0001", "Table of contents dot-leader entry, not rule content."),
  entry("comprehensive-0002", "Table of contents dot-leader entry, not rule content."),
  entry("comprehensive-0003", "Table of contents dot-leader entry, not rule content."),
  entry("comprehensive-0004", "Table of contents dot-leader entry, not rule content."),
  entry("comprehensive-0005", "Table of contents dot-leader entry, not rule content."),
  entry("comprehensive-0006", "Table of contents dot-leader entry, not rule content."),
  entry("comprehensive-0007", "Table of contents dot-leader entry, not rule content."),
  entry("comprehensive-0008", "Table of contents dot-leader entry, not rule content."),
  entry("comprehensive-0009", "Table of contents dot-leader entry, not rule content."),
  entry("comprehensive-0010", "Table of contents dot-leader entry, not rule content."),
  entry("comprehensive-0011", "Table of contents dot-leader entry, not rule content."),
  entry("comprehensive-0012", "Table of contents dot-leader entry, not rule content."),
  entry("comprehensive-0013", "Table of contents dot-leader entry, not rule content."),
  entry("comprehensive-0014", "Table of contents dot-leader entry, not rule content."),
  entry("comprehensive-0015", "Table of contents dot-leader entry, not rule content."),
  entry("comprehensive-0016", "Table of contents dot-leader entry, not rule content."),
  entry("comprehensive-0017", "Table of contents dot-leader entry, not rule content."),
  entry("comprehensive-0018", "Table of contents dot-leader entry, not rule content."),

  // Bare chapter/section headings: the PDF chunker (tools/kb/index-rules.mjs) starts a
  // fresh chunk at every heading, so a short numbered heading with nothing else in it
  // is just the label — the body text lives in the following chunk(s).
  entry("comprehensive-0019", 'Bare chapter heading ("1. Game Overview"), body is in later chunks.'),
  entry("comprehensive-0026", 'Bare section heading ("1-4. Items Required for the Game"), no body.'),
  entry("comprehensive-0033", 'Bare section heading ("2-3. Information Written on Cards"), no body.'),
  entry("comprehensive-0053", 'Bare chapter heading ("3. Game Areas"), body is in later chunks.'),
  entry("comprehensive-0067", 'Bare chapter heading ("4. Basic Game Terminology"), body is in later chunks.'),
  entry("comprehensive-0099", 'Bare chapter heading ("5. Game Preparation"), body is in later chunks.'),
  entry("comprehensive-0102", 'Bare chapter heading ("6. Game Procedures"), body is in later chunks.'),
  entry("comprehensive-0111", 'Bare chapter heading ("7. Playing a Card"), body is in later chunks.'),
  entry("comprehensive-0123", 'Bare chapter heading ("8. Digivolution"), body is in later chunks.'),
  entry("comprehensive-0136", 'Bare chapter heading ("9. Using Cards"), body is in later chunks.'),
  entry("comprehensive-0139", 'Bare chapter heading ("10. Link"), body is in later chunks.'),
  entry("comprehensive-0142", 'Bare chapter heading ("11. Attacking"), body is in later chunks.'),
  entry("comprehensive-0150", 'Bare chapter heading ("12. Blocking"), body is in later chunks.'),
  entry("comprehensive-0152", 'Bare chapter heading ("13. Security Checks"), body is in later chunks.'),
  entry("comprehensive-0156", 'Bare chapter heading ("15. Effect Rules"), body is in later chunks.'),
  entry("comprehensive-0161", 'Bare section heading ("15-4. Effect States"), no body.'),
  entry("comprehensive-0182", 'Bare section heading ("15-10. Effect Targets"), no body.'),
  entry("comprehensive-0192", 'Bare section heading ("15-14. Effect Icons"), no body.'),
  entry("comprehensive-0198", 'Bare section heading ("15-15. Rules for Effect Text"), no body.'),
  entry("comprehensive-0263", 'Bare chapter heading ("17. Rule Checks"), body is in later chunks.'),
  entry("comprehensive-0266", 'Bare chapter heading ("18. Other Information"), body is in later chunks.'),
];

for (const { id, reason } of NOT_TESTABLE) {
  markNotTestable(id, reason);
}
