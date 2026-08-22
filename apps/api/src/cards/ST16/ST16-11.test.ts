import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST16-11.js";

describe("ST16-11 WereGarurumon", () => {
  it("trashes one hand card to unsuspend itself after attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST16-11", as: "weregarurumon" }],
          hand: [{ card: "BT1-001", as: "cost" }],
        },
        1: { battleArea: [{ card: "ST16-08", as: "target", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const handCostId = s.inst("cost").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("weregarurumon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("weregarurumon").isSuspended);

    expect(s.perm("weregarurumon").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === handCostId)).toBe(true);
  });
});
