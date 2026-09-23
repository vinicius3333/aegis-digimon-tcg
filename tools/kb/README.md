# Rules knowledge base

The canonical normalized data lives in `data/kb/`:

- `rules-index.json` and `rules/` contain the official rules corpus;
- `qa.json` contains official card rulings;
- `errata.json` contains official corrections;
- `banlist.json` contains restriction history used by the runtime.

Useful commands:

```bash
node tools/kb/query.mjs card BT1-001
node tools/kb/query.mjs rules <term>
node tools/kb/scrape.mjs all
node tools/kb/index-rules.mjs
node tools/kb/check-rules-freshness.mjs
node tools/kb/check-conformance-citations.mjs
```

The freshness command reads the official downloads page and PDF, then compares
the PDF's extracted version and full text with the committed Markdown and all
comprehensive-rules index chunks. It requires `pdftotext` from Poppler. It
returns exit code 1 for a stale corpus and 2 when source parsing or the network
fails. It does not refresh or rewrite any knowledge-base files. A newer official
manual requires a reviewed rule and citation reconciliation before refreshing
`data/kb/rules/` and `data/kb/rules-index.json`.

The citation checker scans conformance tests and every card test containing a
`cite()` call under `apps/api/src/cards`. It verifies IDs, exact chunk hashes,
and review notes; it does not infer behavioral proof from those citations.

Card modules under `apps/api/src/cards/` are maintained directly. Knowledge-base
tools collect and query official material; they do not generate card behavior.

# Rule obligation inventory

`node tools/kb/rule-obligations.mjs --refresh` extracts each numbered clause in
the committed Comprehensive Rules index, deduplicates local Card Q&A by Q number
and exact ruling fingerprint, and records each local errata change in
`data/kb/rule-obligations.json`. `--check` verifies source version, exact text,
card IDs, corpus hashes, record completeness, status fields, and the four
explicit cross-mechanism review targets. Refresh the rules index and local
Q&A/errata first after an official source change.

Every new or changed clause starts as `gap`. A source version change clears all
reviewed statuses, even if some clauses have identical wording. An unchanged
refresh keeps reviewed fields. `proven` requires a reviewed observable
precondition, expected result, and existing behavioral test path; a `cite()` call
or a passing test filename alone never changes the status. Reviewers must
inspect the assertion and its branches before marking a record proven. `gap`
and `not-testable` require a reason and owner; the latter is reserved for
non-normative headings, definitions, or metadata after review. The checker
validates record shape and source freshness, not the semantic strength of a
human proof claim.

The inventory includes 1,119 unique hyphenated comprehensive clauses, four
explicit interactions, 6,622 distinct local Card Q&A rulings, and 92 local
errata changes. Six numbered-rule records now carry reviewed behavioral proof;
the remaining records are explicit gaps. The Q&A and errata corpora retain their
August 19 full-crawl timestamps and unverified currency metadata; the later
scoped Q5331 correction does not establish September completeness. The official
manual, Glossary, Rule Q&A, unrecorded Card Q&A/errata changes, individual
branches inside a ruling, and further cross-mechanism combinations remain
outside this inventory. Each needs its own review before a completeness claim.
The counts printed by `--check` are inventory classifications, not a coverage
percentage or proof that the simulator implements the rules.
