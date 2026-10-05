# Autonomous action pacing

Measure three conserved real-server boards: three consecutive raising evolutions,
two plays of physical copies, and raising movement, field evolution and three
attacks in the bot's legal chosen order. The ordinary evaluation bot chooses legal actions through public intents;
the fixture prepares cards and zones, never scripts outcomes or timing.

Each seat retains fifty main cards, four eggs, unique physical identities and normal
copy limits. Four non-playable blue options occupy the next draws on boards without
blue units, preventing incidental drawn actions from obscuring the action being
measured. Existing printed effects still resolve normally. The raising evolution
board verifies that its When Digivolving effect stays inactive in raising. The field
evolution board verifies the same card's actual effect and choice on the field.

Use the established effects lab, native-clock recorder and Aegis presentation. Add
observations for raising card changes and movement; retain reveal exit, field
arrival, source focus, physical relayout, phase and security observations. Keep
browser receipt, queue waiting and painted movement distinct. Real match captures
verify Normal/Fast, 320px and reduced-motion behavior without exposing hidden hands.

First verify actions and conservation against the real engine and BotPlayer. Then
measure the unchanged presentation, identify causal handoff or clipping failures,
and correct the responsible production seam. Keep rejected captures, the 50ms
quality limit, authored motion shapes and the existing layout. Document observed
durations as individual regression measurements rather than benchmark averages.

The grouping fixture uses two ST1-12 Tai Kamiya copies: the committed catalog
defines a red Tamer with play cost two. Both ordinary plays fit the bot's three
memory, and neither introduces a blue color source. Digimon remain individually
arranged; only the existing support lane groups matching copies.

## Corrected failures

The first desktop Normal capture (`.local/phase-pacing/native3-v1/report.json`)
rejected all three cases. ST1-03's raising card was replaced by the next live top
while its native 1150ms arrival clock was at 1066.646ms. The initial grouping
fixture used two BT1-009 Digimon, which this layout deliberately never groups.
The move harness also treated serialized empty breeding (`null`) as `undefined`.
The retained move capture exposed another actual presentation failure: the
chosen +3000 DP gain was replaced by its turn-expiry pulse before its clause let
it paint.

Raising birth and arrival-tail steps now retain their presented revision through
the native clock. Sequential DP changes retain the gain and subsequent expiry
on the same physical target track. The recorder observes source focus first,
last and removal times with source permanent identity; rendered field membership
and merge-copy identity; and the real DP pulse's from/to values and visible delta.
The harness checks actual membership, painted artwork movement and final position,
and compares post-evolution attacks only when their server event order warrants it.
Reduced motion retains terminal action/effect/group checks and the frame-quality
gate; its drained visual cues make no focus/flight/native-duration claim.

## Accepted desktop Normal evidence

The isolated retry passed three of three in 105.388 seconds, with one Playwright
worker and trace disabled. Retained evidence is
`.local/phase-pacing/native3-v2/report.json`,
`.local/phase-pacing/native3-v2/summary/summary.json` and
`.local/phase-pacing/native3-v2/summary/captures.json`. The rejected v1 report,
captures, screenshots and failure diagnostics remain separate.

| Scenario                      | Observed result                                                                                                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Raising evolutions            | ST1-03, ST1-05 and ST1-08 each reached 1150/1150ms on the native arrival clock; Garudamon's field effect remained inactive in raising.                                                           |
| Duplicate plays               | Both ST1-12 physical IDs shared one rendered group after separate painted arrivals; merging artwork traveled 66.9995px and finished 0.0005px from the group's artwork.                           |
| Raising move and field effect | Transfer reached 200/200ms with 0px destination error; real Garudamon source focus ended before its chosen target painted a 5000-to-8000 DP pulse with visible `3K` delta for 33 sampled frames. |

All three accepted captures reported usable sampling with p95 16.8ms, zero
sampled gaps above 50ms, no gate expiries, no failed queue steps, hidden opponent
hand identities, and the expected security counts. The native clip checks passed.
Frame statistics are the probe's bounded sampled window, not a statistical
benchmark or network latency measurement.

The bot chose three attacks before evolving a field Birdramon in this run
(attack seq 27/35/43, evolution seq 52). Thus the captured evolution did not
precede an attack; no post-evolution attack-order claim is made for this run.
The harness retains the causal arrival/source/choice checks for any attack whose
actual server order places it after evolution.

Validation: 282 focused web tests across seven files, three conserved real-bot
engine fixture tests, web and e2e TypeScript checks, shared build and API runtime
compile passed. The web production build passed before the production corrections;
the corrected production files passed the focused tests and web TypeScript check.
All changed files passed scoped lint with the existing harness warnings. Final
review removed OrganizedBattleRow's unused pure `supportSlots` calculation without
changing layout. `git diff --check` passed, and the initial push hook additionally
passed the full shared/API/web TypeScript check.

Per coordinator closeout, this lane verifies desktop Normal only. The integration
worker owns the single combined twelve-case matrix covering Normal/Fast, 320px and
reduced motion after merging the pacing and audio commits. Broader trained-policy
matches and full visual reference review remain outside this lane; additional
keyword coverage was explicitly removed from scope.
