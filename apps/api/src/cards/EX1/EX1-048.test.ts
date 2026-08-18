import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-048.js";

describe("EX1-048 Andromon", () => {
  it("reveals 3, adds a level 6 Machine, and trashes the rest when digivolving", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX1-047", as: "base" }], hand: [{ card: "EX1-048", as: "evo" }], deck: ["BT11-072", "BT1-009", "BT1-010"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evo").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT11-072"));
    await settle(() => s.state.players[0]!.trash.length === 2);
    expect(s.state.players[0]!.trash).toHaveLength(2);
  });

  it("grants inherited Blocker to a Machine host on the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-042", as: "host", under: ["EX1-048"] }] } });
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
  });
});
