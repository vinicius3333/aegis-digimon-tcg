import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-073.js";
import "../BT3/BT3-112.js";
import "../BT5/BT5-111.js";
import "../BT1/BT1-020.js";

describe("EX1 Machinedramon with Omnimon techs", () => {
  it("climbs through Alter-S into Omnimon X and spends two retained sources to stop an attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX1-073",
              as: "machine",
              under: ["EX1-008", "EX1-050"],
            },
          ],
          hand: [
            { card: "BT3-112", as: "alterS" },
            { card: "BT5-111", as: "omnimonX" },
          ],
          security: [{ card: "BT1-009", as: "security" }],
        },
        1: {
          battleArea: [{ card: "BT1-020", as: "attacker" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("machine").permanentId,
        instanceId: s.inst("alterS").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("machine").topCard.cardId === "BT3-112");

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("machine").permanentId,
        instanceId: s.inst("omnimonX").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("machine").topCard.cardId === "BT5-111");

    expect(s.state.memory).toBe(1);
    expect(s.perm("machine").stack).toHaveLength(4);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    const combat = s.engine as unknown as { combat: { isAttacking: boolean } };

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !combat.combat.isAttacking && s.perm("machine").stack.length === 2, 5000);

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(2);
    assertNoLoudGap(s);
  });
});
