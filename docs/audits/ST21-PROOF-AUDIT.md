# ST21 card proof audit

This ledger records executable card-local evidence against the committed catalog and rules implementation. Structural checks are called out separately from live state behavior.

| Card | Evidence | Score |
| --- | --- | --- |
| ST21-01 | Live optional inherited return and exactly-one ADVENTURE trash return, including refusal. | 10/10 |
| ST21-02 | Live opponent non-Tamer memory-gain restriction with Tamer exception. | 10/10 |
| ST21-03 | Live security clause removes exactly two sources and leaves target source-less. | 10/10 |
| ST21-04 | Live one-source return boundary, trigger-gated optional attack refusal, and nested Alliance/attack proof. | 10/10 |
| ST21-05 | Live Tamer play and once-per-turn DP reduction, including free play on evolution. | 10/10 |
| ST21-06 | Live 6000-DP exclusion boundary, 7000-DP placement with two Tamer colors, and both trigger shapes. | 10/10 |
| ST21-07 | Live exact ADVENTURE discard cost and draw-two behavior plus inherited DP. | 10/10 |
| ST21-08 | Live three-color warp digivolution and inherited DP increase. | 10/10 |
| ST21-09 | Live 5000-DP suspension/deck-bottom boundary, corrected ADVENTURE trigger conditions, optional refusal, and inherited Alliance proof. | 10/10 |
| ST21-10 | Live alternate digivolution gates, inherited draw/trash attack behavior, and negative threshold. | 10/10 |
| ST21-11 | Live level-4 return scaling, Blast Digivolve shape, and optional level-4-or-lower trash play on attack. | 10/10 |
| ST21-12 | Live memory, cost reduction, and security play behavior. | 10/10 |
| ST21-13 | Live cost reduction, Rush grant, and security play behavior. | 10/10 |
| ST21-14 | Live reveal/add/bottom/place and Delay/security clauses. | 10/10 |
| ST21-15 | Live face-up security DP, exchange, and trash play behavior. | 10/10 |

All ST21 cards now have live clause evidence; structural checks remain supplementary to observable state assertions.

Reproducible full focused command, run serially:

```text
pnpm --filter @aegis/api exec vitest run src/cards/ST21 --pool=forks --maxWorkers=1 --no-file-parallelism
```

Result: 16 test files passed, 74 tests passed. The final additions prove
ST21-04 mandatory Alliance selection, ally suspension/payment, optional attack
refusal, and positive play/evolution triggers; ST21-11 also has live Blast
Digivolution proof.

Coordinator closeout: ST21-04 now verifies the source-specific optional prompt,
Alliance attacker identity, ally suspension, surviving combat and two actual
security checks for both play and evolution events. The evolution fixture has
a neutral draw deck. ST21-06 waits for the queued play to resolve before checking
the >6000-DP negative. ST21-11 performs a real Counter-window Blast Digivolution
with memory unchanged.

Final serial conformance + ST18 + ST21 run: 60 files, 523 tests passed
(387 conformance, 62 ST18, 74 ST21). Shared/web and API type checks passed after
shared import cleanup. Changed-file lint/format and diff checks passed at integration.
