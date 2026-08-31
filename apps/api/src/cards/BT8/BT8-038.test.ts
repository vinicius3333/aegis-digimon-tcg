import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-038.js";

describe("BT8-038 Magnamon", () => {
  it("unsuspends and gains +2000 DP per Armor Form in trash", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-027", as: "base", suspended: true }],
        hand: [{ card: "BT8-038", as: "evolving" }],
        trash: ["BT8-023", "BT8-048", "BT8-034"],
      },
    });
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").currentDP === 11000);
    expect(s.perm("base").isSuspended).toBe(false);
  });

  it("digivolves from Veemon for 3 and keeps its DP boost after Armor Purge", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT8-021", as: "veemon" }],
          hand: [{ card: "BT8-038", as: "magnamon" }],
          trash: ["BT8-023"],
        },
        1: { battleArea: [{ card: "BT8-041", as: "defender", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    const veemonInstanceId = s.perm("veemon").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("veemon").permanentId,
        instanceId: s.inst("magnamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.memory).toBe(3);
    expect(s.perm("veemon").currentDP).toBe(9000);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("veemon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("veemon").topCard.instanceId === veemonInstanceId);

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT8-038")).toBe(true);
    expect(s.perm("veemon").currentDP).toBe(s.perm("veemon").baseDP + 2000);
  });
});
