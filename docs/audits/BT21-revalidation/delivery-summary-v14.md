# BT21 final delivery

**102/102 cards at 10/10 (1020/1020 points).** Every committed catalog ID has an IR-only module, a focused test file, and an independently reviewed evidence report. No unresolved fidelity or delivery finding remains.

- Complete gate: **2603/2603 assertions across 150 files** — 1226 BT21 card assertions and 1377 mechanism assertions.
- Shared/API/web typecheck: passed.
- Scoped formatting, lint and format check: passed on 180 changed source/data paths; nonblocking warnings are retained in the log.
- BT21 effects check: 102 synchronized records, 22 semantic changes against the baseline, zero changes outside the set.
- Baseline, working-tree and staged diff whitespace checks: passed.
- Final 34 atomic card proof commits and prior correction commits: pushed, with maps in `card-proof-commits-v14.json` and earlier checkpoint maps.
- Verified pushed gate: `81a5f5cc65c0ffdb68ca0c4f079ec4191f959ac1`.
- Review PR: [#4722](https://github.com/vinicius3333/aegis-digimon-tcg/pull/4722), ready for review.

The card and mechanism suite uses a single worker and a 2048 MB heap. From this worktree root, reproduce the exact executed suite:

```sh
python3 - <<'PYRUN'
import json, os, subprocess
from pathlib import Path
manifest = json.loads(Path('docs/audits/BT21-revalidation/collection-command-v14.json').read_text())
subprocess.run(manifest['args'], env={**os.environ, **manifest['env']}, check=True)
PYRUN
```

Per-card reports and ledger entries include isolated reproduction commands and their counts from the synchronized execution. Recalculate all 102 rows with `node docs/audits/BT21-revalidation/recalculate.mjs`.

Some timing boundaries use isolated engine-event supplements where the ordinary public intent is correctly turn-gated. These are documented explicitly and paired with public producer and shared-mechanism proofs; no impossible public producer is claimed. Tai's reactivation after returning to deck is a source-zone proof, while its intrinsic once-per-turn setting is covered by IR and mechanism evidence. Historical draft claims and failure logs remain available for traceability and are superseded by the final gate.
