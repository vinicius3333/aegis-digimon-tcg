# Public deck share links

A player shares a URL that opens a read-only deck page for anyone, signed in or not, with a one-click "Import to my decks" button. Discord and other chat apps show a rich preview of the link.

## Decision

Store a server-side snapshot per share. Serve Open Graph HTML only to link-preview bots; browsers get the SPA.

A stateless deck code in the URL is not simpler in practice: Discord previews still need the server, and a code can never be unlisted.

## Current state

| Area           | Where                                                                                            | Notes                                                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Deck shape     | `apps/web/src/game/decks.ts:72` (`DeckListing`)                                                  | Text format is DigimonCard.io only: `parseDeckList` (`:315`), `serializeDeckList` (`:353`). Reusable: `copyDeckPreset` (`:119`), `deckCurve` (`:280`). |
| Guest decks    | `apps/web/src/identity.ts`                                                                       | localStorage key `aegis:decks` only.                                                                                                                   |
| Account decks  | `App.tsx:143-184`, `account/client.ts:81-107`                                                    | Local-only decks are pushed on sign-in; saves and deletes sync.                                                                                        |
| Server storage | `saved_decks` (migrations 001, 015); `accounts/routes.ts:158-212`; `AccountStore.ts:359`, `:383` | `saveDeck` resolves art. Cap of 100 decks per account (`:121`). Nothing is public.                                                                     |
| Deck image     | `screens/deckImageExport.ts:153`                                                                 | Client-only canvas. Art is `.webp` on raw.githubusercontent (`packages/shared/src/cards/images.ts:31`).                                                |
| Hosting        | `apps/web/index.html`, `apps/web/Dockerfile`, `docker/Caddyfile`, `tools/deploy/gateway.mjs`     | Pure SPA with no meta tags. `isApiPath` (`gateway.mjs:31-35`) already splits `/tournaments` by `Accept` header; reuse that pattern.                    |
| Rate limiting  | `apps/api/src/http/rateLimit.ts:12`                                                              | In-memory per process.                                                                                                                                 |

## Design

### Snapshot, not a live link

A link shows exactly what was shared, like tournament deck snapshots. Sharing again creates a new snapshot. The same owner sharing an identical deck gets the existing link back, found by content hash.

### Migration `deck-shares`

Table `deck_shares`:

- `id`: 10-character random base62 key
- `owner_account_id`: nullable; set to null when the account is deleted
- `source_deck_id`
- `name`: at most 40 characters
- the four card and art arrays (jsonb), `cover_card_id`
- `content_hash`, `manage_token_hash` (nullable)
- `created_at`, `revoked_at` (milliseconds)

Indexes: `(owner_account_id)`, and unique `(owner_account_id, content_hash)`.

### API

New file `apps/api/src/decks/shareRoutes.ts`, installed next to the account routes.

| Endpoint                   | Behavior                                                                                                                                                                                                                                                 |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /deck-shares`        | Session optional, so guests can share. Validates known and deckable cards, at most 50 main and 5 egg cards, name length. Resolves art like `saveDeck`. Rate-limited per account or IP. Returns `{id, url, manageToken?}`; the token goes to guests only. |
| `GET /deck-shares/:id`     | JSON with a 5-minute public cache. Revoked links return 404.                                                                                                                                                                                             |
| `DELETE /deck-shares/:id`  | Owner session, or a guest's `X-Manage-Token`.                                                                                                                                                                                                            |
| `GET /account/deck-shares` | Lists the caller's links so they can unlist them.                                                                                                                                                                                                        |
| `GET /decks/share/:id`     | Small escaped HTML page for bots: `og:title`, `og:description` (card count, colors, level curve), `og:image` (cover art absolute URL, branding PNG fallback), `theme-color` from the deck color, `twitter:card`.                                         |

### Proxies

- Add `/deck-shares` to `isApiPath` in `gateway.mjs` and to `docker/Caddyfile`.
- Route `/decks/share/*` to the API only when the User-Agent is a preview bot: Discordbot, Twitterbot, facebookexternalhit, Slackbot, WhatsApp, TelegramBot. People get the SPA.

### Web

- Route `/decks/share/:id` in `routes.ts`.
- New `SharedDeckScreen.tsx`. Reuses `DeckPreviewSections` (`deckPreview.tsx:40`), `deckCurve`, `dominantColor`, `deckLegality` (`DeckListCard.tsx:25`) and `DeckImageButton`.
- "Import to my decks" copies the deck with a fresh id (like `copyDeckPreset`), runs `filterDeckToKnownCards`, then calls `saveDeck` (`App.tsx:166`). This covers guests and accounts. Show an error when the account already has 100 decks; today that 409 is ignored.
- Add a "Link" tab to `DeckExportModal` (`DeckTextModals.tsx:120`) and a share button in `DeckList.tsx`. Copy the link. Keep guest manage tokens in localStorage.
- Add strings to `en.ts` and `pt-BR.ts`.

## Commits

1. Migration, registered in `migrations/index.ts`, with its test.
2. Store methods: create with dedupe, get, revoke, list by owner.
3. JSON endpoints with validation and rate limiting.
4. Bot-facing Open Graph HTML endpoint.
5. Routing in `gateway.mjs` and the Caddyfile.
6. Client API calls and the new route.
7. `SharedDeckScreen` with import.
8. Share entry points, including the guest token.
9. i18n strings and `API-CONTRACT.md`.

## Tests

- Store tests on pg-mem (`createMemoryPool`), following `AccountStore.test.ts`.
- `routes.deckShares.test.ts` with the `routes.profile.test.ts` harness: 400 on unknown cards or oversize decks, guest vs owner delete, 404 after revoke, 429 from the rate limit, HTML escaping of a name like `<script>`.
- Migration test in the style of `012-account-avatar.test.ts`.
- `gateway.test.mjs`: bot vs browser on `/decks/share/x`.
- `routes.test.ts` parses the new path.
- `SharedDeckScreen.test.tsx` with mocked fetch: renders the deck; import calls `saveDeck` with a new id.
- `uiCompleteness.test.ts` covers the new strings in both languages.

## Risks

- Rate limits are per process across 3 processes and several deploy slots. They slow abuse; they do not stop it. A daily per-account or per-IP cap in Postgres is stricter.
- Discord caches previews, so an unlisted link can keep its old preview.
- The preview image depends on a third-party `.webp`. Confirm that Discord renders it. A server-rendered PNG needs a native image library; defer it.
- Banlist or card-pool changes can make a shared deck illegal later. Compute legality on view and drop unknown cards on import.

## Open questions

1. Can guests share, or only signed-in players? Guests can unlist only from the device that holds the token.
2. Frozen snapshot, or can the owner update a link?
3. Deck names are public, unmoderated text in previews. Do we need a report button or an admin revoke?
4. Should the page show who shared the deck?
5. Should guest links expire?
