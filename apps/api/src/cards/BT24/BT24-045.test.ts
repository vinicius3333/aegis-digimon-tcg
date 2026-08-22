import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_045 } from "./BT24-045.js";
import "../index.js";

function primitivesOf(setup: EngineSetup): Primitives {
  return (setup.engine as unknown as { primitives: Primitives }).primitives;
}

describe("BT24-045 Ogremon", () => {
  it("requires the hand-trash cost and locks the suspended target until opponent turn end", () => {
    for (const trigger of ["OnPlay", "WhenAttacking"]) {
      const effect = BT24_045.effects?.find((entry) => entry.trigger === trigger);
      const suspend = effect?.actions?.[0] as any;
      const restrict = effect?.actions?.[1] as any;
      expect(suspend.optional).toBeUndefined();
      expect(suspend.abortOnDecline).toBeUndefined();
      expect(restrict).toMatchObject({
        kind: "Restrict",
        restriction: "unsuspend",
        duration: "untilOpponentTurnEnd",
        target: { sameTarget: true },
      });
    }
  });

  it("trashes a hand card to suspend and lock the same opponent Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-045", as: "ogremon" }],
          hand: [{ card: "BT1-001", as: "cost" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("ogremon"));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(true);
  });

  it("Q5635: only the first of two trashed copies draws after the hand rises above five", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT24-045", as: "first" },
          { card: "BT24-045", as: "second" },
          "BT1-001",
          "BT1-002",
          "BT1-003",
          "BT1-004",
          "BT1-005",
        ],
        deck: ["BT1-006", "BT1-007"],
      },
    });
    await s.ready();

    await primitivesOf(s).trash([s.inst("first").instanceId, s.inst("second").instanceId], { byEffectSeat: 0 });

    expect(s.state.players[0]!.hand).toHaveLength(6);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("inherited effect only evolves its own Demon or Titan host from the trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-072", as: "host", under: ["BT24-045"] },
            { card: "BT24-072", as: "other" },
          ],
          hand: [{ card: "BT1-001", as: "cost" }],
          trash: [{ card: "P-209", as: "titamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    await primitivesOf(s).trash([s.inst("cost").instanceId], { byEffectSeat: 0 });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("titamon").instanceId);

    expect(s.perm("other").topCard.cardId).toBe("BT24-072");
    expect(s.state.memory).toBe(3);
  });
});
