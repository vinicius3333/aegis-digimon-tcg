import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-005.js";

describe("EX1-005 Tyrannomon", () => {
  it("plays only Taiga for free when digivolving if none is in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-001", as: "base" }],
          hand: [
            { card: "BT1-085", as: "notTaiga" },
            { card: "BT2-088", as: "taiga" },
            { card: "EX1-005", as: "evo" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    const taigaId = s.inst("taiga").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === taigaId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("notTaiga").instanceId)).toBe(true);
  });

  it("does not play a second Taiga when one is already in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX1-001", as: "base" },
            { card: "BT2-088", as: "fieldTaiga" },
          ],
          hand: [
            { card: "BT2-088", as: "handTaiga" },
            { card: "EX1-005", as: "evo" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 40);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("handTaiga").instanceId)).toBe(true);
  });

  it("grants inherited +2000 DP only to a Tyrannomon-named host on your turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX1-005", as: "host", under: ["EX1-005"], dp: 4000 }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(6000);
  });
});
