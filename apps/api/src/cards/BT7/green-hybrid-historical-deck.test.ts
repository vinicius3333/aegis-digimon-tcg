import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT7-051.js";
import "./BT7-054.js";
import "./BT7-089.js";

describe("BT7 Green Hybrid historical deck gauntlet", () => {
  it("reduces Rhino, evolves while attacking across memory, then combines Piercing with security trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT7-046",
              as: "beetlemon",
              under: ["BT7-089"],
            },
          ],
          hand: [
            { card: "BT7-051", as: "rhinoKabuterimon" },
            { card: "BT7-054", as: "ancientBeetlemon" },
          ],
          deck: ["BT1-001", "BT1-002"],
        },
        1: {
          battleArea: [{ card: "BT1-016", as: "battleTarget", suspended: true, dp: 3000 }],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("beetlemon").permanentId,
        instanceId: s.inst("rhinoKabuterimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("beetlemon").topCard.instanceId === s.inst("rhinoKabuterimon").instanceId);
    expect(s.state.memory).toBe(0);
    expect(observe(s.engine).hasPierce(s.perm("beetlemon"))).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("beetlemon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("battleTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("beetlemon").topCard.instanceId === s.inst("ancientBeetlemon").instanceId &&
        s.state.players[1]!.battleArea.length === 0 &&
        s.state.players[1]!.security.length === 1 &&
        !observe(s.engine).isAttacking(),
    );

    expect(s.state.memory).toBe(-3);
    expect(s.state.players[1]!.trash.some(({ cardId }) => cardId === "BT1-016")).toBe(true);
    expect(s.state.players[1]!.trash.filter(({ cardId }) => ["BT1-009", "BT1-010", "BT1-011"].includes(cardId))).toHaveLength(1);
  });
});
