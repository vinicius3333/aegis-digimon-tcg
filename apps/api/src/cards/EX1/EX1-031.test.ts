import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-031.js";

describe("EX1-031 Seraphimon", () => {
  it("recovers the deck's top card when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-029", as: "base" }],
          hand: [{ card: "EX1-031", as: "evo" }],
          deck: ["BT1-008", { card: "BT1-009", as: "recovered" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(s.inst("recovered").instanceId);
  });

  it("gives your Security Digimon +5000 DP on opponent's turn while suspended", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX1-031", as: "seraphimon", suspended: true }] } });
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).securityDp(0)).toBe(5000);
  });
});
