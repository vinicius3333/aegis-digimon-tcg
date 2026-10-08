# Bot and private Unlimited battles

Reuse the existing localized Unlimited switch in Practice vs AI and private-host setup. Current banlist remains the default. Public quick match continues to use its existing separate Unlimited queue. Ranked and tournament rooms never accept client-selected Unlimited rules.

Only registered bot/private handlers grant a capability to choose Unlimited when creating a room. The server freezes that choice at creation, publishes it in synchronized state, and provides it in the private-code lookup through cluster RPC. Listing metadata publication merges the existing matchmaking filter keys so timer and best-of queues remain isolated. Guests see the host’s banlist before choosing a deck and cannot change it; stale or forged join flags are rejected. Private rematches retain the selected rules, and best-of-three continuations take their rules from the server-held series record.

Reuse deckLegality and validateDecklist with their existing Unlimited flag: ignore official banned, restricted, and pair restrictions; preserve printed copy limits, shared card-number budgets, 50-card main deck, five-egg limit, card kinds and known identities. Preserve beta availability independently: private rooms still accept beta cards and practice still routes beta human/custom bot decks to the beta bot registration. Custom bot validation and seating use the authoritative room choice.

Verification covers rendered lobby selection and guest lookup, production room registrations over real websockets, mode mismatch attacks, custom bot decks, printed limits, beta availability, public queues, private series and reconnect state. The coordinator owns real browser proof; this child remains in review without commits or pushes.
