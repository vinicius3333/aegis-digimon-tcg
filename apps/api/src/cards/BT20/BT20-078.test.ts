import { describe, it, expect } from "vitest";
import { EffectTiming, type PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT20-078.js";
import "./BT20-073.js";
import "./BT20-069.js";
import "./index.js";

// A3 for BT20-078 (Reapermon — Purple Lv.6 Digimon).
//
// [Static] ＜Collision＞
// [Static] ＜Blocker＞
// [On Deletion] Delete 1 of your opponent's Digimon or Tamers with a play cost of 4 or less.
//
// FAILS-WHEN-REVERTED: on Reapermon's deletion, a <=4-cost opponent permanent is deleted.

const REAPERMON = "BT20-078";
// BT1-010 Agumon — cost 3, Digimon (qualifies for "cost 4 or less" deletion target).
const AGUMON = "BT1-010";
// BT1-021 MetalGreymon — cost 6 Digimon (does NOT qualify — too expensive).
const METAL_GREYMON = "BT1-021";

describe("BT20-078 Reapermon — On Deletion deletes cheap opponent permanent", () => {
  it("watches opponent effect-driven digivolutions and de-digivolves once per turn", () => {
    const allTurns = compiled.effects.find((effect) => effect.trigger === "AllTurns");
    expect(allTurns).toMatchObject({ frequency: "OncePerTurn" });
    expect(allTurns?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenAnyDigivolves",
      sourceFilter: { controllerDefault: "opponent", kind: ["Digimon"], byEffect: true },
      actions: [
        {
          kind: "DeDigivolve",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: 1,
        },
      ],
    });
  });

  it("grants Collision and Blocker as static keywords", () => {
    expect(
      compiled.effects.filter((effect) => effect.trigger === "Static").map((effect) => effect.keywords?.[0]?.keyword),
    ).toEqual(["Collision", "Blocker"]);
  });

  it("[On Deletion] deletes opponent Digimon with play cost <= 4 when Reapermon is deleted", async () => {
    const s = setupEngine(
      {
        // Seat 0: Reapermon (the card being deleted).
        0: { battleArea: [{ card: REAPERMON, dp: 11000, as: "reapermon" }] },
        1: {
          battleArea: [
            // Agumon (cost 3 — valid deletion target).
            // Suspended on purpose: Reapermon prints ＜Collision＞, which per Comprehensive Rules
            // §16-30-1 grants every opponent Digimon ＜Blocker＞ and forces the opponent to block
            // whenever possible. An unsuspended Agumon would therefore be compelled to block and
            // the attack would never reach MetalGreymon, so Reapermon would never die and this
            // [On Deletion] clause would never be reached.
            { card: AGUMON, dp: 2000, as: "agumon", suspended: true },
            // MetalGreymon (> 11000 DP to kill Reapermon in battle); suspended so it can be attacked.
            { card: METAL_GREYMON, dp: 15000, as: "metalGreymon", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1] as PlayerState;
    const reapermon = s.perm("reapermon");
    const agumon = s.perm("agumon");
    const metalGreymon = s.perm("metalGreymon");

    // Seat 0 attacks with Reapermon (11000 DP) vs MetalGreymon (15000 DP).
    s.state.memory = 5;
    const res = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: reapermon.permanentId,
      target: { kind: "permanent", permanentId: metalGreymon.permanentId },
    });

    expect(res).toEqual({ ok: true });

    // After battle, Reapermon (11000) loses to MetalGreymon (15000) and is deleted.
    // [On Deletion] should then delete Agumon (cost 3 <= 4).
    await settle(() => !p1.battleArea.some((pp) => pp.permanentId === agumon.permanentId), 600);

    expect(p1.battleArea.some((pp) => pp.permanentId === agumon.permanentId)).toBe(false);
    // Agumon should now be in p1's trash.
    expect(p1.trash.some((c) => c.cardId === AGUMON)).toBe(true);
  });

  it("[On Deletion] does NOT delete opponent Digimon with play cost > 4", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: REAPERMON, dp: 11000, as: "reapermon" }] },
        1: {
          battleArea: [
            // MetalGreymon cost 10 — NOT eligible for deletion.
            { card: METAL_GREYMON, dp: 15000, as: "metalGreymon", suspended: true },
            // The attacking MetalGreymon.
            { card: METAL_GREYMON, dp: 15000, as: "oppAttacker", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1] as PlayerState;
    const reapermon = s.perm("reapermon");
    const metalGreymon = s.perm("metalGreymon");

    // Fire the card's deletion timing directly so this target-boundary assertion is
    // independent of Collision/blocker combat resolution.
    await advance(s.engine).fire(EffectTiming.OnDeletion, reapermon);

    // MetalGreymon (cost > 4) must not be offered to the Delete action.
    expect(p1.battleArea.some((pp) => pp.permanentId === metalGreymon.permanentId)).toBe(true);
  });
});
