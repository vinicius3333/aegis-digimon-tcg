# Alternate card artwork

Approved scope: players can browse available printings and choose which artwork each physical deck copy displays during a match. Artwork is cosmetic; canonical card identity, copy limits, restrictions, and rules behavior remain unchanged.

## Player experience

The collection exposes artwork counts and an artwork carousel in card details. In the deck editor, cards with alternate printings have a visible **Choose artwork** action. A dedicated dialog displays large printing thumbnails, identifies the selected copy, saves a selected printing immediately, and can apply the current selection to every copy. Different copies of the same canonical card may retain different printings. The dialog supports keyboard focus, Escape, and scrolling on small screens.

Saved choices appear in deck previews, covers, the hand, battle area, stacks, trash, zoom views, decisions, and relevant presentation animations. Hidden cards keep their artwork hidden with their identity.

## Data and compatibility

`mainDeck` and `eggDeck` remain arrays of canonical card IDs. Optional `mainDeckArts` and `eggDeckArts` are per-copy printing IDs aligned with those arrays. Selecting an art changes its aligned entry only. The shared catalog exposes `getCardArts(cardId)` and `resolveCardArt(cardId, artId)`; missing, foreign, or unknown artwork resolves to the original printing.

Local and account deck persistence retain artwork arrays. Account writes validate supplied arrays as string arrays of the corresponding deck length. Database migration `015-deck-card-arts` adds JSONB columns; old saved decks and tournament snapshots remain usable through original-art fallback. Tournament registration freezes printing choices together with the canonical deck. The engine assigns each `CardInstance.artId` before shuffling, preserving artwork as that instance moves between zones. Both `cardId` and `artId` use the same visibility tag.

## Verification

Focused tests cover catalog printings and hostile unknown IDs, per-copy selection and mixed printings, apply-to-all, dismissal, local save/load, account transport, filtering stale cards with aligned choices, independent preset copies, engine setup, visibility, tournament snapshots, and runtime artwork previews. Type checking, lint, formatting, and a browser walkthrough cover the integrated flow.
