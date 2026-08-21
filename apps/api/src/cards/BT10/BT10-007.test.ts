import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT10-007.js";

describe("BT10-007 Dondokomon", () => {
  it("digivolves for 0 from an off-color level 2 Xros Heart Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-003", as: "xrosHeartBase" }],
        hand: [{ card: "BT10-007", as: "dondokomon" }],
      },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("xrosHeartBase").permanentId,
        instanceId: s.inst("dondokomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("xrosHeartBase").topCard.cardId === "BT10-007");

    expect(s.state.memory).toBe(0);
  });

  it("rejects an off-color level 2 Digimon without the Xros Heart trait", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-003", as: "plainBlueBase" }],
        hand: [{ card: "BT10-007", as: "dondokomon" }],
      },
    });
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("plainBlueBase").permanentId,
        instanceId: s.inst("dondokomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
