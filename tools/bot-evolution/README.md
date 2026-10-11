# GEPA heuristic evolution

## Conditional deck pilots

`learn_pilots.py` uses the official GEPA custom-proposer interface without a model
or API calls. The desktop worker's `--describe-pilots` response discovers every
known, legal, implemented preset and reports excluded recipes with their reasons.
The generator preserves every rule of the certified generic policy and appends
one bounded preference scoped to actual cards in the deck: boss development,
boss security pressure, early Tamer development, or rookie development. These are
frozen hypotheses based on card kind and level, not claims about unmodeled effects.
Their advice states the exact hand, turn, security and memory conditions.

```sh
tools/bot-evolution/.venv/bin/python tools/bot-evolution/learn_pilots.py \
  --run-dir artifacts/bot-evolution/deck-pilots-v1 \
  --deck-pool artifacts/bot-evolution/gepa-balanced-v6/deck-pool.json \
  --desktop-host desktop \
  --node /home/vinicius/aegis-bot-lab/toolchain/node-v26.10.0-linux-x64/bin/node \
  --worker /path/to/frozen/checkout/apps/api/dist/bot/evolution/evaluateCli.js \
  --pairs 48 --gate-pairs 96 --held-out-pairs 2400 --attempt 1
```

The manifest freezes the entire deck and hypothesis family before any games.
Each block has two games, placing the pilot's own deck in each player seat; the
opponent directly uses the certified generic residual. A matched control arm
uses that same generic policy on the same seeds, decks and seats. This controls
for differing inherent deck strength. Train, validation and held-out opponent
decks are disjoint; mirrors are excluded. The gate uses fresh seeds outside the
training and validation splits. The approximate paired Wilson screen corrects
for all frozen hypotheses across the shared family's maximum three waves. Fresh
held-out activation uses a conservative empirical Bernstein lower bound on paired
seed-block differences in [-1, 1], with sample variance and the range-scaled
Maurer–Pontil correction. The lower bound must exceed zero. Its error budget is
`0.05/(3*number_of_decks)`. Before games, the manifest records uniformly sampled
held-out seeds without replacement from a reserved 100-million-seed domain.
The bound adjusts its delta by each deck's probability of unique independent seed
draws. The shared registry retains failed reservations and requires disjoint
held-out domains between waves. These are scoped pilot/control and opponent-split
results, not a new aggregate strength certificate or MCTS guide publication gate.

GEPA must finish every reserved hypothesis. Invalid games and transport timeouts
stop selection and retain their artifacts. Completed stages can be resumed only
with identical inputs; partial stages require diagnosis and a new run directory.
`--only-deck` executes a subset of the already frozen family without reducing its
multiple-comparison budget. `catalog.json` includes only distinct GEPA selections
that also pass the held-out bound. Resume and catalog assembly reconstruct every
completed GEPA selection, raw validation score, proposal gate, held-out score and
activation decision; altered summaries cannot enable a pilot. Rejected decks and custom lists continue to
use the unchanged certified generic fallback. Live catalogs route pilots by the
exact main-deck and egg-deck card multisets, reject unavailable presets, and refuse
two aliases that would overwrite the same multiset. A later wave needs a new run
directory, `--attempt 2` or `3`, and a disjoint `--seed-offset`, such as 100000000
or 200000000. Its family budgets stay fixed rather than resetting after rejection.

## Learning against the current balanced bot

`learn_balanced.py` evolves bounded score adjustments on top of the current
projected balanced policy. A neutral residual reproduces the control's actions,
seeded tie jitter, readiness guard, legal-action search and driver limits. Only
public observations and the learner's own visible cards reach learned rules.
The deterministic numeric pass precedes official GEPA API reflection. Reflection
edits conditions/card scopes; code owns numeric calibration and activation advice.

Run the orchestration locally with API credentials in the local environment;
all games execute on the desktop. Use a fresh run directory after engine or runner
changes. Balanced evaluations batch up to 32 isolated games per SSH process,
preserving each game's full-task cache identity, result and audit record.

```sh
tools/bot-evolution/.venv/bin/python tools/bot-evolution/learn_balanced.py \
  --run-dir artifacts/bot-evolution/gepa-balanced-v4 \
  --deck-pool artifacts/bot-evolution/gepa-balanced-v4/deck-pool.json \
  --node /home/vinicius/aegis-bot-lab/toolchain/node-v26.10.0-linux-x64/bin/node \
  --worker /home/vinicius/aegis-bot-lab/checkouts/gepa-delivery-68ed0fef6d/apps/api/dist/bot/evolution/evaluateCli.js \
  --pairs 96 --metric-calls 6144 --numeric-proposals 24
```

The 24-deck pool is a JSON array of legal, implemented repository deck IDs.
Each seed contributes four games: both deck assignments and both learner seats.
Train and selection use different opponent pairings. Certification excludes both
pairings in either orientation and uses fresh seeds. Invalid or timed-out games
remain unscored and prevent acceptance. The pinned GPT-4.1 snapshot uses a 4,096
completion-token limit and a conservative US$5 ledger shared across run directories.
The explicitly priced `--model gemini/gemini-3.1-pro-preview` alternative uses 8,192
tokens including thinking, medium reasoning, and conservative upper-context rates
from the [official pricing table](https://ai.google.dev/gemini-api/docs/pricing).
Switching providers preserves every reservation and the same total cap. Provider
failure stops the optimizer after one failed request and never selects a policy.
Before tuning, all validation seed blocks must pass a neutral-control seat-swap audit.
Neutral numeric rules explore both coefficient directions with code-authored advice.

When paid reflection is intentionally skipped, `--model deterministic` uses the
official GEPA custom-proposer interface with no model calls. Supply a frozen JSON
`--proposal-plan`, use `--numeric-proposals 0`, and reserve enough `--metric-calls`
for the entire plan. The plan records `origin: "deterministic-numeric"`, the pinned
`engineSha256`, `initialPolicySha256`, and a list of distinct `programs`. Only
bounded weights, authored advice and titles may change; features, conditions and
card scopes remain fixed. Record the training screen and construction method in
the plan for reproducibility. `--gate-pairs 384` supplies 1,536 fresh paired games
per hypothesis; the approximate Wilson screen corrects for the whole frozen plan.
GEPA additionally compares full training batches and selects on separate validation.
It stops after the last proposal completes, reports the attempted/completed count,
and refuses selection after a gate failure. Partial deterministic stages require a
fresh directory; exact-task game cache entries remain reusable.

`certify_balanced.py` requires the selected policy to reconstruct from an accepted
GEPA proposal and the actual GEPA validation result. API proposals reconstruct from
their pinned prompt/response after code calibration; deterministic proposals
reconstruct from their frozen numerical plan and a recomputed fresh paired gate.
The certificate records their different origins explicitly. It freezes
the program, engine, worker, evaluator, task list and lineage before execution.
One shared registry permits at most five candidate attempts and three fixed looks
at 1,200, 2,400 and 4,800 complete seed blocks. It accepts only when every game is
valid and the sole preregistered lower confidence bound exceeds 50% against the
current balanced control. Use `--attempt` once per frozen candidate; changed inputs
cannot reuse a reservation.

The certification bound is the empirical Bernstein bound in
[Maurer–Pontil (2009), Theorem 11](https://arxiv.org/pdf/0907.3740#page=4), applied
to one minus the mean score of each four-game block. It uses sample variance with
denominator `n-1` and permits differing deck distributions. Its per-look error
budget is `0.05/(5*3)`, further multiplied by the probability that all 4,800
independent seeds would be unique. That conditioning correction covers the actual
sampling without replacement. The protocol records the amendment from the training
manifest's provisional Hoeffding plan before any held-out candidate games. This
certificate concerns direct strength against current balanced; high-budget MCTS
guide publication remains a separate gate.

## Certified numeric policy

The delivered `programs/certified-balanced.json` catalog contains the actual GEPA
v6 selection: the projected balanced policy with a `sourceDp` residual weight of
`0.2`. The frozen numerical proposal plan used the official GEPA custom proposer
and made no model calls. Independent attempt 2 passed at the second preregistered
look: 5,036 wins and 4,564 losses in 9,600 valid games across 2,400 independent
four-game seed blocks. The family- and unique-seed-adjusted empirical Bernstein
lower bound is 50.5706%, with an observed win rate of 52.4583% against the current
projected balanced control. There were no invalid games, timeouts, rejections,
engine errors or inference fallbacks. The first 1,200-block look did not pass;
attempt 1 remains consumed and invalid due to its repaired projection defect.

The ordinary balanced app bot now uses `defaultBotOptions` and this certified
generic policy without requiring an environment option. Explicit policies and
custom profile weight sets keep their own choices; aggressive and defensive bots
continue using their corresponding projected profiles. Match and seat seed the
default policy, while the readiness guard, configured pacing and action limits
are preserved. No production deployment has occurred. An explicit catalog can
still override startup, with validation before room admission:

```sh
AEGIS_BOT_HEURISTIC="$PWD/apps/api/src/bot/evolution/programs/certified-balanced.json" pnpm dev
```

The catalog is generic, with no deck-specific pilots. This result establishes
aggregate strength on the frozen 24-deck distribution, not superiority for every
deck, aggressive/defensive profiles, tournaments or high-budget MCTS. It does not
authorize strict guide publication. The certificate describes its pinned historical
engine; integrating later main changes does not create a new certificate.

The committed [strength evidence](../../apps/api/src/bot/evolution/strength-evidence.json)
pins the policy, merged source/runtime, certifier, protocol, statistics and raw
batch hashes. [proof.tgz](evidence/balanced-v6/proof.tgz) contains the original
protocols, both fixed-look results, all 60 raw game batches and inputs, GEPA
selection/plan/gate evidence, provenance records and independent audits. The full
source/runtime archives remain in the local run directory with their hashes
pinned in those records.

The practice room now forwards the engine match seed to the configured policy;
this wiring was added after the frozen certificate without changing its decision
function. Desktop regressions verify actual startup, seeded policy selection,
accepted main actions and exact catalog/evaluator event equality in both seats.
The benchmark and ordinary default policy now seed decisions by match and seat.
Human opponents and real-time presentation differ from the benchmark.

## Historical matchups and identities

```sh
tools/bot-evolution/.venv/bin/python tools/bot-evolution/matchup_report.py \
  --proof tools/bot-evolution/evidence/balanced-v6/proof.tgz \
  --output-dir tools/bot-evolution/evidence/balanced-v6
```

The report verifies the pinned proof archive, certificate protocol, accepted fixed
look and all raw batch counts before writing `matchups.json` and the interactive
`matchups.html`. Its rows cover the historical 24-deck certificate distribution;
they describe candidate performance against the frozen balanced control rather
than certifying uplift for every deck. Matchup groups have their own sample sizes,
and uncertain rows remain inconclusive. Later main integration needs fresh games
before making new strength claims.

Names and portraits are independent of policy strength. The server resolves the
actual deck to a shared persona, and the lobby and game present that same identity.
See the [persona mapping and source rationale](../../packages/shared/src/bot/personas/README.md)
for Rina/Ulforce, other printed Tamer associations, Digimon portraits and fallback
behavior for custom or substituted recipes.

## Guarded MCTS prefix acceleration

The engine still reconstructs simulation state through real prefix replay. It can
reuse recorded main-action catalogs while replaying the exact, unsampled prefix.
The replay checks the expected seat, public information key and selected action
key; a mismatch invalidates that rollout. At the sampled root and beyond the
prefix, the authoritative engine enumerates actions. This reduces enumeration work
without changing hidden-information access or claiming a clone of runtime state.

The compiled `replayAccelerationBenchmark.js` accepts JSON on stdin. Benchmark
budgets 8, 32, 128 and 256 in `mode: "single-search-after-prefix"` with
`startAfterDecisions: 16` and paired enabled/disabled runs. Each measured game
contains exactly one search after the prefix; warm-up searches are excluded from
timing. Every rollout must complete, the recorded catalog path must execute, and
seeded events, actions and search reports must match. This mode measures the cost
of a bounded search inside a real game. `mode: "full-game"` searches every MCTS
decision and measures a different, more expensive workload. Neither benchmark
establishes playing strength; timings from an earlier runtime do not establish
speedup after a main integration.

## MCTS and pilot evolution

The official GEPA package evolves bounded JSON heuristics; the TypeScript
interpreter scores legal engine actions. Each rule contains plain English advice
for future strategy-guide publication. Candidate code is never executed.

The runner first trains a generic policy on composed random decks, then
coevolves Glowing Dawn and Toho Braves pilots. Each generation freezes an archive
of the other pilots; pilots face both that archive and an information-set MCTS
opponent. Training, model selection, and final evaluation use disjoint seeds.
Final evaluations compare the selected and initial policies on the same tasks.
Training adaptively screens search budgets up to 8 completed real-engine rollouts
per main choice by default. Strict publication requires a separate final budget of
at least 128 completed rollouts.
Incomplete search budgets, policy fallbacks, rejected intents, and truncated
games cannot produce valid fitness results.

MCTS reconstructs the engine by exact replay, then samples hidden copies uniformly
over unknown deck/hand/security slots under an open-decklist assumption. The
observer's hand, public zones, and face-up security stay fixed. Future shuffle
streams are resampled. This belief discards remembered hidden locations and
ordered-deck knowledge, rather than pinning cards to privileged server locations.
The other seat uses the candidate heuristic during rollouts. Search expands one
new edge per rollout and uses UCT and terminal-game reward backpropagation.

Search is currently applied to settled Main windows; other windows use the
rollout heuristic. Full engine replay is expensive. Logs report actual completed
and rejected simulations, and the run directory pins the compiled engine hash.
A low-budget smoke run is development evidence, not a validated strategy guide.

## Desktop execution

The user's Windows desktop is SSH host `desktop`, reached through Tailscale.
Run engine tests and simulations inside its WSL checkout with the provisioned
Node 26 environment `/home/vinicius/aegis-bot-lab/env.sh`. Keep each SSH/WSL job
attached until completion. Use one Vitest worker and a bounded Node heap.

LLM reflection can remain on the local machine while complete evaluations run on
the desktop. This keeps API credentials local, and sends one JSON configuration
per game over SSH, rather than transferring every action over the network.

Install Python dependencies with `uv sync --group dev` in this directory. For
the current isolated desktop checkout:

```sh
tools/bot-evolution/.venv/bin/python tools/bot-evolution/evolve.py \
  --run-dir artifacts/bot-evolution/desktop-gepa-smoke-8 \
  --desktop-host desktop \
  --node /home/vinicius/aegis-bot-lab/toolchain/node-v26.10.0-linux-x64/bin/node \
  --worker /home/vinicius/aegis-bot-lab/checkouts/gepa-2026-10-10-v2/apps/api/dist/bot/evolution/evaluateCli.js \
  --simulations 8 --metric-calls 512 --pairs 24 --generations 2 \
  --evaluation-timeout 21600 \
  --evaluation-workers 4 \
  --reflection-model session
```

The configured reflection model defaults to `openai/gpt-4.1`. Its credentials
are supplied through the local environment. A run directory can be resumed only
with the same engine and parameters; completed stage artifacts are reused and
GEPA retains its own checkpoint state. Use a fresh directory after code changes.
GEPA 0.0.27 does not checkpoint its random-number generator or shuffled batch
sampler. Restarting the same command can therefore change later optimization
choices even when it reuses completed evaluations. Keep a controlled run
uninterrupted; if interruption is unavoidable, record the resume in its evidence
instead of claiming an identical optimization trajectory.
Four bounded desktop workers evaluate independent games while preserving batch order.
A complete random-deck game exceeded the two-hour default deadline at 256
rollouts per search, so certification at high budgets needs a separate measured runtime budget.
The deadline is recorded in the run manifest. An execution timeout aborts
evaluation; it does not count as a heuristic loss. Valid exact-task games remain
reusable from the adapter cache when a fresh run uses a longer deadline.
A shared cache reuses only valid games with identical policy, task, engine, and
search budget; reflection additionally requires recorded traces. GEPA's internal
candidate/example-ID cache is disabled because list loaders reuse integer IDs
across training and validation. The adapter cache uses the full task instead.
After changing the optimizer protocol, reuse only valid exact-task game outputs
in a fresh run; do not migrate old optimizer checkpoints or selected stages.
Official GEPA
callbacks record proposed policies separately from the retained candidate pool.
Raw games, stderr logs, selected pilots, lineage, and held-out results remain
under the ignored run directory.

The training action and material-selection modules were adapted from
`feat/bot-bt26-chronomon` at `a2692dcbdf`. Its deployment changes were not imported.

## Research and current limits

- [GEPA adapter protocol](https://gepa-ai.github.io/gepa/guides/adapters/) and
  [official implementation](https://github.com/gepa-ai/gepa).
- [Information Set Monte Carlo Tree Search](https://pure.york.ac.uk/portal/en/publications/information-set-monte-carlo-tree-search/).
- [DCG Nexus](https://dcg-nexus.com/) lists Toho Braves and Glowing Dawn among
  its tracked archetypes for 27 September–4 October 2026 (checked 10 October).
  The exact pilot decks are pinned repository tournament lists, not claims that
  these lists are the strongest current builds.

A local experimental preview can use a completed low-budget run. It does not
establish improved playing strength. High-budget evaluation is still required
for ordinary guide publication.

## Experimental preview and live practice

For a completed paired run with at least eight simulations per search:

```sh
tools/bot-evolution/.venv/bin/python tools/bot-evolution/preview.py \
  --run-dir artifacts/bot-evolution/desktop-gepa-timeboxed-preview-8 \
  --base-url http://localhost:5173

AEGIS_BOT_HEURISTIC="$PWD/apps/api/src/bot/evolution/programs/preview.json" pnpm dev
```

Preview pages explicitly identify the limited evaluation and use `noindex`.
The preview renderer checks complete paired games, both player seats, matching
selected and control policies, and pinned engine and runner fingerprints. The
strict publisher below retains its minimum of 128 simulations.

The live catalog contains `schemaVersion: 1`, a `generic` heuristic and `pilots`
keyed by the exact supported deck version. A deck pilot is selected only when
the actual main and Digi-Egg card multisets match; other decks use the generic
policy. `AEGIS_BOT_HEURISTIC` and `AEGIS_BOT_CHECKPOINT` are mutually exclusive.
Restart the API after changing the catalog. Rejected actions disable the policy
for that match and use the standard bot fallback. Live games retain the normal
bot action cap and presentation pacing; the benchmark uses a pinned evaluation
engine and removes think delays. The live app is not an identical benchmark run.

## Guide publication

After the high-budget run completes, publish its selected policies and paired
held-out results to static HTML (crawlable without JavaScript):

```sh
tools/bot-evolution/.venv/bin/python tools/bot-evolution/publish.py \
  --run-dir artifacts/bot-evolution/desktop-gepa-isolated-256 \
  --base-url https://aegis-digi.online
```

The publisher requires matching engine/policy fingerprints, both player seats,
valid final games, and complete search budgets of at least 128 rollouts. It
refuses low-budget smoke results and requires an alternative policy evaluated
in completed games. The selected policy must differ semantically from the original baseline and beat its
paired held-out control with a positive confidence lower bound. Publication
preserves every active rule's
exact advice and conditions, exposes benchmark denominators and the paired
starting-policy control, and links to Aegis practice. Generated pages live in
`apps/web/public/strategy-guides/`; deploying those pages is a separate delivery
step. No raw game traces or hidden observations are published.

If an external reflection provider is unavailable, `--reflection-model session`
uses the active coding session as the proposer. GEPA writes each exact prompt
under the stage's `reflections/` directory and waits for a matching response
fingerprint. The coding session reviews the real feedback and supplies a fenced
JSON candidate. These prompt/response records make the provenance explicit;
this mode does not claim an external API model produced the candidate. The
same GEPA selection and real-engine evaluations still apply, but strict publication
requires an API reflector.

## Numeric selection and publication gates

`learn_combo_pilots.py` freezes 18 finite public-state hypotheses for the exact
Ulforce `ex4-dgo-2022-06-25-1-ulforceveedramon@1`, Mirage
`ex6-dgo-2024-07-06-1-miragegaogamon@2`, and Shine
`bt25-dgo-2026-06-06-4-shinegreymon@1` versions. Each preserves the certified generic
rules and appends one authored, card-scoped Main rule, using own board/hand predicates
and weights 4, 8, or 12. The 24-deck opponent pool remains separate from these three
targets. Unsupported intentions are frozen as metadata, outside the scored program.

The launcher requires `--run-root`, `--amendment`, `--prior-registry`, `--prior-run`,
`--deck-pool`, `--node`, and `--worker`. `--freeze-only` closes and allocates the family
without launching games. `--attempt 1` uses 96 training/validation, 384 gate, and
2400 held-out seed blocks per deck; attempt 2 prospectively uses 192, 768, and 9600.
Both waves' counts, hypotheses, runtime, runner, opponent partitions, and unique
held-out seed plans are frozen before either runs. `--only-deck` can select a subset
of the three targets without changing their allocated confidence budget. Completed
selections are reconstructed from raw games before their catalog is assembled.
`--desktop-system` freezes the exact WSL prefix `--system -d Ubuntu` for descriptor,
process capture and every match, supporting a verified runtime built in desktop RAM.
Omitting it retains ordinary WSL transport. Changing the prefix prevents resume.

The append-only amendment retains the full original wave-one alpha charge of
0.05/3, retires original waves two and three permanently, and divides the remaining
0.05×2/3 over three targets and two waves. Activation uses the existing conservative
paired seed-block empirical Bernstein bound at alpha 0.0055555556 per target/wave.
Training screens retain their explicitly approximate corrected Wilson gate. Failure
does not refund either budget. The original registry and every run artifact retain
their bytes and hashes, including stale summaries, partial reservations and raw
invalid games. Separate immutable closure records authorize the new family.

If the original wave ended in a non-resumable infrastructure failure,
`--prior-failure <record.json>` accepts `kind: infrastructure-failure-abandonment`,
the nonzero `orchestratorExitCode`, the absolute immutable failure `log`, and its
byte `logSha256`. The launcher captures local and desktop process snapshots and
refuses closure while any worker or orchestrator is live. It verifies the original
source/runtime archives, completed raw selections, partial frozen reservations,
and a disk/I/O failure in the log. Its terminal audit records completed, partial,
and unstarted decks explicitly. Invalid games keep null scores and do not become
losses. This abandonment authorizes a prospective family; it makes no strength claim.

Independent balanced certification preserves the GEPA selection's original engine
and policy identities. `certify_balanced.py --runtime-amendment <record.json>` can
pin a repaired certification runtime without rewriting the selection. A
`projection-repair` record permits only the declared visibility/verifier changes.
A `main-integration` record additionally verifies the merge parents and ancestry,
the complete source archive against the commit's Git blobs and file modes, and
the actual desktop build record with source checks before and after compilation.
All runtime changes are declared, and every production bot module must retain its
membership and bytes; only test modules and the previously reviewed projection
verifier are exempt. The worker binds the live API, shared runtime and dependency
lock to that archive before and after games. Historical selection scores continue
to describe the original runtime. Strength on the integrated engine requires a
fresh reserved certification attempt with the existing seeds, family budget and
confidence gates.

Run `tune.py --manifest <run>/manifest.json --program <program.json> --tasks <tasks.json>
--output <selection-dir>` before paying for reflection. It evaluates fixed, reproducible
single-weight neighbors through `HeuristicAdapter` and the same compiled worker as GEPA.
Conditions and authored advice stay fixed; weights retain their signs. Each candidate
faces the frozen initial control on the same seeds. At least 48 distinct games are
required, rechecks add no samples, and paired confidence calculations group seats and
opponents by engine seed. Numeric selection uses an approximate paired Wilson win test with one task-hash
representative per seed and corrects for the number of predeclared proposals. The
strict publisher retains the more conservative Hoeffding bound on complete seed blocks. Its output is selection evidence: freeze the winner
and evaluate new held-out seed blocks before claiming improved strength.

Each structural proposal is screened on at least 48 fresh same-seed games against
its parent before admission to GEPA. Seeds are separate from training, validation
and final testing, and the gate corrects for the predeclared proposal limit.

Reflection defaults to thin feedback (the final eight recorded decisions, without the
card-text dump). `feedbackMode: "rich"` enables the longer diagnostic dataset. A
`blockedIntents` list records ideas unavailable in the grammar without changing policy
identity or scores. Exact score ties use seeded randomness derived from the public
window, preserving deterministic prefix replay; traces report tied actions per window.

Invalid games and timeouts have null fitness. An incomplete GEPA batch stops with its
audit artifacts rather than supplying artificial losses. Strict publication requires a
policy distinct from the seed, at least 48 valid paired held-out games, and a positive
95% seed-block Hoeffding lower bound against control. Duplicate cached games never add
independent evidence. A weight sign change with unchanged advice also blocks publication.
Pilot test matchups exclude mirrors; larger deck pools rotate opponents across splits.

Preview catalogs set `strictVerified: false`, so Home exposes the guides link only after
strict publication. Pilots identical to generic have no deck page. Preview sitemaps
contain no noindex URLs; canonical origins come from the required `--base-url` option.

API reflection requires `--dollar-cap`, `--input-usd-per-million` and
`--output-usd-per-million` with prices checked for the chosen model. The runner sends
`--completion-tokens` (4096 by default) on the wire, disables automatic paid retries,
and reserves a conservative upper cost before each call across all stages. Reservations
are never refunded for missing usage or unknown library pricing. Prompts, raw API
responses and the shared budget ledger are saved with the run. Session reflection is
restricted to smoke work and cannot pass the strict publisher.

A cheap engine snapshot is not currently safe. GameState omits runtime effect and
modifier ledgers, once-per-turn usage tracking, reducers and RNG closures. The complete
engine additionally owns promises, WeakMaps and callbacks bound to its original state.
An engine-owned settled snapshot API would need full runtime export/import, explicit
quiescence checks, serializable RNG and rebuilt callbacks before replacing prefix replay.

Training selects a search rung adaptively by default (`--fixed-opponent` disables it).
The seed first faces a seeded random legal-action control, then progressively larger
MCTS budgets up to `--simulations`. A rung advances after its approximate Wilson win
lower bound clears 50%; the first blocked interval is bisected to find an intermediate
budget. This is a heuristic bracket: larger MCTS budgets are not guaranteed to be
monotonically stronger. Each rung records played games, independent seed blocks and its mastery result.
Archive opponents remain frozen while the search budget changes. These are training
screens; the final held-out report uses the independently configured search budget.
