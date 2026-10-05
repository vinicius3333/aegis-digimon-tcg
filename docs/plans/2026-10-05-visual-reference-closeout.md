# Focused visual reference closeout

Base: `feat/effects-lab` at `9bfc91eb1`; isolated child branch
`finish-visual-regressions`. Preserve Aegis layout, typography, colours, resting
card sizes and responsive geometry. Use only the existing local reference video,
decoded 960×540 frames and cached primary source at
`2a43ecc4b1580dfd98deab73871a17d2978face8`.

## Current scope

The user excluded the remaining 28 keyword validations. They are **excluded**, not
pending acceptance work. Exhaustive review of all 40,622 reference frames is
replaced by representative comparison of major action families. Historical
coverage remains 18/46 native keyword families and 756 individually inspected
reference frames; those numbers do not imply complete rules or visual parity.

This pass reviewed three locator sheets and every cropped decoded frame in
f6175–6205. Locator thumbnails provide context, not continuous trajectory evidence.
The 31-frame raising interval is recorded separately; this report does not inflate
the historical cumulative unique-frame count. Files named `frame-NNNNNN.jpg` are
one-based; the frame indices below are zero-based. Time is `frame × 1001/60000`.

## Representative comparisons

| Family               | Concrete reference interval or samples                                                                                                                       | Existing Aegis contract and conclusion                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Evolution            | Prior consecutive f1667–1744, 27.811117–29.095733 s; rechecked overview f1700/f1800                                                                          | Bright reveal, recognition, narrow exit, then destination arrival remain distinct. Normal public reveal is 100 ms turn + 160 ms face + 160 ms recognition + 140 ms exit = 560 ms. Wait for painted exit before field handoff; do not use the entire video interval as an engine wait.                                                                                                                                                         |
| Play                 | f2700/f2725/f2800, 45.045000/45.462083/46.713333 s; prior consecutive arrival crops f2706–2780                                                               | Central Tamer reveal precedes the field light and stable face. Retain keyed reveal ownership, 100 ms landing and independent nonblocking light tail. The 1150 ms light lifetime must not delay On Play or the next choice.                                                                                                                                                                                                                    |
| Raising              | Consecutive f6175–6205, 103.019583–103.520083 s                                                                                                              | Source remains static through f6191; mixed moving images appear at f6192–6196; field face is stable by f6197. Approximately 83–100 ms separates the visible transition bounds, with ±1 decoded frame uncertainty and recorded image mixing. This corroborates quiet relocation, but does not independently establish a native tween clock. Keep the authored 200 ms OutCubic transfer and painted handoff; no play showcase or landing burst. |
| Attack               | Prior consecutive f29496–29595, 492.091600–493.742583 s; rechecked f29496/f29540/f29564/f29600                                                               | Source suspension precedes two advancing arrow beats. Current `TIMINGS.attackArrow` is 380 ms: two 85 ms extensions, two 70 ms holds and a final 70 ms settle. Keep the separate 200 ms artwork turn and persistent occurrence across security checks. Historical 310 ms capture reports predate this current contract; the overview does not add subframe precision.                                                                         |
| Effect choice        | f7000, 116.783333 s; f19500/f10500/f11000, 158.491667/175.175000/183.516667 s                                                                                | The board, hand and raising area dim together under decisions; effect-order and card-choice sheets remain readable. Human decision time is not an animation budget. Preserve sibling backdrops, View/Return lifecycle and clear desktop side rails.                                                                                                                                                                                           |
| Regrouping           | f4200/f4500 and f19500 show simultaneous distinct cards, rather than a proven duplicate-group return                                                         | The supplied samples do not establish duplicate-group choreography. Verify Aegis's existing 420 ms lane layout and return continuity with native evidence instead of claiming footage parity or changing resting geometry.                                                                                                                                                                                                                    |
| Simultaneous effects | f6000, 100.100000 s, shows turn narration with multiple retained card panels; f39385, 657.073083 s, shows a retained deletion panel beside a separate reveal | Compose source, result and readable notices independently. Keep at most two actual toasts in each semantic column, retain occurrence lifetimes, and keep decisions above notifications. Supplemental component composition checks are distinct from real-server sequencing evidence.                                                                                                                                                          |

## Prioritized corrections and boundaries

1. **Capture reproducibility:** the decision-backdrop probe was hardcoded to port
   5174, and all four probes reused output filenames. Shared probe options now
   accept `--base`, `--output` and `--speed normal|fast`; default outputs use a new
   run directory so rejected captures survive. The speed setting is applied before
   importing the renderer and is recorded with the result.
2. **Causal ordering:** pass the raising timing bounds above to the pacing owner;
   keep native painted completion and queue/receipt timestamps separate. Final
   integration must verify opponent plays/evolutions/attacks follow their phase
   panels. No phase/action hook edits belong to this child.
3. **Readability and geometry:** verify existing full-board decision/source shades,
   stable lanes, mobile details and simultaneous notices before changing CSS.
   Initial focused verification passed 219 tests across five files, so no product
   geometry change is justified by that evidence.

No new keyword scenarios, sound modules, card modules or engine changes belong to
this pass. Browser/native work requires the coordinator's exclusive lease. Preserve
failed evidence and the existing 50 ms native sampling/global-p95 thresholds.

## Verification record

- `pnpm install --offline --ignore-scripts --frozen-lockfile`: succeeded without
  downloads or git configuration changes.
- Initial focused tests could not resolve the unbuilt shared package. After
  `pnpm --filter @aegis/shared build`, the focused command passed **219 tests / 5
  files**: `decisionOverlay`, `EffectFocus`, `CompactNarration`, `NarrationStack`
  and `NoticeStack`.
- Scoped probe lint and `git diff --check` passed.
- Initial tests ran with Node 24.21.0 despite the repository's Node 26
  engine declaration; this is an environment limitation, not a supported-runtime
  certification.

## Leased browser results

The exclusive window used child Vite at `http://127.0.0.1:4186` and the unchanged
parent API only for the existing Effects Lab board route. All eight commands
below passed. Each browser closed naturally; the child Vite process stopped
before explicit lease release. No rejected capture occurred in this window.

```sh
node tools/diagnostics/probe-mobile-notices.mjs --base http://127.0.0.1:4186 --output .local/visual-closeout/mobile-normal
node tools/diagnostics/probe-mobile-notices.mjs --base http://127.0.0.1:4186 --speed fast --output .local/visual-closeout/mobile-fast
node tools/diagnostics/probe-notice-lanes.mjs --base http://127.0.0.1:4186 --output .local/visual-closeout/desktop-normal
node tools/diagnostics/probe-notice-lanes.mjs --base http://127.0.0.1:4186 --speed fast --output .local/visual-closeout/desktop-fast
node tools/diagnostics/probe-decision-backdrop.mjs --base http://127.0.0.1:4186 --output .local/visual-closeout/decision-normal
node tools/diagnostics/probe-field-activation-light.mjs --base http://127.0.0.1:4186 --output .local/visual-closeout/focus-normal
node tools/diagnostics/probe-field-activation-light.mjs --base http://127.0.0.1:4186 --speed fast --output .local/visual-closeout/focus-fast
node tools/diagnostics/probe-security-light.mjs --base http://127.0.0.1:4186 --lifecycle-only
```

- **Mobile notices:** five viewport runs per speed, including 320×740, 390×844,
  768×1024, 844×390 and 1440×900. At compact widths, full detail taps, content bounds,
  focus containment and Escape passed. Two toasts per column, stable bounds during
  target/order decisions and rejection, reduced-motion endpoints and page-error
  checks passed at all widths.
- **Desktop notice lanes:** three viewport runs per speed, 768×520, 1024×760 and
  1440×900. Both decision types preserve each lane's rectangle and two-toast limit;
  decision controls remain hittable. Effect notice entry retains 100 ms and its
  reduced-motion endpoint has no entry clock.
- **Decision backdrop:** 12 retained production-component cases on Arena and
  Effects Lab. The shade spans the viewport, hand/raising hit tests stay covered,
  and View/Return removes/restores exactly one shade.
- **Source focus:** 12 cases per speed: eight natural Arena activations and four
  retained reduced-motion components at 320/768/1024/1440 px. Full-board coverage,
  transformed source aperture, high-index hovered hand shading, native light-clock
  completion and cleanup passed. The retained reduced cases exercise decorative
  suppression rather than an actual reduced queue activation.
- **Simultaneous-effect composition:** the existing lifecycle-only probe passed
  21 supplemental production-component/queue cases at 1×/2×/4×. Overlap keeps two
  independently owned lights, neither blocks board/decision progress, and both
  eventually clean up. Completion/cancel/skip/drain/unmount/scope checks also pass.
  Evidence is `.local/motion-reference/aegis-security-light/capture.json`.

JSON and screenshots for the first seven commands are in their explicit output
directories. Inspected screenshots: mobile `order-320.png`, `details-390.png`,
desktop `order-1440.png`, and Fast focus `focus-hover-1440.png`. These checks found
no concrete remaining geometry defect, so product overlay/layout code remains
unchanged. They are component/runtime visual evidence, not new real-server rules
coverage or global smoothness certification; native sampling thresholds stay
unchanged. Final smoke of the integrated audio and autonomous-action corrections
remains a separate follow-up after peer integration.
