# Animation and mobile notice integration outcome — 2026-10-05

Functional animation fixes and the mobile notice checkpoint are accepted with the native and visibility limits below. The later A Large/A2 prototypes are design exploration, not an applied production rewrite.

## Integrated heads

Base: `4266ec62f5c02930a85e8be148c12d0175c8d05c`, branch `feat/effects-lab`. Reviewed source heads were normally pushed; parent integration used ordinary non-squash merges:

| Source                                            | Exact source head                          | Parent merge                               |
| ------------------------------------------------- | ------------------------------------------ | ------------------------------------------ |
| Physical departure / light-tail correction        | `ff97864fcdb0d780c693c2377036f4a14cf51a8a` | `44b4d39956a068191da499cc70233ff32018b1ff` |
| Mobile notice implementation                      | `9f366325f192722690209d82c3ccad6fb50a3c94` | `c87ada9e4ac1cf8c69f1ea9a4a378af3cc3e24a9` |
| Painted destruction-position hold                 | `baa97aa6d31fc035975435f39a7a96ec241213e4` | `28ecb0dad4d6dcaedad0c7eba9603e448a93d455` |
| Stationary CSS transitions                        | `4ee6e034e93147ea499168d048b9d133d5e4275b` | `2bf44bf57249c215776b1cdb018165ce4972d675` |
| Layout exploration and factual target corrections | `b13da7a1433b33d29d65e5d427005d8e3aef60d3` | `fd89c0c90ea2601b58eda5198f3f4158797c7ce1` |

Final captured code/docs head: `fd89c0c90ea2601b58eda5198f3f4158797c7ce1`. This outcome is committed separately.

## Resulting behavior

Delay cost focus waits for its own narration unit to start. Physical Option costs retain their own deletion gates, so identical copies cannot overwrite each other's causal ownership. Ordinary repeated effects still coalesce. The 5000ms consequence ceiling is unchanged.

Begun departures stay omitted from older presented snapshots through the existing queue-idle cleanup. Held/delete/trash/affected faces suppress the selection lift, freeze their current painted FLIP offset through ordinary reflow, and stop transform/margin interpolation. Cancelling selection restores normal motion from the held position; survivors and genuine arrivals retain their behavior. Existing actual-resize and reduced-motion remeasurement may clear offsets: stability across a viewport resize is not certified. Engine rules, particle clocks, playback speed and native thresholds were not changed.

The production mobile checkpoint reserves a fixed 48px notice gutter, shows at most two left clauses plus two right card notices, and retains selected details after expiry. Focus, Escape, explicit dismissal and reduced motion are covered. Hand-only discard wording is corrected in English and Portuguese. Desktop styling stays intact. Strict source geometry checks covered seven viewports in production and retained-toolbar modes; shortest portrait uses local field scrolling, not simultaneous visibility of every zone (12px production / 56px toolbar at 320×568).

## Design artifacts and preview

Nine genuine ImageGen originals and prompts are committed in [mobile-toast-prototypes](../design/mobile-toast-prototypes/README.md); that README contains concise primary research citations. The separate [layout options](../design/mobile-toast-layout-options/README.md) contain cropped-board HTML exploration and screenshots, explicitly identified as non-imagegen and non-native.

The user's preference for **A Large** remains available. **A2** is an additional recommendation with complete event targets and textual owner labels. Its 96px row floor and roughly 50px production field-scroll cost at 320×568 are modeled estimates requiring an app probe. A uses lane targets rather than an individual 44px target per event; B covers opponent controls and has short targets; C has narrow targets and covers lane edges. The 108 standalone prototype cases are functional exploration checks, not app/native or universal target-size acceptance.

- [Preferred A Large preview](https://macbook-air-de-vinicius.tailf0d500.ts.net:9445/dev/mobile-toast-layout-options/prototype.html?option=A&size=large&scenario=worst&measure=off).
- [Additional A2 preview](https://macbook-air-de-vinicius.tailf0d500.ts.net:9445/dev/mobile-toast-layout-options/prototype.html?option=A2&scenario=paired&measure=off).
- [Actual animation fixture](https://macbook-air-de-vinicius.tailf0d500.ts.net:9445/dev/effects-lab?scenario=effects-lab-prod-titan-cascade).
- [Battle preview](https://macbook-air-de-vinicius.tailf0d500.ts.net:9445/dev/battle?scenario=field-grouping).
- [Unchanged audio preview](https://macbook-air-de-vinicius.tailf0d500.ts.net:9445/dev/audio-preview/index.html).

Only 21 new ephemeral public prototype/relative-board files were added. Actual host-shell checks verified local HTML/one asset and public HTML/all 20 assets: 23 HTTP200 responses, every SHA matching committed source. HTML SHA256: `e82cbc72323c9365393ebddc508c1c3bdfd5322222c53250b428a4a544b17122`.

## Verification and limits

At c87, parent checks passed 10 focused files /139 tests, shared/API/web types, E2E types, web build, scoped lint/format and diff checks. Final animation source passed 11 files /110 tests and full ordinary Node26 push hooks. Incremental parent checks passed motion/held suites (8 cases), web types, then the final affected held suite (2 cases); changed-file lint/format and diff checks passed. These overlap and are not summed as unique tests. Parent logs: `.local/animation-mobile-toast-integration/`.

One exclusive final capture on fd89 used the existing API2571/Vite5174 fixture at normal speed. Both 1440×900 and 320×740 passed all functional assertions: four physical departures with correct art and immutable owning origins within 0.1px; no whole card at shard mount or through the light tail; waiting second copy preserved; no entrance replay, page errors or gate expiry. Both held Digimons measured maximum x/y drift **0px**.

| View | Window                | Frames | p95 ms |   Max ms | >50ms |
| ---- | --------------------- | -----: | -----: | -------: | ----: |
| 1440 | Titamon deletion pair |    117 |   17.5 |     50.0 |     0 |
| 1440 | First grouped Option  |    122 |   17.5 |     33.4 |     0 |
| 1440 | Second grouped Option |    121 |   17.5 |     33.4 |     0 |
| 320  | Titamon deletion pair |    117 |   17.7 | **50.1** | **1** |
| 320  | First grouped Option  |    123 |   17.6 |     34.3 |     0 |
| 320  | Second grouped Option |    119 |   17.7 | **50.1** | **1** |

All six samples were usable, dropped0 and below600 frames. The two mobile peaks **fail** unchanged max≤50ms / over50=0; the aggregate exited1. No full native performance certificate is claimed. Mobile grouped origins match, but right edges reach **321.3828125px and 336px** beyond the 320px viewport; complete grouped-departure visibility is not certified.

Source receipts: `finish-titan-departure-pacing/.local/titan-departure/{actual-1440.json,actual-320.json,summary.json,assertion-failures.json,native-failures.json,final-fd89-native.log,final-fd89-native.exit,report.md}`. Functional failures are []; native failures contain the two mobile windows. Earlier frozen79, forced-style c87 and overwritten-source c87 failures remain preserved. The recorder corrections affect isolated observation only. No further retries or speculative fixes were authorized. The 28 keyword validations remain canceled.

## Preservation and lifecycle

All 497 preexisting dirty/untracked paths were checked by status and content hash throughout integration and remain unchanged. Protected audio assets, rendering/control/preview paths, design tokens and audio capture/pacing E2E files have no diff from base. Asset SHA256 values remain:

- Cue bank: `4422087ab1cc1963ccc0d548c265223d48d4cf206fc1e115077534c3d24db31f`.
- Music: `69cbe499a72a28e4aa0c552e5a95835a88f9e51c04b99e341eafa02649e75acf`.
- Dry candidate: `dfc22b914a38fd0c2e681022c3e630288c3fcf0a8f5cf73687bbabd9471a6715`.

The final capture browser closed and lease released at 22:25 UTC. This integrator started no browser/native campaign or temporary service. All owned checks exited; root-owned API2571, Vite5174, HTTPS9445/WSS9446 and the host shell remain available.
