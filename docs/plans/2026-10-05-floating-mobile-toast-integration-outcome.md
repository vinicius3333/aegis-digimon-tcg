# Floating mobile notice row integration outcome — 2026-10-05

The user's choice, "one whole line without taking the height space itself", is integrated into `feat/effects-lab`. Phone notices now float in one full-width row and the 48px reserved gutter is gone.

## Heads

- Source branch `rethink-mobile-toast-layout-opus55` at `e61823a282477fd2687463482038e7f32e87b4ac`, merged into `feat/effects-lab` by an ordinary merge commit (`cf28dd1cb`).
- Feature commit `edf3b438f`, probe `a70bc4913`, docs `3bed9974b` and `e61823a28`.

## Review

- The separate reviewer agent failed at startup twice; a third attempt ended without the original spec and made no edits.
- The root coordinator reviewed the exact frozen SHA, its scope, the four-viewport captures and the 320×740 baseline receipt, and approved it.

## What changed

- `CompactNarration` renders one row: owner, source art, label, action with ellipsis, and the linked result card. "+N" opens every retained moment (two clauses and two card lists at most), each listed once. Nothing is dismissed to make room.
- The `.game-field` top margin and the short-screen compensation rules are removed. The row host takes no layout space and passes pointer events through.
- The row is placed in the measured gap above the opponent's battle cards: 24–44px tall.
- The details sheet is capped to its dialog layer, so its title stays on screen.

## Measured

| Viewport | Row | Field card art before → after | Field scroll before → after |
| --- | --- | --- | --- |
| 320×568 | 304×24 | 32×45 → 44×62 | 12px → 0 |
| 320×740 | 304×40 | 65×91 → 65×91 | 0 → 0 |
| 390×844 | 374×44 | 65×91 → 65×91 | 0 → 0 |
| 844×390 | 828×24 | 22×31 → 44×62 | 0 → 0 |

- Board geometry is identical across empty, live, decision, refusal and expiry states. No board-control centre is under the row at these four viewports.
- At 320×568 the row overlaps the bottom label edge of the opponent trash (4px) and security stack (6px); their centres stay reachable.
- At 320×740 two field cards are not reachable at their centre in either build (lane overflow and a lane scroll arrow). The empty-state receipt shows this is pre-existing.

Evidence: `docs/design/mobile-toast-layout-options/floating-row/`.

## Limits

- The 24px row at 320×568 and 844×390 meets WCAG target-size criterion 2.5.8 only, not the enhanced 44px criterion.
- The row measures its gap when the active moment changes, the board resizes or the field scrolls. If a notice arrives while cards are still entering, it can sit a few pixels over the card tops until the next change. Seen on the public server: the empty host measured y119–147 during load, against y113–137 once settled. Suggested follow-up: also re-measure on `animationend`.
- Geometry evidence only. Earlier native timing limits are unchanged; no native, keyword-matrix or audio work was rerun.

## Public preview

- [Implemented row (option R)](https://macbook-air-de-vinicius.tailf0d500.ts.net:9445/dev/mobile-toast-layout-options/prototype.html?option=R&viewport=320x568&scenario=paired&measure=off)
- [Arena with the floating row](https://macbook-air-de-vinicius.tailf0d500.ts.net:9445/dev/arena?mode=visual)

Root-owned Vite 5174, API 2571 and HTTPS/WSS 9445/9446 were not restarted.
