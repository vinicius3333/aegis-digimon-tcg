import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT15-044.js";

describe("BT15-044", () => {
  it("prevents one opposing Digimon from unsuspending until the opponent's turn ends on deletion", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnDeletion",
      actions: [{ kind: "Restrict", restriction: "unsuspend", duration: "untilOpponentTurnEnd" }],
    }));

  it("naturally restricts the attacking Digimon when it deletes Mushroomon in battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT15-044", as: "mushroom", dp: 1000 }] },
      1: { battleArea: [{ card: "BT1-078", as: "attacker", dp: 5000 }] },
    });
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("mushroom").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("mushroom").permanentId));

    expect(observe(s.engine).isRestricted(s.perm("attacker"), "unsuspend")).toBe(true);
  });

  it("digivolves legally from a green level-2 Digi-Egg and preserves the source stack", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-007", as: "egg" },
        hand: [{ card: "BT15-044", as: "mushroom" }],
      },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("mushroom").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard?.cardId === "BT15-044");

    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["BT1-007"]);
  });
});
