# Compact mobile match notices

Replace the single folded notification band with the same two semantic columns as the desktop match: accepted clauses on the left and card movements on the right. Keep the existing Aegis board design and resting geometry.

## Chosen interaction

- Show at most two toasts in each column, including a rejected action in the left limit.
- Keep each toast 64 px high and each column 132 px high, independent of decisions and effect ordering windows.
- Use 24 px card art, single-line titles and two-line ellipsized clauses. Limit columns to 208 px on tablets and landscape phones.
- Tapping a toast opens its full occurrence: the clause first, followed by every card panel. The detail dialog retains that occurrence if the live toast expires. Closing it preserves the narration; explicit dismissal removes only that occurrence.
- Preserve paused reading clocks and the original occurrence lifetime when splitting it between columns.
- Reuse the existing dialog primitive for focus, Escape and return focus. Handle initial Shift+Tab from the dialog root.
- Use a wrapping card grid inside details so every card remains accessible on a 320 px screen.

## Image concepts

Built-in ImageGen produced a comparison image containing three concepts: two compact columns, smaller outer-edge cards, and individual expanded details. The implementation combines the first and third. The image is a design reference; the shipped UI remains React and CSS.

Local artifact: `.local/mobile-toast-prototypes/concepts.png`. The original remains in the ImageGen output directory. The following prompt is the final prompt used:

> Use case: product-mockup. Create a high fidelity UI concept comparison board with THREE portrait mobile game screenshots side by side, Aegis Digimon trading card game. Use attached desktop screenshot only as visual style and game layout reference: dark navy translucent notification panels, cyan slim borders, blue-gray tiled game mat, trading card hands and field, small square corners. Preserve actual existing Aegis board design, not a new app. No reference brand names. Each mobile has opponent hand top, opposing field, memory gauge center, own field and own hand bottom. Explore compact desktop-like effect notification TOASTS for narrow 390px screens, at most TWO small toasts on LEFT and TWO on RIGHT, persistent fixed-height rows, tiny card art thumbnails (24px wide), legible short two-line ellipsized clause and timing label. Do NOT put a wide notification band at very top. Concept A: two compact equal-width columns at the upper left/right board corners, around 172px each and 64px high cards with tiny card art. Concept B: smaller outer-edge cards 150px wide, softly translucent panels, center battlefield visible. Concept C: same compact columns but one selected toast expanded as an accessible navy detail sheet in lower-middle with full readable effect text, larger card thumbnail, clear close button, keeping compact toasts visible above. Board remains recognizable and no sci-fi decoration added. Show small labels 'A • Duas colunas', 'B • Bordas', 'C • Detalhes ao tocar' outside screens. Inside cards use Portuguese short real text '[Ao Jogar]', 'Agumon', 'Revele 5 cartas do topo...', 'Cartas reveladas', '+2 cartas'. Detail text: '[Ao Jogar] Revele 5 cartas do topo do seu deck. Adicione 1 Tamer entre elas à sua mão.' Make polished realistic frontend screenshots, accurate tap target design, no huge glows, no redesigned board, no top banner.

## Validation

`node tools/diagnostics/probe-mobile-notices.mjs` mounts the production narration and decision components on the Arena board with supplemental notification records. It checks two toasts per side, stable column bounds during target/order decisions and rejections, native detail taps, focus containment, no horizontally clipped detail content, reduced motion and no page errors at 320×740, 390×844, 768×1024, 844×390 and 1440×900. Outputs live under `.local/motion-reference/mobile-toasts-board/`.

Component tests cover individual dismissal, retained expired details, clause/card order, focus return, paused reading clocks, rejection limits and dual card panels. Real-server browser scenarios exercise accepted Alliance and Barrier on a 320 px phone and grouped card split/merge on desktop after main integration. These checks do not establish complete keyword coverage or completion of the pending audio pass.
