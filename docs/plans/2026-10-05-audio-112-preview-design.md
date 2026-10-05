# Refined audio audition

Keep the existing preview at `/dev/audio-preview/index.html` and its gameplay
audio module, controls and six-cue simultaneous demo. Add seven individually
playable everyday cues to the existing button group: focus, end turn, hand
discard, stacked-source trash, de-digivolution, level 3→4 and level 4→6 evolution.
Each calls the same prepared packed-buffer playback as gameplay, with explicit
physical-level parameters for evolution. Native buttons retain keyboard access.

The separate array keeps the original six-cue overlap test unchanged. Reuse
existing gesture preparation, mixer controls and status handling. Validate the
extra buttons against exact gameplay offsets in the bounded browser run; retain
the existing 320px preview check. Expose before/after assets only when the audio
owner supplies their exact committed identities. No game layout changes.
