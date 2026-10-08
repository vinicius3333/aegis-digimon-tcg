# Historical and Pauper deck formats

Date: 2026-10-08

Branch: `feat/historical-pauper-formats`

## Behavior

Deckbuilder and the Random, Bot, and Private lobby expose independent Cards through and Rules controls. Released BT, EX, ST, RB, and AD products define historical card pools. Every pool combines with Standard, Pauper, or Unlimited. A historical pool includes the cumulative English card pool through that product's release date. Standard and Pauper apply restrictions effective on that date; all-set pools use the current banlist. BT13 uses 2023-07-21. Unlimited bypasses restrictions while retaining the chosen card pool and printed deck construction limits.

Pauper allows Common and Uncommon base cards, as requested by the user. Alternate artwork never changes rarity eligibility. Pauper uses its pool's banlist date and ordinary deck sizes. Changing a deck's format keeps its cards, shows violations, filters the available pool, and prevents starting an invalid match. Saved decks retain both choices; existing records default to Standard. Switching Random, Bot, and Private keeps the selected pool and rules. Private guests see both host controls disabled.

Casual matchmaking separates formats. The server fixes a room's format at creation, validates both decks, and supplies host rules to private guests. Bots, rematches, and best-of-three continuations use the room's format. Ranked, tournament, and public beta rooms require Standard. Format selection is granted only by registered room handlers.

## Implementation

`packages/shared/src/deckFormat.ts` centralizes format membership, composition, date, copy limits, rarity checks, and banned pairs. Both shared deck legality and authoritative API validation use it. Saved deck migration 024 adds a Standard-defaulting format column. Plain set ids remain compatible Standard snapshots; combinations serialize as `BT13:pauper` or `BT13:unlimited` in the existing text column. GameState synchronizes the combination and casual series records retain it. Both regular and Unlimited queues filter by the entire combination. Ranked controls are offered only for all-set Standard.

The historical feature exposed existing banlist omissions. The English restriction history now places SaviorHuckmon and Eyesmon at the regional BT8 release (2022-05-13), includes the 2025-03-28 Agunimon/Lobomon restrictions, and models the Sayo & Koh pairing interval. These changes follow the [official restriction page](https://world.digimoncard.com/rule/restriction_card/); the [official BT13 product page](https://world.digimoncard.com/products/pack/ver13.php) confirms its release date. The scraper handles regional-release headings and multiple cards inside one entry.

## Data boundaries

This feature snapshots pools and restrictions, while matches use the current engine rules and errata. The existing shared English release calendar approximates combined BT1–BT3 and BT18–BT20 products. Existing promo dates have not all been verified against primary sources; their recorded dates determine inclusion. Undated cards and the aggregate LM collection are excluded from historical formats. These boundaries need a separate release-calendar audit before claiming exact reproduction of every historical event.

## Validation

Focused shared, API, web, and scraper tests cover historic restrictions and lifts, banned-pair intervals, Pauper rarity, printed copy exceptions, saved formats, private host enforcement, public format mismatches, bots, Unlimited tab changes, and series continuation. Playwright exercises BT13 copy limits at 320, 768, 1024, and 1440 pixels, horizontal overflow, and preservation of cards when switching to Pauper. Type checks and independent code review cover the integrated change.

## Imagegen prototype

Generated once with the built-in `image_gen.imagegen` tool, opaque background, with no reference images. The selected result was copied from the tool's generated-image directory into [the project prototype](../prototypes/deck-formats-imagegen.png). The prototype established the control placement; the implementation uses the application's current design tokens.

Exact generation prompt:

> Use case: ui-mockup. Asset type: Aegis Digimon TCG deckbuilder format selector prototype. Create a high fidelity desktop screenshot, 1440x900 composition. Match established Aegis UI: navy top navigation with angular AEGIS wordmark, white app background, cool gray borders, electric blue controls, compact sans serif text. Navigation Home, Play, Decks selected, Collection. Three columns: narrow card filter rail on left, trading card artwork grid in middle, current deck with counts on right. Add a compact Format selector ABOVE the card grid. Show its dropdown open with clearly readable options "Standard", "Unlimited", "Pauper · C / U", and historical "BT13 · July 21, 2023", "BT12", "BT11". BT13 selected. Adjacent summary text "Card pool through BT13" and "Banlist: July 21, 2023". Right deck panel titled "Royal Knights", format chip "BT13", counts "Main 50/50" and "Egg 5/5", blue "Save deck" button. Smaller helper "Earlier sets, starters, and eligible promos included". Illustrate cards as plausible monster trading cards; exact art not important. Keep format control readable and restrained, integrate with existing deckbuilder rather than designing a marketing page. No gradients, no new mascot, no watermark.

The actual UI screenshots and browser recording are review evidence captured from the local deckbuilder fixture, rather than generated images.

## Lobby prototype

The user's follow-up clarified that set pools and Pauper/Unlimited rules must be independent, with a remodeled match setup for Random, Bot, and Private. Generated a second opaque prototype with the built-in `image_gen.imagegen` tool, with no reference images, and saved it as [the lobby prototype](../prototypes/lobby-format-combinations-imagegen.png). The production controls use two accessible native selects and the existing design tokens. No PR is required; the previously opened draft was closed at the user's request.

Exact generation prompt:

> Use case: ui-mockup. Create a polished high fidelity screenshot prototype for the existing Aegis Digimon TCG PLAY lobby, desktop wide aspect ratio. Match actual project design: off-white app canvas, white flat panels, deep navy text, magenta accent for selected states and buttons, restrained compact geometric sans serif, hairline cool gray borders, small corner radii, no gradients, no large shadows, no mascot. Portuguese labels. Header "Jogar". Three horizontally aligned opponent choice buttons "Random", "Bot", "Privado", Random selected with magenta outline. Below them a clearly prominent configuration panel titled "Regras da partida". Two INDEPENDENT controls side by side: dropdown labelled "Cartas até" showing "BT13 · 21/07/2023", and a three-choice segmented control labelled "Regras" with "Standard", "Pauper · C/U", "Unlimited"; Pauper selected. Small readable summary chip "BT13 + Pauper", helper "Cartas até BT13 · Apenas C/U · Restrições de 21/07/2023". Beneath this controls for "Melhor de 1 / Melhor de 3" and "Timer". The important point is any set can combine with any rules variant, never put BT13 and Pauper in a single mutually exclusive list. At top or bottom an active deck strip "Eosmon", "50/50 · 4/5", green "Deck válido", and magenta "Entrar na fila" action. Lower section "Escolha seu deck" shows three existing trading-card deck tiles with monsters, names Eosmon, Red Hybrid, Royal Knights; inappropriate decks dimmed with informative labels. Small top navbar AEGIS, Início, Jogar selected, Decks, Coleção. This is a usable in-product screen, not marketing. Clear legible controls and natural hierarchy. No watermark.

Additional verification covers every pool/rules composition, combined saved formats, historical Unlimited queue separation, bots, private inheritance, best-of-three continuation, deck gating, and switching opponent modes. The production lobby fixture is exercised at 320, 768, 1024, and 1440 pixels.

Follow-up results: 107 focused API tests, 73 frontend tests, 7 shared rules tests, and 11 browser scenarios passed. Workspace type checks and focused type checks for the added/modified format E2E files pass. The optional type check of the entire E2E directory still reports existing errors in unrelated audio/Discord scenarios and missing API build artifacts. Lint reports existing mock-type warnings and no errors; `git diff --check` passes.

## Quick play and banlist details

The Play screen starts with advanced settings collapsed. The visible summary shows the chosen card pool/rules, BO1/BO3, and timer state. The active deck and start action stay prominent; private Create/Join/code and existing-room controls remain outside the disclosure. Card pool/rules, series, timer duration, bot deck, beta opt-in, and random pool controls are available in Advanced settings. Collapsing the panel or switching opponent modes preserves choices. Practice remains the server's untimed single-game mode.

Every app session starts with timer ON, including browsers with an old saved timer opt-out. Disabling the timer in Advanced settings applies during the current session and survives opponent changes; reopening the app resets it to ON. Timer choices are no longer persisted. BO1 remains the default, with explicit BO3 preferences remembered. The App sends the selected session settings in match options.

Banlist dates in the shared selector open a tooltip on hover, keyboard focus, or tap. The content comes from the same snapshot and pair interval functions used by validation, listing card ids/names, bans, copy limits, and forbidden pairs. The 2021-01-29 snapshot has no recorded restrictions and shows an explicit empty state. Unlimited has no banlist trigger. The tooltip supports Escape, keyboard scrolling, touch dismissal, and narrow viewports; changing formats closes it.

Follow-up verification: 60 focused frontend tests pass. Eleven existing format browser scenarios and seven new tooltip/quick-play scenarios pass, including 320/768/1024/1440 layouts, single-click queue entry with timer ON/BO1, collapsed controls, keyboard disclosure, saved opt-outs/BO3, private Join essentials, historical restriction/lift/pair snapshots, empty first banlist, Escape/keyboard scrolling, and touch dismissal. Independent review found no important issues. Web and focused format E2E type checks pass; lint has no errors and only existing mock-type warnings.

Timer default correction: the old localStorage timer preference no longer overrides the default. App and Lobby initialize the timer to ON, and Advanced settings can disable it for the current session. Sixty-two App/Lobby tests pass; a browser regression starts with the legacy stored value `false`, verifies ON, toggles OFF across opponent changes, reloads, and verifies ON again. Targeted lint and whitespace checks pass.
