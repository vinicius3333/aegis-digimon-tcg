# BT24-065 source-play mechanism audit

The retained source-play regression initially appeared to expose an engine seam: a BT24-065
permanent with a BT24-065 card under it was expected to replay that stack card after leaving play.
That fixture is not a legal game state. BT24-065 is level 6 and cannot be placed over another
BT24-065 as the named Diaboromon evolution source for this test.

The fixture now uses a catalog-legal BT17-059 Diaboromon beneath BT24-065. The replacement's
`thisDigimon` target resolves the exact stacked instance while the host permanent is still live,
then the normal play primitive moves that instance to the battle area. No engine change was
required. The retained test is green with 11/11 tests passing, including the existing hand-source,
refusal, and replacement behavior checks.

The temporary trace confirmed the candidate pool contained the exact stack instance (`inst-53`)
with the live host (`seed-perm-52`) before departure. The previous failure was therefore rejected
as an engine defect and attributed to the illegal same-card stack fixture.
