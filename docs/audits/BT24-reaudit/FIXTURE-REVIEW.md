# BT24 behavioral fixture review

These concrete errors were found during integration. Check every new scenario against them before reporting proof.

- `settle(predicate)` silently returns after its budget. It never proves the predicate. Follow it with an explicit assertion of the final outcome. Wait for the final destination, not an earlier transient milestone such as security length decreasing.
- Capture card/permanent IDs before deletion, return, or Option resolution. `s.perm(alias)` fails after the permanent leaves. `s.inst(alias)` can fail while a card is in a transient zone.
- Read fixture card catalog identity. BT1-001 through BT1-008 are Digi-Eggs and cannot be main-deck/hand/security placeholders. BT24-036 has Life, not Reptile. Use genuine cards and relevant traits.
- `Permanent.stack` excludes the top card and lists bottom sources first. Do not place a level-four host above a level-five source. Build or document a legal route through every source.
- Prefer neutral hosts. ST1-10 Phoenixmon is a red level-six with no card effects. BT26-033 has its own leave-play prevention, so it cannot isolate inherited Decode. Decode plays a source and still allows the original host to leave; for a return effect the host belongs in hand afterward.
- Rush permits attacking on the play turn; it does not permit a direct attack on an unsuspended Digimon. Raid redirects to a highest-DP Digimon, including unsuspended targets. Test those rules separately.
- Attack security belongs to the opponent. A normal checked Digimon ends in its owner's trash. An empty security attack can finish the game before other timing assumptions become meaningful.
- Active phase unsuspends a prelaid suspended host. To test an End-of-Turn unsuspend, attack in Main first and finish combat before ending Main.
- `runOneTurn()` is asynchronous and does not change the active seat. Set seat/memory between hand-laid turns as the production loop does. Supply enough legal cards in BOTH decks to avoid a later Draw deck-out.
- To move a publicly evolved breeding stack, start a turn, wait for actual `Phase.Breeding`, assert it, then issue the public move. Continue to Main, make the tested action, end Main, and await the turn. Starting a turn does not synchronously enter Breeding.
- `whenHandTrashed` uses `handTrashedSeat` and `handTrashedInstanceIds`. A refusal assertion needs proof that a real eligible optional decision was offered; otherwise no-op behavior can pass vacuously.
- Do not alter an expected zone to fit observed output without proving that the printed rules require that zone. Diagnose unrelated effects, target selection, and transient resolution first.

Root serializes all shared changes and Vitest execution. A failed fixture is work to correct, not a reason to stop. Required tests stay in place until they prove the intended clause. Every report must distinguish static structure, mechanism seams and actual public origins.
