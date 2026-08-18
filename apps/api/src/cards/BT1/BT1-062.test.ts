import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-062.js";
describe("BT1-062 SlashAngemon", () => {
  it("deletes an opposing Digimon reduced to 0 DP when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-059", as: "base" }],
          hand: [{ card: "BT1-062", as: "evolving" }],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-064", as: "target", dp: 8000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand[0]!.instanceId).toBe(s.inst("drawn").instanceId);
  });

  it("reduces a surviving target for the turn and restores it at turn end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-059", as: "base" }],
          hand: [{ card: "BT1-062", as: "evolving" }],
          deck: ["BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-024", as: "target", dp: 10000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 2000);

    await advance(s.engine).runTurn(0);
    expect(s.perm("target").currentDP).toBe(10000);
  });

  it("resolves cleanly when the opponent controls no Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-059", as: "base" }],
        hand: [{ card: "BT1-062", as: "evolving" }],
        deck: ["BT1-010"],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT1-062");

    expect(s.state.memory).toBe(0);
  });
});
