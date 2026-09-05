import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "./testkit/harness.js";
import "../cards/EX8/EX8-031.js";
import "../cards/BT1/BT1-051.js";
import "../cards/BT1/BT1-084.js";
import "../cards/BT1/BT1-087.js";
import "../cards/BT2/BT2-099.js";
import "../cards/BT11/BT11-100.js";
import "../cards/BT17/BT17-035.js";
import "../cards/ST3/ST3-12.js";

describe("effect-driven Option use-cost projection", () => {
  it("excludes an intrinsic cost-1 Option used through a zero-payment effect (Q5513)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-051", as: "host", under: ["EX8-031"] },
            { card: "BT1-051", as: "base" },
            "ST3-12",
            "ST3-12",
            "ST3-12",
            "ST3-12",
            "BT1-087",
            "BT1-087",
            "BT1-087",
            "BT1-087",
          ],
          hand: [
            { card: "BT17-035", as: "evolving" },
            { card: "BT2-099", as: "option" },
          ],
          deck: [{ card: "BT1-010", as: "draw" }],
        },
        1: { battleArea: [{ card: "BT1-084", as: "target", dp: 15000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId) &&
        s.state.pendingDecision === undefined,
    );

    // BT2-099 is printed cost 9 but its in-hand reduction makes its use cost 1 with eight yellow
    // Tamers. Taomon reduces payment to zero, but its separate discount does not change use cost.
    expect(s.perm("base").topCard.cardId).toBe("BT17-035");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-051"]);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
    expect(s.state.memory).toBe(0);
    expect(s.perm("target").currentDP).toBe(3000);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("draw").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("preserves a 4-cost threshold after BT11-100's in-hand reduction (Q5513/Q5515)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-051", as: "host", under: ["EX8-031"] }, { card: "BT1-051", as: "base" }, "BT1-087"],
          hand: [
            { card: "BT17-035", as: "evolving" },
            { card: "BT11-100", as: "option" },
          ],
          deck: [{ card: "BT1-010", as: "draw" }],
        },
        1: { battleArea: [{ card: "BT1-084", as: "target", dp: 15000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId) &&
        s.state.pendingDecision === undefined,
    );

    // BT11-100's own reduction changes 5 to 4, still qualifying for EX8-031. Taomon's separate
    // payment reduction lowers the amount paid to 2 without changing the threshold cost.
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
    expect(s.state.memory).toBe(-2);
    expect(s.perm("target").currentDP).toBe(5000);
    expect(s.perm("base").topCard.cardId).toBe("BT17-035");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-051"]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("draw").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
