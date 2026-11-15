# Testing Sealed play

Use two independent browser profiles or private windows for Private Sealed. Each profile uses its existing account display name or automatic guest name.

1. Open **Play → Private Match → Advanced settings → Card pool & rules → Rules → Sealed Format**. Choose a released booster product before Create, then share the invitation with the second profile. Join from the invitation or the same setup's Join tab without entering another player name. No saved constructed deck is required. Back to Play returns to Rules; selecting Sealed Format again resumes the existing room.
2. Before opening, verify **0 / 6 packs opened** and no card-pool Add controls. Enter the original booster, select a pack and let its normal animation run. Return during a partial reveal and reload: the builder must still have no cards, and reopening must resume that reveal.
3. Finish all twelve reveals. Return to the regular builder: only those twelve pulls are available, including their actual quantities and artwork. Open another pack for twenty-four eligible cards, then finish the remaining packs for all seventy-two. The original Skip animations and Open all controls may complete remaining packs.
4. On a phone, swipe the card pool to its last currently available card. Swiping must not add cards. Inspect a card, return, add/remove cards and open/close the deck panel. Check the short viewport as well as portrait, both themes, and that Ready remains reachable.
5. Build forty main cards and zero to five Digi-Eggs in both profiles, then Ready. Reload and reconnect: the pool and locked deck must persist. Start game one, make mulligan choices and play a turn. End it through the normal surrender confirmation.
6. Between games, exchange an owned card with the sideboard and Ready again. The pool must stay identical. Complete game two and verify the series score and result. Active-game deck changes must remain locked.

Repeat ordinary solo `/booster` opening with an existing practice box: sealed opening must not alter it. Check a normal constructed deck and match as well.

[Rules and BO3 policy](sealed-rules.md) distinguish official between-match sideboarding from the Aegis between-game policy. [Product coverage](sealed-products.md) documents supported English/world products and estimated collation. Browser opening progress is tab/session scoped; independent tabs or devices open their existing allocation themselves. Server allocation, submitted decks and recorded series progress remain durable. A server restart does not recover an active in-memory game.
