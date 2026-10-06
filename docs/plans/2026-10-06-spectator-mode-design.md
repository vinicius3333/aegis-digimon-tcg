# Spectator mode for casual and private matches

Spectators enter an ongoing casual (including beta casual) or private match using a six-character code or a shared `/play?watch=CODE` link. There is no public match directory. Either player can copy the spectator invitation from the match header; opening it pre-fills the lobby's spectator form without requiring a deck.

The server reserves an observer connection separately from the two player seats. Started matches remain locked to player matchmaking. The HTTP reservation endpoint resolves the code across the room directory and the deployment router searches active and draining slots. The owning room validates the code, supported match mode, lifecycle and observer limit on authentication and again on join. A room accepts up to twenty observers; bot, ranked and tournament matches remain outside this feature.

Observers receive a Colyseus StateView with neither player's private view tag. Hands, decks, egg decks, face-down security identities and decision candidate payloads remain hidden. Public card movements, counts, face-up security, the board, timer and result update normally. Counter candidates are private to the responding player in both state and event messages.

The client renders a fixed view of seat zero with both hands hidden, blocks game actions, hides combat prompts, replaces surrender with leaving the observer connection, and reports a neutral result naming the winner. Observer reconnection uses the existing grace period and tab session persistence without affecting players, decisions or clocks. Finishing or disposing a match releases its spectator code.

Validation covers encoded snapshots and incremental visibility, real WebSocket observers in public and private rooms, incorrect codes, forged observer intents, independent reconnection, match end, matchmaking regression, HTTP admission, deployment routing, lobby entry, invitation parsing and action guards. Run workspace typechecks and focused regressions before committing.
