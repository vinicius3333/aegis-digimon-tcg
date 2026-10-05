# Mobile notice layout options — 2026-10-05

## Recommendation

Adopt **A2, moment cards**:

- The existing 48px band holds the two newest moments as two complete cards, about 150×48 each at 320 and 185×48 at 390. That is twice today's width per event.
- Each card is one event and one target of at least 44×44.
- Each card names the owner in words (You / Opp), the label, two lines of action text, and the result card when the clause moved cards. A cause and its result stay in one card.
- The opponent header is not touched.
- At 320×568 the battle rows keep a 96px floor, so field art stays at the measured 44×62 instead of 32×45. The cost is local field scroll: about 48px instead of today's 12px (estimate).

A (lane ledger), B (header spotlight) and C (edge rails) are the three structural alternatives. Each loses to A2 on at least one hard constraint, as shown below.

**Prototype:** [prototype.html](prototype.html). Open it from disk. Controls: layout, A ledger size, viewport (320×568, 320×740, 390×844), scenario and measurements. Tap a notice to open its sheet. At 320×568 in A2, scroll the field. The board is made of strips cropped from the real captures in `board/`. It is HTML/CSS: not imagegen, and not a native capture.

All styling reuses existing Aegis values: `--battle-panel`, `--battle-panel-border`, the 0.65rem panel radius, compact-toast type sizes (9px label, 11px/700 action), the side-panel header gradient, the decision bottom-sheet frame, and the life line. The owner edge colours also exist already: the portrait opponent memory marker (`#ff9a6e`) and the player memory blue. The owner is also spelled out, so colour is not the only cue.

## Why the current layout fails at 320px

Evidence: `capture.json` and the PNGs in `redesign-mobile-battle-toasts/.local/motion-reference/mobile-toasts-final-strict/`, plus source at `c87ada9e4`.

1. **One moment becomes two toasts.** `buildNarrationItems` merges an effect clause with the cards it revealed into one `NarrationItem`. `CompactNarration` then splits that item into a left toast and a right toast. In the captures, four slots show two moments: "On Play / Reveal 5…" twice and "Revealed… / 1 cards" twice. The cause and its result end up 150px apart, with another toast between them.
2. **The text area is too small to inform.** Each toast is 72×48. After padding and the 16px art, the action gets about 40px, about six characters ("Reveal 5…"). A 16×22 thumbnail cannot be recognised. Every notice costs a tap.
3. **The gutter shrinks field cards.** The existing probe measured the art boxes on the real arena board, with the gutter and with the field margin set to 0 (`results[*].withoutGutter` / `withGutter`):

   | Viewport | Field art without gutter | With gutter | Field scroll |
   | --- | --- | --- | --- |
   | 320×568 | 44×62 | **32×45** | 12px |
   | 320×568 + dev toolbar | 32×45 | 32×45 | 56px |
   | 844×390 | 44×62 | **22×31** | 0 |
   | 320×740, 375×812, 390×844 | 65×91 | 65×91 | 0 |

   At 320×568, 96px battle rows give 44×62 and 77px rows give 32×45. On tall screens the band costs nothing. The probe does not record the field layout setting. Its 77px rows are below the 78px floor of the organized layout (`compactNarration.css`), so the capture most likely used the ordinary layout. The organized layout is not measured.
4. **The owner is not shown.** Every toast sits under the opponent header, whoever triggered it.
5. **Smaller defects:** "1 cards" (`notice.cardCount` has no singular form). The details dialog title is cut off at the top at 320×568.

## Constraints every option is checked against

- At most two clause entries (left lane) and two card entries (right lane) on screen. This is a cap, not a requirement to show four.
- Tap opens the details. **Close** (✕, Escape, scrim) keeps the notice. **Dismiss notice** removes it. Focus moves into the sheet, stays there, and returns to the notice on close ([APG modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)).
- Each event has its own target of at least 44×44 ([WCAG 2.2, 2.5.5](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html)). Routing one button by tap position does not count.
- Opponent header controls and information stay available.
- Lane geometry does not change for an empty band or an open decision. Reading clocks pause during decisions, as today.
- No change to timing, occurrence IDs, desktop layout, engine, animation or audio.

## Details sheet (shared)

All options open one bottom sheet in the existing decision-sheet frame. It replaces the centred dialog that clips its title at 320×568. The sheet shows the source name and code, the owner in words, the existing notice body (`[On Play]` chip and full clause), and the existing side panel with its cards at 72×101. Tabs of 44px switch between the visible events. In A2, moments still in the queue but no longer on the band are listed as dashed **Earlier** tabs, so nothing disappears unseen before its clock ends.

## Recommended: A2 — moment cards

| Case | Behaviour |
| --- | --- |
| Simultaneous effects | The two newest moments are visible. A card keeps the slot it appeared in; a new moment replaces the oldest. Older moments stay in the queue until their own clocks end and appear under Earlier in the sheet. |
| Long text | Two lines with ellipsis. Measured in the prototype: 79–110px per line at 320, 114–145px at 390. |
| Source → result | One card: action text, then "→" and the result card. |
| Empty | Band stays reserved. Nothing is drawn. |
| Decision | Band stays above the bottom sheet. Clocks pause. The prompted effect gets the existing focus-colour outline. |
| Rejection | Takes a card with the danger life line ("You · Not allowed"). |

**Cost and implementation notes:**

- Two cards hold at most 2 left + 2 right, because a moment carries at most one clause and one card list. Four unrelated items show as two cards, plus two Earlier tabs in the sheet.
- The 96px row floor at 320×568 adds local field scroll: 48px in the prototype, estimated about 50px in the app (364px measured content + 2 × 19px). With the dev toolbar, about 94px. The utility rows remain reachable by scroll, as today. This needs the app probe.
- Implementation stays inside `CompactNarration` and `compactNarration.css`. It renders whole `NarrationItem`s instead of splitting them, adds the Earlier list to the sheet, and changes the short-tier row floor.

## Structural alternatives

### A — Lane ledger (exploration)

Two columns (clauses 54%, cards 46%) × two rows. A clause and its result share a row as one joined cell. It shows 2 left + 2 right at once. Two sizes: Large (64px band, 30px rows) and Compact (48px, 22px rows).

- **Fails:** rows are 22–30px, so an entry cannot be its own 44px target. The prototype uses one target per lane column.
- Large costs field art on short screens: an estimated 26×37 at 320×568.
- Measured action text: about 84–97px, one line, at 320.

### B — Spotlight and stubs in the opponent header

The newest moment gets a two-line spotlight. The older clause and card list collapse to art stubs. No reserved band.

- **Fails:** it covers the opponent name and counters (and their tooltips) while a notice is live. The stubs are 44×40 targets, 4px short.
- It shows one readable event.
- Field art at 320×568 is restored to 44×62.

A ledger hosted in the same header region was also tried. It fails on the same header constraint and was dropped.

### C — Edge rails beside the battle rows

40px rails at the screen edges beside the two battle rows. Clauses go left and moved cards go right, the same sides as desktop. Tiles show 32×45 art and a one-word label.

- **Fails:** battle lanes lose 60px of width at every height: 288→228 at 320 and 358→298 at 390. At 320×740 the opponent row already scrolls sideways with three cards.
- Bottom-sheet decisions cover the lower slot.
- No action text, so every notice needs a tap.

## Comparison at 320×568

| | Current | A2 | A Large | B | C |
| --- | --- | --- | --- | --- | --- |
| Reserved height | 48px | 48px | 64px | 0 | 0 |
| Field art | 32×45 m | 44×62 floor | ≈26×37 e | 44×62 m | 44×62 m |
| Field scroll | 12px m | ≈50px e | more e | ≈0 e | ≈0 e |
| Events visible | 2, as 4 toasts | 2 + Earlier in sheet | 2L+2R | 1 + 2 stubs | 2 |
| Own 44px target per event | yes | yes, 150×48 | no (lane) | no (44×40) | yes |
| Action text | ≈40px × 1 line | 79–110px × 2 lines p | 84–97px × 1 line p | ≈78px × 2 lines | label only |
| Covers | nothing | nothing | nothing | opponent name + counters | lane edges |

`m` = measured in `capture.json`. `p` = measured in the prototype with Chromium. `e` = estimated from measured heights.

## Prototype validation

Headless Chromium (Playwright 1.63 from the main checkout) ran the standalone file only: no app server, no build, no native capture. It checked 108 cases: current, A2, A (two sizes), B and C × 3 viewports × 6 scenarios.

- No page errors. No lane over two entries. A shows 2 left + 2 right in the four-item case.
- A2: one target per event, every target at least 44×44, owner in text, header never covered, at most two events, 48px field scroll at 320×568.
- No notice panel outside the phone frame.
- Details sheet: opens from the keyboard, focus moves inside, the title is fully visible at every viewport, Escape closes it, and focus returns.
- No "1 cards" anywhere.
- Only B has a target under 44px (40px tall).

## Uncertainty

- A2 field scroll in the app, and every field number marked `e`, need the app probe.
- The prototype rebuilds the 320×568 field from captured row strips, scaled to the measured row heights. This approximates the real reflow.
- Text widths depend on fonts. The prototype loads Inter from Google Fonts. A system fallback changes the widths slightly.
- Readability of 11px two-line text on a real device has not been checked.
- No imagegen is requested. The open questions are geometry, and HTML on real strips answers them better.

## Files

- `prototype.html`: interactive prototype. URL parameters `option`, `size`, `viewport`, `scenario`, `measure` and `open` set the initial state.
- `board/*.webp`: header, field, dock, row strips and card crops from the 2026-10-05 production captures.
- `screens/*.png`: screenshots from the validation run. `A2-*` is the recommendation; `-details` files show the sheet.
