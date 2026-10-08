# Historical and Pauper deck formats

Date: 2026-10-08

Branch: `feat/historical-pauper-formats`

## Behavior

Deckbuilder and the casual, practice, and private-room lobby expose a shared Format selector. Released BT, EX, ST, RB, and AD products define historical formats. A set format includes the cumulative English card pool through that product's release date and restrictions effective on that date. BT13 uses 2023-07-21. Standard keeps the live banlist; Unlimited bypasses restrictions while retaining printed deck construction limits.

Pauper allows Common and Uncommon base cards, as requested by the user. Alternate artwork never changes rarity eligibility. Pauper uses the current Standard banlist and ordinary deck sizes. Changing a deck's format keeps its cards, shows violations, filters the available pool, and prevents starting an invalid match. Saved decks retain their format; existing records default to Standard.

Casual matchmaking separates formats. The server fixes a room's format at creation, validates both decks, and supplies host rules to private guests. Bots, rematches, and best-of-three continuations use the room's format. Ranked, tournament, and public beta rooms require Standard. Format selection is granted only by registered room handlers.

## Implementation

`packages/shared/src/deckFormat.ts` centralizes format membership, date, copy limits, rarity checks, and banned pairs. Both shared deck legality and authoritative API validation use it. Saved deck migration 024 adds a Standard-defaulting format column. GameState synchronizes the format and casual series records retain it.

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
