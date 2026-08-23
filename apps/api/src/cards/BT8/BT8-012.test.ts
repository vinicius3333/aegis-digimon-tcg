import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-012.js";

describe("BT8-012 Flamedramon", () => {
  it("gets +3000 DP for the turn when attacking", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-012", as: "flamedramon" }] },
      1: { security: ["BT8-034"] },
    });
    const before = s.perm("flamedramon").currentDP;
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("flamedramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("flamedramon").currentDP > before);
    expect(s.perm("flamedramon").currentDP).toBe(before + 3000);
  });

  it("keeps the attack DP grant after Armor Purge promotes its red level-3 base", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT8-008", as: "base" }],
          hand: [{ card: "BT8-012", as: "flamedramon" }],
        },
        1: { battleArea: [{ card: "BT8-041", as: "defender", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    const baseInstanceId = s.perm("base").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("flamedramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.memory).toBe(3);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === baseInstanceId);

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT8-012")).toBe(true);
    expect(s.perm("base").currentDP).toBe(s.perm("base").baseDP + 3000);
  });
});
