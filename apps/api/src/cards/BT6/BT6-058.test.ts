import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-058.js";

describe("BT6-058 Nanimon", () => {
  it("arms its play for the end of the Security battle", () => {
    expect(runtimeCompiledCard("BT6-058")?.effects[0]).toMatchObject({
      trigger: "Security",
      timing: "endOfBattle",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityBattleEnded",
          once: true,
          actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false }],
        },
      ],
    });
  });

  it("plays itself after its Security battle", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT6-058", as: "security" }] },
      1: { battleArea: [{ card: "BT1-057", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const instanceId = s.inst("security").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === instanceId),
      5000,
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT6-058")).toBe(true);
  });

  it("plays itself even when the attacker loses the Security battle", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT6-058", as: "security" }] },
      1: { battleArea: [{ card: "BT6-047", as: "attacker", dp: 500 }] },
    });
    s.state.turnSeat = 1;
    const instanceId = s.inst("security").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === instanceId),
      5000,
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT6-058")).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
