import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-044.js";

describe("EX1-044 Keramon", () => {
  it("counts exact matches of the live host name, excluding Keramon, near names, and opponents", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX1-046", as: "host", under: ["EX1-044"], dp: 5000 },
          { card: "BT2-059", as: "same1" },
          { card: "BT5-063", as: "same2" },
          { card: "EX1-044", as: "differentName" },
        ],
      },
      1: { battleArea: [{ card: "BT2-059", as: "opponentSameName" }] },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(7000);
  });

  it("does not grant the inherited bonus during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX1-046", as: "host", under: ["EX1-044"], dp: 5000 },
          { card: "BT2-059", as: "same1" },
          { card: "BT5-063", as: "same2" },
        ],
      },
      1: { battleArea: [{ card: "BT2-059", as: "opponentSameName" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(s.perm("host").currentDP).toBe(5000);
  });

  it("publicly evolves Keramon into Kurisarimon and expires the live-name aura on the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX1-044", as: "source" },
          { card: "BT2-059", as: "same1" },
          { card: "BT5-063", as: "same2" },
          { card: "EX1-044", as: "differentName" },
        ],
        hand: [{ card: "EX1-046", as: "evo" }],
        deck: Array.from({ length: 5 }, () => "BT1-009"),
      },
      1: {
        battleArea: [{ card: "BT2-059", as: "opponentSameName" }],
        deck: Array.from({ length: 5 }, () => "BT1-010"),
      },
    });
    s.state.memory = 10;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.cardId === "EX1-046" && s.state.pendingDecision === undefined);
    expect(s.perm("source").topCard?.cardId).toBe("EX1-046");
    expect(s.perm("source").stack.map((card) => card.cardId)).toEqual(["EX1-044"]);
    expect(s.state.memory).toBe(8);
    expect(s.perm("source").currentDP).toBe(7000);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("source").currentDP).toBe(5000);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
