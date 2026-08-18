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
```

Card modules under `apps/api/src/cards/` are maintained directly. Knowledge-base
tools collect and query official material; they do not generate card behavior.
