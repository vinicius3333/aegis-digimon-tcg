import { describe, it, expect } from "vitest";
import { setupEngine as setup, settle } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for BT19-089 (Healing After the Battle is Over) — [Main] grants 1 of your Digimon
// immunity to opponent Option effects + DP immunity.
//
// FAILS-WHEN-REVERTED (field-read bug, already fixed by an earlier lane): canActivate/
// resolve filtered the OWNER's `battleArea` through
// `isDigimon(ctx.game.definitionOf({ instanceId: p.topCardId }))`, and `Permanent` has no
// `topCardId` field (the real accessor is `Permanent.topCard`), so `definitionOf` threw
// "Unknown cardId: undefined" the instant the caster controlled ANY battle-area
// permanent — i.e. always.
//
// FAILS-WHEN-REVERTED (timing bug, Lane R4): this card's [Main] clause was registered
// under `EffectTiming.OnDeclaration`, a window `applyPlayCard` never fires for an Option
// (`playCard.ts` only auto-fires `EffectTiming.OnUseOption`). Driving the effect via a raw
// `activateEffect` intent (as this test previously did) reached the registered module
// directly and never exercised the natural play path, so it could "pass" even though
// actually PLAYING the card sent it straight to the trash with no effect resolution. This
// test now drives a real `playCard` intent instead.
describe("BT19-089 [Main] grant Option immunity + DP immunity", () => {
  it("grants the restrictions to the chosen Digimon", async () => {
    const s = setup(
      {
        0: {
          hand: [{ card: "BT19-089", as: "card" }],
          battleArea: [{ card: "AD1-001", dp: 4000, as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const card = s.inst("card");
    s.state.memory = 0; // maxAffordable for seat 0 (turnSeat) is memory + 10, covers any printed cost

    const target = s.perm("target");

    // NEGATIVE CONTROL: with the [Main] clause back at OnDeclaration-only, this playCard
    // call sends the card straight to the trash and grants nothing.
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: card.instanceId })).toEqual({ ok: true });

    const continuous = (
      s.engine as unknown as {
        continuous: { hasRestriction(id: string, r: string, sourceKind?: string): boolean };
      }
    ).continuous;

    await settle(() => continuous.hasRestriction(target.permanentId, "dpImmune"));

    const rejected = s.events.find((e) => e.kind === "actionRejected");
    expect(rejected).toBeUndefined();

    expect(continuous.hasRestriction(target.permanentId, "dpImmune")).toBe(true);
    // Qualified grant: immune to Option-sourced effects specifically (not an unqualified
    // "can't be affected by anything" restriction).
    expect(continuous.hasRestriction(target.permanentId, "beAffected", "Option")).toBe(true);
  });
});
