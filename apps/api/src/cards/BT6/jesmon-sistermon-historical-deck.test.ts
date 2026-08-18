import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT6-016.js";
import "./BT6-082.js";
import "./BT6-084.js";

describe("BT6 Jesmon/Sistermon historical deck gauntlet", () => {
  it("shares each played Sistermon trigger across two Jesmon without stacking either once-per-turn twice", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT6-016", as: "firstJesmon" },
            { card: "BT6-016", as: "secondJesmon" },
          ],
          hand: [
            { card: "BT6-082", as: "blanc" },
            { card: "BT6-084", as: "ciel" },
          ],
          deck: [{ card: "BT1-009", as: "blancDraw" }],
        },
        1: { security: ["BT1-010", "BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    const firstJesmon = s.perm("firstJesmon");
    const secondJesmon = s.perm("secondJesmon");
    const firstBaseDp = firstJesmon.currentDP;
    const secondBaseDp = secondJesmon.currentDP;

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: firstJesmon.permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() =>
      !observe(s.engine).isAttacking() &&
      s.state.players[0]!.battleArea.some((permanent) =>
        permanent.topCard?.cardId === "BT6-082" && observe(s.engine).hasKeyword(permanent, "Blocker")
      ) &&
      s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("blancDraw").instanceId)
    );

    const blanc = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.cardId === "BT6-082",
    );
    expect(blanc).toBeDefined();
    expect(observe(s.engine).hasKeyword(blanc!, "Blocker")).toBe(true);
    expect(firstJesmon.currentDP).toBe(firstBaseDp + 3000);
    expect(secondJesmon.currentDP).toBe(secondBaseDp + 3000);
    expect(observe(s.engine).hasPierce(firstJesmon)).toBe(true);
    expect(observe(s.engine).hasPierce(secondJesmon)).toBe(true);

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: secondJesmon.permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() =>
      !observe(s.engine).isAttacking() &&
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT6-084") &&
      s.state.memory === 6 &&
      firstJesmon.currentDP === firstBaseDp + 5000 &&
      secondJesmon.currentDP === secondBaseDp + 5000
    );

    expect(firstJesmon.currentDP).toBe(firstBaseDp + 5000);
    expect(secondJesmon.currentDP).toBe(secondBaseDp + 5000);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
