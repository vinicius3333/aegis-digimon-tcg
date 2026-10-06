# Mobile notification rollback and local cleanup — 2026-10-06

The user canceled the mobile notification redesign and asked for temporary files to be removed.

## Rollback

- Phones that collapse notices use the main-branch folded band and expandable column again (main baseline `e25962ae8`).
- The branch keeps its desktop two-toast caps, paused reading clocks, effect counts and prompt-source marks.
- `CompactNarration`, its stylesheet and tests, its summary helper and the mobile notice probe are removed.
- Integrated into `feat/effects-lab` at `33d6b3f96`. Commit `ccc0bbf0e` also carries some of the file deletions, so on its own it does not build; history was not rewritten.

## Removed local files

- The parent worktree's `.local` folder (2,223 MB): generated pacing, motion and integration captures, browser recordings, screenshots and a downloaded reference cache. No running process used it and no source reads it. Tracked outcome documents keep their conclusions, including the native timing failures; their `.local/...` paths now point at removed files.
- `tools/diagnostics/__pycache__`, `.DS_Store` files and temporary build output.
- Eight finished child worktrees (about 3.2 GB): `finish-bot-pacing`, `finish-game-audio`, `finish-titan-departure-pacing`, `finish-visual-regressions`, `fix-grouped-departure-visuals`, `mobile-field-card-sizing`, `redesign-mobile-battle-toasts`, `refine-card-audio-112`. Every commit was already in `feat/effects-lab` and on the remote. Their only untracked files were capture folders and one WAV that is byte-identical to the tracked `bright-motion.wav.gz`.

Kept: source, tracked docs, public preview and audio files, the parent's uncommitted edits, and live servers.
