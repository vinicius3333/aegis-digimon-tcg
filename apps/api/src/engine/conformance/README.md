# KB conformance suite

Behavioral tests here assert engine behavior against specific chunks of the
rules knowledge base (`data/kb/rules-index.json` — the Comprehensive
Rules, Official Rule Manual, and Glossary scraped from world.digimoncard.com by
`tools/kb/index-rules.mjs`), instead of against card text or invented
semantics. A test **cites** the chunk id it is proving, e.g.:

```ts
import { cite } from "./_kb.js";

it("a blocked attack does not deal damage", () => {
  const chunk = cite("comprehensive-0148", "blocking redirects damage, doesn't cancel it");
  // ... drive the engine, assert on `chunk.text` if useful, assert on state ...
});
```

Tests cite **chunk ids**, not rule numbers (`13-1-8-3-2`). One chunk's `text`
commonly spans several sub-rule numbers, and only ids are indexed — there's no
supported way to look a chunk up by rule number.

## Files

- `_kb.ts` — the loader and citation registry. Exported API (other test files
  code directly against this, so treat it as load-bearing):

  ```ts
  function loadRuleIndex(): RuleIndex;
  function getChunk(id: string): RuleChunk; // throws on unknown id
  function cite(id: string, note?: string): RuleChunk; // throws on unknown id, records id
  function markNotTestable<Reason extends string>(id: string, reason: NonEmptyString<Reason>): void;
  function getCitedIds(): string[];
  function getNotTestableIds(): string[];
  function getCitations(): readonly { id: string; note?: string; file?: string }[];
  function getNotTestableReason(id: string): string | undefined;
  function getObservedFiles(): string[];
  ```

- `not-testable.ts` — the seeded manifest of chunk ids with no normative content
  (title page, table-of-contents entries, bare headings). Importing it (even
  just for its side effect) registers every entry with `_kb.ts`.
- `_kb.meta.test.ts` — the meta-test: sanity-checks the citation registry itself
  and reports (does not yet enforce) coverage. See "Coverage reporting" below.
- Chapter test files (`*.test.ts`, one per rules chapter/topic) live alongside
  these and are **not** created by this change — they're written by other
  builders against the `_kb.ts` API above.

## Path resolution

`_kb.ts` resolves `data/kb/rules-index.json` from its own module URL
(`import.meta.url` → `fileURLToPath` → walk up to the repo root), not from
`process.cwd()`. This matches the existing pattern in
`src/engine/effectlessManifest.test.ts`. It means the path is correct no matter
where `vitest`/`pnpm` is invoked from, at the cost of one hardcoded relative
depth (`../../../../..` from `apps/api/src/engine/conformance/`) that must be
updated if this file ever moves.

## Chunk ids are positional — read this before citing one

`tools/kb/index-rules.mjs` assigns chunk ids like this (line ~185):

```js
id: `${source.id}-${String(chunks.length).padStart(4, "0")}`;
```

That's **not** a stable content hash or a rule number — it's "the Nth chunk
emitted for this source, in emission order." Emission order depends on how the
PDF's text extracts and how the chunker's heading/word-count heuristics split
it. Concretely, this means:

- A KB re-scrape (`node tools/kb/index-rules.mjs`) that hits a differently
  formatted PDF (a rules errata update changes pagination, `pdftotext`/OCR
  extracts a paragraph break differently, etc.) can shift every chunk id
  **after** the change point, silently. `comprehensive-0148` today might be a
  completely different rule after a re-scrape, and nothing would fail — the id
  still resolves, just to the wrong text.
- This is a real fragility for any test that cites an id and never re-validates
  what that id currently means.

**Mitigation used here:** `getChunk()` throws loudly on an id that no longer
exists after a re-scrape (a shrink or reorder that drops an id), which catches
the easy case. It does **not** catch the hard case — an id that still exists
but now points at different text. That would need each citation to also carry
a content fingerprint (e.g. a short hash of the chunk's `text` at citation
time, stored alongside the id and checked in `cite()`), so a re-scrape that
silently swaps a chunk's content under a stable id fails the citation instead
of passing on the wrong rule. That fingerprint check is **not implemented** in
this change — it's flagged here as the next hardening step before this suite
is trusted long-term, not as something to be skipped.

Until that mitigation lands: **after any KB re-scrape, re-run the full
conformance suite and manually diff `getCitations()` output against the new
index before trusting a green run.**

## Coverage reporting is a proxy, not proof

`_kb.meta.test.ts`'s coverage report (chunks that are neither cited nor
marked not-testable) is `console.log` output today, not an assertion. With
zero chapter test files existing yet, "coverage" would trivially be "almost
nothing is covered" — reporting that as a failure would just be noise. Per the
honesty contract in the repo root `AGENTS.md`: **this report is not proof of
coverage and must not be read as such.** It becomes meaningful, and should be
flipped to an enforcing `expect(...)`, once chapter test files exist and
citations accumulate — see the one-line change documented directly above the
report in `_kb.meta.test.ts`.

### The vacuous-cite-set hazard

`_kb.ts`'s citation registry is plain module-level state. `vitest.config.ts`
runs with `isolate: false`, which is what lets that state persist across test
FILES sharing one worker — but the `forks` pool still spreads files across
multiple worker **processes** (`poolOptions.forks.maxForks`, default 4). A
chapter file that lands in a different fork than `_kb.meta.test.ts` never
touches this process's registry. Naively computing a coverage residual from
"whatever this process happened to observe" could report near-100% missing
coverage when the real answer is fine — or, worse, once the report becomes an
enforcing assertion, it could pass a threshold for the wrong reason (most
chapter files' citations were simply invisible to this process, not absent).
That's the false green this guards against.

**The guard**, in `_kb.meta.test.ts`: every call to `cite()`/`markNotTestable()`
records the calling file's absolute path (`_kb.ts`'s `getObservedFiles()`, via
a call-stack walk). Before printing anything, the meta-test lists every
`*.test.ts` file that actually exists on disk in this directory (excluding
itself) and checks that every one of them appears in the observed-files set. If
any expected file is missing, the coverage report is skipped outright — with a
`console.warn` explaining why — rather than computed from a partial view.

This guard is conservative by construction: it can under-report ("unverifiable"
when the run was actually fine, e.g. this test evaluated before some chapter
file's tests executed) but it can never claim full coverage it didn't observe.
For a trustworthy report, run the suite in a single fork so every chapter file
and the meta-test share one process:

```bash
pnpm --filter @aegis/api test:conformance
```

which runs `vitest run src/engine/conformance --pool=forks
--poolOptions.forks.maxForks=1 --no-file-parallelism` — the same single-fork
shape mandated for this lane's own verification runs.
