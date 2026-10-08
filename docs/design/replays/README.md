# Replay and match result UI

Implemented on `replay-files`, following the user's preference to focus on replays and match results. The game board keeps its existing layout and art.

Screenshots were captured through the **Orca CLI in the Orca Browser**, running the worktree web client on `http://localhost:4180` against a local API on port 2580. The result screenshots come from actual bot matches. Playback screenshots use a real participant replay recorded by the local server, with 41 frames. Mobile captures use a 390 × 844 viewport.

| Screen          | Before                      | After                            |
| --------------- | --------------------------- | -------------------------------- |
| Open file       | [Before](before-import.png) | [After](after-import.png)        |
| Playback        | [Before](before-player.png) | [After](after-player.png)        |
| Match result    | [Before](before-result.png) | [After](after-result.png)        |
| Mobile opening  | —                           | [After](after-import-mobile.png) |
| Mobile playback | —                           | [After](after-player-mobile.png) |

The built-in `image_gen.imagegen` tool generated the [design reference](imagegen-concept.png) from the three original screenshots. The exact [generation prompt](imagegen-prompt.md) is saved alongside it. The reference guided the implemented React/CSS layout; it is not used as a bitmap interface.

Changes: local file drop area and keyboard-accessible picker, existing card art as a preview, numbered action history, matchup/date/winner header, grouped transport controls, persistent mobile controls above navigation, and a dedicated result download row. Replay screens account for the desktop navigation height and mobile safe areas.

Validation: production web build, TypeScript, focused lint/format checks, replay and result unit tests, and 11 browser tests, including five viewport sizes, real-match download/import, drag-and-drop, malformed files, and playback controls. A separate code review checked accessibility and layout; its hidden focus and long-name findings were corrected.

## Fullscreen update

The replay viewer now fills the viewport and displays both recorded hands for completed-game exports. Playback controls float above the board, with optional history and collapsible playback settings. The mobile controls sit above the player's cards.

- [Desktop, captured in Orca Browser](fullscreen-desktop.png)
- [Mobile, captured in Orca Browser](fullscreen-mobile.png)
