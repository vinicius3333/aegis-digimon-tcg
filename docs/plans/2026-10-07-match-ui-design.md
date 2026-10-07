# Match feature UI

The user requested ImageGen prototypes and UI improvements for the recent features. The built-in ImageGen tool produced [this reference board](2026-10-07-match-ui-prototype.png). It guides composition; printed rules and existing interaction behavior remain the implementation contract.

## Direction

Retain Aegis's ice-white surfaces, navy navigation and text, magenta actions, cyan status accents, existing display/body typefaces and subtle digital motifs. Use existing design tokens for light and dark themes.

- Balance the four lobby mode cards in one desktop row and two tablet columns, retaining the compact mobile list.
- Show a selected bot deck's thumbnail and card counts beside its native accessible selector.
- Give Unlimited its own bordered editor-format panel. Keep printed-copy-limit guidance visible.
- Make local music selection a deliberate panel with a readable file input, selected filename, secondary restore action and session-local explanation.
- Align board display controls, keep text sizing comfortably clickable, and preserve the rule that hand sorting uses level and card kind.

No new settings, fake statistics, ranked formats, save confirmation or card mechanics are implied by the raster prototype. Display and audio preferences continue applying immediately. Hand sorting is a one-shot button: only current visible cards are reordered; subsequent draws append until the next click. Empty bot selection remains Random. Existing server validation stays authoritative.

## ImageGen prompt summary

Generate a high-resolution landscape UI prototype board with three readable, straight-on app screenshots labelled LOBBY, DECK EDITOR and MATCH SETTINGS. Preserve the existing AEGIS identity: ice-white background, midnight navy header/text, vivid magenta primary actions, small cyan accents, softly rounded white panels, thin pale-blue borders, condensed game headings and readable sans-serif body text. Keep HOME / PLAY / DECKS / COMMUNITY / COLLECTION navigation. Show four balanced lobby modes, a chosen Omnimon deck, separate human and bot decks, one Play vs Bot action, and Unlimited's unranked/printed-copy-limit explanation. Show a deck editor with format guidance, search, filters and abstract card thumbnails. Show match settings grouped into Audio and Board, a local-file music panel with filename and restore action, sorting, extra-large text and pile counts. Avoid mascots, hero artwork, fake analytics, glow and unrelated dashboard redesigns.

## Verification

Use Orca CLI browser screenshots at desktop and mobile sizes, light/dark themes, and exercise existing lobby, audio and preference controls. Run focused behavior tests, locale coverage, web typecheck and changed-file style checks.
