import { describe, it, expect } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine as setup, settle } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for BT13-109 (Belphemon) — [Main] delete 1 of the opponent's level 6+ Digimon, then
// optionally digivolve one of your Digimon into [Belphemon: Sleep Mode] from the trash.
//
// FAILS-WHEN-REVERTED (field-read bug, already fixed by an earlier lane): canActivate/
// resolve filtered `opp.battleArea` through
// `isDigimon(ctx.game.definitionOf({ instanceId: p.topCardId }))`, and `Permanent` has no
// `topCardId` field (the real accessor is `Permanent.topCard`), so `definitionOf` threw
// "Unknown cardId: undefined" the instant the opponent controlled ANY battle-area
// permanent — i.e. always.
//
// FAILS-WHEN-REVERTED (timing bug, Lane R4): this card's [Main] clause was registered
// under `EffectTiming.OnDeclaration`, a window `applyPlayCard` never fires for an Option
// (`playCard.ts` only auto-fires `EffectTiming.OnUseOption`). Driving the effect via a raw
// `activateEffect` intent (as this test previously did) reached the registered module
// directly and never exercised the natural play path, so it could "pass" even though
// actually PLAYING the card sent it straight to the trash with no effect resolution. This
// test now drives a real `playCard` intent instead.
describe("BT13-109 [Main] delete opponent's level 6+ Digimon", () => {
  it("deletes only the level 6+ opponent Digimon, sparing a lower-level one", async () => {
    const s = setup(
      {
        0: {
          battleArea: [{ card: "BT10-079", dp: 3000 }], // §4-21 color-requirement source (Purple)
          hand: [{ card: "BT13-109", as: "card" }],
        },
        1: {
          battleArea: [
            { card: "AD1-001", dp: 5000, as: "lowLevel" }, // Lv.4 — must be spared
            { card: "AD1-004", dp: 12000, as: "highLevel" }, // Lv.6 — the legal delete target
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1] as PlayerState;

    const card = s.inst("card");
    s.state.memory = 0; // maxAffordable for seat 0 (turnSeat) is memory + 10, covers any printed cost

    const lowLevel = s.perm("lowLevel");
    const highLevel = s.perm("highLevel");

    // NEGATIVE CONTROL: with the [Main] clause back at OnDeclaration-only, this playCard
    // call sends the card straight to the trash and leaves both opponent Digimon in place.
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: card.instanceId }),
    ).toEqual({ ok: true });

    await settle(() => !p1.battleArea.some((p) => p.permanentId === highLevel.permanentId));
    await settle(() => false, 60); // flush the optional digivolve-from-trash follow-up

    const rejected = s.events.find((e) => e.kind === "actionRejected");
    expect(rejected).toBeUndefined();

    expect(p1.battleArea.some((p) => p.permanentId === highLevel.permanentId)).toBe(false); // Lv.6 deleted
    expect(p1.trash.some((c) => c.instanceId === highLevel.topCard!.instanceId)).toBe(true);
    expect(p1.battleArea.some((p) => p.permanentId === lowLevel.permanentId)).toBe(true); // Lv.4 spared
  });
});

// A3 for BT13-109's "then digivolve into [Belphemon: Sleep Mode] from your trash" sub-step.
//
// Lane R5's dead-clause family (third variant): `hasName()` in BT13-109.ts read `def.names`
// / `def.name`, neither of which exists on the real `CardDefinition`
// (packages/shared/src/cards/types.ts exposes only `nameEn`), so the trash lookup always
// returned empty and this sub-step silently no-oped even with a legal [Belphemon: Sleep
// Mode] sitting in the trash. Fixed by delegating to the shared `matchNameOrTrait`
// (interpreter.ts) with an exact-name match ("[X]" bare-bracket text references the literal
// card name per Comprehensive Rules 2-3-1-2, not a substring).
//
// FAILS-WHEN-REVERTED: with `hasName` back to reading `def.name`/`def.names`, the trash
// lookup is always empty, so the base Digimon's permanent keeps its original top card and
// [Belphemon: Sleep Mode] never leaves the trash (test RED).
describe("BT13-109 [Main] digivolve into [Belphemon: Sleep Mode] from trash", () => {
  it("digivolves the base Digimon using the trashed [Belphemon: Sleep Mode]", async () => {
    const s = setup(
      {
        0: {
          battleArea: [
            { card: "AD1-001", dp: 2000, as: "base" }, // owner's Digimon to digivolve
            { card: "BT10-079", dp: 3000 }, // §4-21 color-requirement source (Purple)
          ],
          trash: [{ card: "BT13-088", as: "belpheInTrash" }], // nameEn "Belphemon: Sleep Mode"
          hand: [{ card: "BT13-109", as: "card" }],
        },
        1: { battleArea: [{ card: "AD1-004", dp: 12000, as: "foe" }] }, // Lv.6 delete target
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    const base = s.perm("base");
    const foe = s.perm("foe");
    const belpheInTrash = s.inst("belpheInTrash");
    const card = s.inst("card");
    s.state.memory = 6; // exactly the printed play cost

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: card.instanceId }),
    ).toEqual({ ok: true });

    await settle(() => !p1.battleArea.some((p) => p.permanentId === foe.permanentId));
    await settle(
      () => p0.battleArea.find((p) => p.permanentId === base.permanentId)?.topCard?.cardId === "BT13-088",
      120,
    );

    const rejected = s.events.find((e) => e.kind === "actionRejected");
    expect(rejected).toBeUndefined();

    const basePermanent = p0.battleArea.find((p) => p.permanentId === base.permanentId);
    expect(basePermanent?.topCard?.cardId).toBe("BT13-088"); // digivolved using the trashed card
    expect(p0.trash.some((c) => c.instanceId === belpheInTrash.instanceId)).toBe(false); // left the trash
  });
});
