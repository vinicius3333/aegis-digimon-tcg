import { describe, it, expect } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine as setup, settle } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for BT15-098 (Night Raid) — proves the [Main] on-play body ("By deleting 1 of your
// Digimon, you may play 1 [Myotismon] from your trash without paying the cost. Then, place
// this card in the battle area.") actually resolves when the card is PLAYED.
//
// Lane R4's dead-clause class: the module used to register this clause exclusively at
// EffectTiming.OnDeclaration, a window `applyPlayCard` never fires for an Option
// (`playCard.ts` only auto-fires `EffectTiming.OnUseOption`). Playing the card sent it
// straight to the trash with no deletion and no battle-area placement. The fix re-homes
// the clause to `EffectTiming.OnUseOption`.
//
describe("BT15-098 [Main] on-play body fires on a real playCard (not dead)", () => {
  it("deletes 1 of the owner's Digimon and lands in the battle area", async () => {
    const s = setup(
      {
        0: {
          battleArea: [
            { card: "AD1-001", dp: 3000, as: "own" },
            { card: "BT10-079", dp: 3000 }, // §4-21 color-requirement source (Purple)
          ],
          hand: [{ card: "BT15-098", as: "option" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const own = s.perm("own");
    const option = s.inst("option");
    s.state.memory = 0; // maxAffordable for seat 0 (turnSeat) is memory + 10, covers cost 4

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: option.instanceId })).toEqual({ ok: true });

    await settle(() => p0.battleArea.some((perm) => perm.topCard?.cardId === "BT15-098"));
    await settle(() => false, 60); // flush the rest of the resolution

    // NEGATIVE CONTROL: a reverted (OnDeclaration-only) module leaves the owner's Digimon
    // and the trash-Option's zone completely untouched by this playCard call.
    expect(p0.battleArea.some((p) => p.permanentId === own.permanentId)).toBe(false); // own Digimon deleted (cost)
    expect(p0.battleArea.some((perm) => perm.topCard?.cardId === "BT15-098")).toBe(true); // placed
    expect(p0.trash.some((c) => c.cardId === "BT15-098")).toBe(false); // NOT trashed
  });
});

// A3 for the "you may play 1 [Myotismon] from your trash without paying the cost" sub-step.
//
// Lane R5's dead-clause family (third variant): `hasName()` in BT15-098.ts read `def.names`
// / `def.name`, neither of which exists on the real `CardDefinition`
// (packages/shared/src/cards/types.ts exposes only `nameEn`), so the trash lookup always
// returned empty and this sub-step silently no-oped even with a legal [Myotismon] sitting
// in the trash. Fixed by delegating to the shared `matchNameOrTrait` (interpreter.ts) with
// an exact-name match ("[X]" bare-bracket text references the literal card name per
// Comprehensive Rules 2-3-1-2, not a substring — this also correctly excludes
// [VenomMyotismon], which the card text treats as a distinct name).
//
describe("BT15-098 [Main] play [Myotismon] from trash", () => {
  it("plays the trashed [Myotismon] onto the battle area without paying its cost", async () => {
    const s = setup(
      {
        0: {
          battleArea: [
            { card: "AD1-001", dp: 3000, as: "own" }, // deletion cost target
            { card: "BT10-079", dp: 3000 }, // §4-21 color-requirement source (Purple)
          ],
          trash: [{ card: "BT15-076", as: "myotismonInTrash" }], // nameEn "Myotismon"
          hand: [{ card: "BT15-098", as: "option" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const myotismonInTrash = s.inst("myotismonInTrash");
    const option = s.inst("option");
    s.state.memory = 0; // maxAffordable for seat 0 (turnSeat) is memory + 10, covers cost 4

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: option.instanceId })).toEqual({ ok: true });

    await settle(() => p0.battleArea.some((perm) => perm.topCard?.cardId === "BT15-098"));
    await settle(() => p0.battleArea.some((perm) => perm.topCard?.instanceId === myotismonInTrash.instanceId), 120);

    expect(p0.battleArea.some((perm) => perm.topCard?.instanceId === myotismonInTrash.instanceId)).toBe(true); // Myotismon played from trash
    expect(p0.trash.some((c) => c.instanceId === myotismonInTrash.instanceId)).toBe(false); // left the trash
  });
});
