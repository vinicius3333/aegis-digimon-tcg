import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-056.js";

describe("BT6-056 Chikurimon", () => {
  it("arms De-Digivolve for the end of the Security battle", () => {
    expect(runtimeCompiledCard("BT6-056")?.effects[0]).toMatchObject({
      trigger: "Security",
      timing: "endOfBattle",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityBattleEnded",
          once: true,
          actions: [{ kind: "DeDigivolve", amount: 1 }],
        },
      ],
    });
  });

  it("De-Digivolves an opposing Digimon after its Security battle", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT6-056", as: "security" }] },
      1: {
        battleArea: [
          { card: "BT6-016", under: [{ card: "BT1-021", as: "source" }], as: "attacker", dp: 12000 },
        ],
      },
    });
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").topCard?.instanceId === s.inst("source").instanceId, 5000);

    expect(s.perm("attacker").topCard?.instanceId).toBe(s.inst("source").instanceId);
  });

  it("still activates after losing the Security battle", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT6-056", as: "security" }] },
      1: {
        battleArea: [
          { card: "BT6-047", as: "attacker", dp: 500 },
          { card: "BT6-016", under: [{ card: "BT1-021", as: "targetSource" }], as: "target", dp: 12000 },
        ],
      },
    });
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard?.instanceId === s.inst("targetSource").instanceId, 5000);

    expect(s.perm("target").topCard?.instanceId).toBe(s.inst("targetSource").instanceId);
  });
});
