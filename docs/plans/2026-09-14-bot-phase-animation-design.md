# Bot phase animation ordering

Match `2d7a06e1-2d77-452b-ae57-184d0753d155` showed a growing presentation backlog: Taiki Kudo was played at 23:27:24 UTC, finished arriving at 23:27:31, and announced its effect at 23:27:32, after two bot decisions. The client reported no failed or cancelled animation steps.

Phase announcements must wait for the preceding hatch or breeding movement batch and its finite animation, along with card movement batches, just as they already wait for plays and evolutions. Raw events can arrive before the corresponding state patch and closed batch. The prerequisite must cover that gap without allowing a later-phase cue to block its own phase.

The bot accounts for every announced phase ribbon and turn-change ribbon using shared presentation budgets. Consecutive ribbons consume cumulative time, including outstanding card/effect/security narration. This preserves existing server authority and prevents the bot's ordinary two-second think interval from outrunning a turn opening that takes at least 6.65 seconds to present. Client timing tests enforce that the shared budgets cover the actual ribbons and gaps.

Regression tests cover delayed hatch and breeding movement patches, cumulative turn-opening pacing, and existing queue, replay, fast-forward and security behavior. These changes do not provide acknowledgements of actual client completion; unusually slow browsers can still outlast the estimated budgets.

Effect draw flights are launched from their deck-to-hand event batch. Draw events include the drawing seat, allowing the concealed opponent hand to animate even when its count returns to the pre-Option count. Matching hand-count fallback flights are suppressed to avoid duplicates. Normal turn draws retain their phase-driven timing.

All active narration records remain visible until their own expiry or dismissal. Portrait mobile uses a single band 3.5 rem below the top safe area, with no internal scroll or title clamping. Card panels wrap and narrow their miniatures on small screens. Desktop viewer stacks grow downward to avoid crossing the top edge. Visual checks in Orca Browser use 320, 393, 768 and 1440 pixel frames with the real notice components and styles.
