# Profile and replay sharing validation — 2026-10-08

## Implemented behavior

- Dedicated `/profile` route with ten most recent completed matches, outcomes, opponents, modes and timestamps; account editing stays in a dialog. Responsive desktop/mobile layouts use the existing Aegis tokens.
- Server-captured recent history covers casual, private, bot and competitive play, capped at ten records per account. Existing competitive history is merged without duplicate rooms. Saved favorites retain their independent ten-file quota.
- Saved replays expose canonical `/replays/:id` links. Ready recordings default to private; only the owner can change visibility. Public metadata/files allow anonymous reading; private/missing/deleting entries return not found to other viewers. Both access checks and no-store responses remain at the API boundary; storage objects stay private.
- A recent match links only to its owner's saved file. Deleting the file removes the action without erasing the match result.
- MP4 export captures the real browser tab at 1×, from the beginning through the settled final animation, and downloads locally. It requests no microphone/audio, requires a supported desktop browser and explicit tab selection, and does not upload video to the VPS. Hidden tabs, interrupted capture, cancellation, unmount, 30-minute duration and 500 MB buffer limits clean up tracks without presenting an incomplete file as finished.
- ImageGen desktop/mobile/sharing prototypes and the exact built-in generation prompt live in `docs/design/replay-profile/`.

## Review findings addressed

- Snapshot both player identities before awaiting history writes: the departing second player must not lose their entry when `onLeave` clears the session map.
- Refresh the saved-library representation after a history-row visibility change, so both places show the same privacy state. Ignore stale refresh responses.
- Stabilize the pre-existing animation-pause test by observing the flight and pressing pause in the same browser task. The prior protocol round trip could outlive a short animation under host load.
- Allow the authoritative scenario generator a 30-second integration-test ceiling. Its old five-second ceiling timed out under concurrent build/browser load and left a later fake-clock case affected. The complete suite passes with bounded worker concurrency.

## Evidence

- 360 frontend tests passed across 16 suites, including recording generation, replay clocks, presentation queues, gates, existing settings/account screens, routing and export cleanup.
- 45 browser tests passed: ten complex replay scenarios, existing file/library/download flows, public/private links, profile states at 320/768/1024/1440 pixels, Portuguese mobile editing, and actual MP4 encoding/cancellation/unsupported-browser behavior.
- 33 API tests passed across four suites: ownership, publication/revocation (including revocation during storage reads), no-store headers, per-account retention, legacy-history deduplication, profile-to-replay association and consented-departure recording.
- Independent read-only review passed 12 library/history tests and found no remaining concrete blockers after the identity and visibility-cache corrections.
- A real Chromium tab capture of the authoritative Silphymon DNA scenario produced an MP4 validated by browser decoding and ffprobe: H.264, 1440×1000, approximately 18 seconds and 7 MB. This is a synthetic completed test game ending in surrender after the scenario.
- After the mobile identity layout adjustment, all nine profile/browser cases passed again; the name and edit action use separate space on narrow screens.
- Workspace TypeScript checking, production web build and targeted lint passed. Validation environment: Node 24.21.0 (repository declares Node 26); the build retains its existing large-chunk warning.

Production application deployment and reopening PR #5329 are outside this change. The new additive database migration is `025-replay-sharing-history` and runs through the existing migrator when the updated API starts.

## Follow-up: profile scroll and Execute source

- Reproduced clipped profile scrolling: at maximum scroll the last replay ended 56 px below the viewport on desktop and below mobile navigation. The profile route now subtracts desktop navigation height and reserves the mobile bottom navigation/safe-area inset.
- Reproduced Execute focusing trash twice in the authoritative `effects-lab-prod-ghost-execute-security` recording. Narration now captures the physical source lookup from its own batch snapshot when queued, instead of consulting the end-of-chain live board. On Deletion retains its trash focus. Orca Browser confirmed the field focus on `dev-perm-0-lab-execute-ghoulmon`.
- Both new scroll cases and the Execute field/field/trash regression passed. The profile/replay browser run passed 31 of 32 cases; the remaining final-arrival assertion had a protocol-round-trip timing race. After moving its transport assertions into the animation observation's browser task, that case passed separately. All 32 cases therefore passed across those runs.
- 222 cue/source unit tests and 27 ordering tests passed. One existing Seventh Fascination ordering test times out and contaminates subsequent React `act` calls when run in the full file. A read-only baseline run injecting HEAD's original narration implementation reproduced its timeout; the remaining 27 ordering cases passed with that case excluded. Its underlying cause remains unresolved.
- Web TypeScript checking, targeted lint, formatting and `git diff --check` passed. Independent review found no concrete important regressions. Same-batch activation plus self-removal is not established by this cross-batch recording regression.
