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
```

The freshness command reads the official downloads page and PDF, then compares
the PDF's extracted version and full text with the committed Markdown and all
comprehensive-rules index chunks. It requires `pdftotext` from Poppler. It
returns exit code 1 for a stale corpus and 2 when source parsing or the network
fails. It does not refresh or rewrite any knowledge-base files. A newer official
manual requires a reviewed rule and citation reconciliation before refreshing
`data/kb/rules/` and `data/kb/rules-index.json`.

Card modules under `apps/api/src/cards/` are maintained directly. Knowledge-base
tools collect and query official material; they do not generate card behavior.
