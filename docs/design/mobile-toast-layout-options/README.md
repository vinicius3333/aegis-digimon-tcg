# Mobile notice layout options — 2026-10-05

**Recommendation:** adopt **A, the lane ledger**: a band with two columns (clauses left, moved cards right) and two rows. It shows up to 2 left + 2 right entries at once and keeps each clause on the same row as the cards it moved. The user asked for A to be bigger, so A has two sizes:

- **Large** (64px band, 30px rows, 12px text, 20×28 art) on screens 650px tall or more. There the current 48px band costs no card art (measured). The extra 16px is expected to come from slack, but that is not yet measured.
- **Compact** (48px band, today's footprint) on shorter portrait screens. Large there would cost field art: an estimated 32×45 → 26×37 at 320×568.

The opponent header stays untouched in A. A′ (the ledger hosted in the opponent header) is kept as an option, not the default, because it covers the opponent name and counters.

Prototype: [prototype.html](prototype.html). Open it from disk. It has layout, ledger size, viewport (320×568, 320×740, 390×844), scenario and measurement controls. Tap a lane to open the detail sheet. The board is made of strips cropped from the real captures in `board/`. It is HTML/CSS, not imagegen, and not a native capture.

All styling reuses existing Aegis values: `--battle-panel`, `--battle-panel-border`, the 0.65rem panel radius, compact-toast type sizes (9px label, 11px/700 clause), the side-panel header gradient, the decision bottom-sheet frame, and the existing life line. The two owner colors also already exist: the portrait opponent memory marker (`#ff9a6e`) and the player memory blue.

## Why the current layout fails at 320px

Evidence: `capture.json` and the PNGs in `redesign-mobile-battle-toasts/.local/motion-reference/mobile-toasts-final-strict/`, plus source at `c87ada9e4`.

1. **One moment becomes two toasts.** `buildNarrationItems` merges an effect clause with the cards it revealed into one `NarrationItem`. `CompactNarration` then splits that item into a left toast and a right toast. In the captures, four slots show only two moments: "On Play / Reveal 5…" twice and "Revealed… / 1 cards" twice. The link between a cause and its result is lost: the two halves are 150px apart, with another toast between them.
2. **The text area is too small to inform.** Each toast is 72×48. After padding and the 16px art, the clause gets about 40px, which is about six characters ("Reveal 5…"). A 16×22 art thumbnail cannot be recognised. The toast says "something happened" but not what happened, so every notice costs a tap.
3. **The gutter shrinks field cards.** A reserved 48px band costs battle-row height wherever the screen has no spare height. The existing probe measured the art boxes on the real arena board, with the gutter and with the field margin set to 0:

   | Viewport | Field art without gutter | With gutter | Field scroll |
   | --- | --- | --- | --- |
   | 320×568 | 44×62 | **32×45** (−27% width) | 12px |
   | 320×568 + dev toolbar | 32×45 | 32×45 | 56px |
   | 844×390 | 44×62 | **22×31** (−50%) | 0 |
   | 320×740, 375×812, 390×844 | 65×91 | 65×91 | 0 |

   Art size follows row height: 96px rows give 44×62, 77px rows give 32×45. It is not a step, so each pixel of band costs field art on short screens. On tall screens the band is free. The probe does not record the field layout setting. Its 77px rows are below the 78px floor of the organized layout (`compactNarration.css`), so the capture most likely used the ordinary layout. The organized layout is not measured.
4. **Owner is not shown.** Every toast sits under the opponent header, whoever triggered it.
5. **Small defects seen in the captures:** "1 cards" (`notice.cardCount` has no singular form). The details dialog title is cut off at the top at 320×568.

## Constraints kept by every option

- At most two clause entries (left lane) and two card entries (right lane) on screen.
- Tap opens the details. **Close** (✕, Escape, scrim) keeps the notice. **Dismiss notice** removes it. Focus moves into the sheet, stays there, and returns to the lane on close.
- Lane geometry does not change for an empty lane or an open decision. Reading clocks pause during decisions, as today.
- Targets are at least 44×44 ([WCAG 2.2, 2.5.5 Target Size (Enhanced)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html)). The modal follows the [APG modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
- No change to queues, timing, occurrence IDs, desktop layout, engine, animation or audio.

## Details sheet (shared)

All options use one bottom sheet in the existing decision-sheet frame. It replaces the centred dialog, which clips its title at 320×568. The sheet shows the source name and code, the owner, the existing notice body (`[On Play]` timing chip and full clause), and the existing side panel with its cards at 72×101. When a lane holds two entries, 44px tabs switch between them, and the tapped entry starts selected.

## The three options

### A — Lane ledger (recommended)

**Structure:** two columns and two rows inside the band. The left column (54%) holds up to two clauses and the right column (46%) holds up to two card lists, the same lanes as desktop. Newest is on top. A clause and the cards it moved share a row and render as one joined cell, with "→" before the cards. Unrelated entries sit in separate cells, so the worst case shows all four: 2 left + 2 right. Each cell has an owner edge, art, a label and one line of text with ellipsis.

**Targets:** a row is 30px (Large) or 22px (Compact), so a cell cannot be a 44px target. Each lane column is one target instead: 162×64 and 138×64 at 320 Large; 162×48 and 138×48 at 320 Compact. The tapped row selects its tab in the sheet. Keyboard users land on the newest entry. The tabs list only that lane's entries, at most two.

| Case | Behaviour |
| --- | --- |
| Simultaneous effects | Up to 2 clauses and 2 card lists, all visible. |
| Long text | One line with ellipsis. Measured in the prototype at 320 Large: about 84–97px of clause and 50–58px of card name per cell (≈14 characters plus the label). At 390: about 137px of clause. |
| Source → result | Same row, joined cell. |
| Empty | Band stays reserved. Nothing is drawn. |
| Decision | Band stays above the bottom sheet. Clocks pause. The prompted effect gets the existing focus-colour outline. |
| Rejection | Takes a clause cell with the danger life line. |

**Cost:** Compact keeps today's 48px band and field art. Large adds 16px. On short screens that 16px comes out of the battle rows.

### A′ — Ledger in the opponent header (optional short-screen tier)

The same lane ledger at a smaller size, inside the opponent header (234×40 at 320). It covers the opponent name and the egg, hand, deck and trash counters. The card-back fan and the menu stay visible. The fan is the target of hand animations, and it still shows the hand count.

- Field art at 320×568 returns to **44×62**: the without-gutter value measured in `capture.json`.
- Field scroll is expected to drop from 12px to about 0. This is an estimate: the field gains 48px against a 364px content height. It needs the browser probe.
- Clause text is about 70px per cell (measured in the prototype).
- Not the default: it does not keep the opponent name and counters visible, and keeping them would need a game layout change.
- **Cost:** while a notice is live, the opponent name and the counters are hidden. Eggs, deck and trash are also shown on the utility row, and the hand count is still shown by the fan. The counter tooltips are unreachable for the reading time.

### B — Spotlight and stubs in the header

**Structure:** the newest moment gets a two-line spotlight with its art and result card. The older clause and the older card list collapse to art stubs at each end. Every item is its own target, 44 wide and 40 tall. That is 4px short of 44, and the validation flags it. There is no reserved band.

- Field art at 320×568 is restored, as in A′.
- The spotlight has about 78px of text per line at 320 (≈12 characters per line). The stubs have no text.
- **Rejected:** it shows one readable entry, not 2 left + 2 right. It only wins on separate targets per item.

### C — Edge rails beside the battle rows

**Structure:** 40px rails at the screen edges beside the two battle rows. They stay clear of the utility rows, the memory gauge and the End Phase orb. The left rail holds clauses and the right rail holds moved cards, the same sides as desktop. Two slots per rail, and a clause and its result share a height. Tiles show 32×45 art and a one-word label.

- No gutter, so the field gains the 48px height.
- Battle lanes lose 60px of width at every height: 288→228 at 320 and 358→298 at 390. At 320×740 the opponent row already scrolls sideways with three cards, so rails would leave about two cards visible.
- Bottom-sheet decisions cover the lower slot.
- Action text is gone, so every notice needs a tap.
- **Rejected:** it moves the cost from height to width on all screens, including tall screens where the band is free today.

## Comparison at 320×568

| | Current | A Large | A Compact | A′ | B | C |
| --- | --- | --- | --- | --- | --- | --- |
| Reserved height | 48px | 64px | 48px | 0 | 0 | 0 |
| Field art | 32×45 m | ≈26×37 e | 32×45 m | 44×62 m | 44×62 m | 44×62 m |
| Field scroll (production) | 12px m | more e | 12px m | ≈0 e | ≈0 e | ≈0 e |
| Battle lane width | 288 m | 288 | 288 | 288 | 288 | 228 |
| Visible entries | 2L+2R, as 4 toasts | 2L+2R | 2L+2R | 2L+2R | 1 + 2 stubs | 2L+2R |
| Targets | 4 × 72×48 | 162×64 + 138×64 | 162×48 + 138×48 | 2 lanes × 44 | 142×40 + 2 × 44×40 | ≤4 × 40×88 |
| Clause text per cell | ≈40px | ≈84–97px p | ≈84px p | ≈70px p | ≈78px × 2 lines | label only |
| Covers | nothing | nothing | nothing | opponent name + counters | opponent name + counters | lane edges |

`m` = measured in `capture.json`. `p` = measured in the prototype with Chromium. `e` = estimated from measured heights.

## Prototype validation

Headless Chromium 1.63 (Playwright from the main checkout) ran the standalone file only: no app server, no build, no native capture. It covered 108 cases: 5 layouts (A at both sizes) × 3 viewports × 6 scenarios.

- No page errors. No lane over two entries. A and A′ show exactly 2 left + 2 right in the four-item case.
- No notice panel outside the phone frame.
- Details sheet: it opens from the keyboard, focus moves into it, the title is fully visible at every viewport (the current dialog clips it at 320×568), Escape closes it, and focus returns to the lane.
- No "1 cards" anywhere. A single card shows its name; several show "N cards".
- Only B has a target under 44px tall (40px).

Screenshots are in `screens/`.

## Uncertainty

- The field cost of A Large is an estimate on every viewport. At 320×740 and up, the 48px band is measured free; whether 16px more is also free needs the app probe.
- A′, B and C field scroll and lane reflow are estimates. They need the existing probe after it gains a header-hosted lane.
- The prototype rebuilds the 320×568 no-gutter board by scaling the captured battle-row strips to the measured 96px row height. That approximates the real reflow; it is not a real one.
- The A′ header width (234px at 320, 246px at 390) is read from the captures. The header width depends on the opponent name and hand count. A long fan would narrow the region.
- The 23px ledger rows hold 11px text with 1.2 line height. Readability on a real device has not been checked.
- Colour alone marks the owner edge in the rows. The sheet and the accessible name state the owner in words.
- No imagegen is requested. The layout question is geometry, and HTML on real strips answers it better.

## Files

- `prototype.html`: interactive prototype. URL parameters `option`, `viewport`, `scenario`, `measure` and `open` set the initial state.
- `board/*.webp`: header, field, dock, row strips and card crops from the 2026-10-05 production captures.
- `screens/*.png`: prototype screenshots from the validation run, including `-details` sheet states.
