import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { internalsOf } from "../../engine/testkit/internals.js";
import "./BT4-084.js";

describe("BT4-084 NeoDevimon", () => {
  it("gains 3 memory when the opponent plays a Tamer on their turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-084", as: "neo" }] }, 1: { hand: [{ card: "BT1-085", as: "tamer" }] } }, { autoSelectCards: true });
    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT1-085") && s.state.memory === 3);

    expect(s.state.memory).toBe(3);
  });

  it("its inherited effect gains 1 memory when an opposing Tamer becomes suspended", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-085", as: "host", under: ["BT4-084"] }] }, 1: { battleArea: [{ card: "BT1-085", as: "tamer" }] } });
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();
    await internalsOf(s.engine).primitives.suspend([s.perm("tamer").permanentId]);
    await settle(() => s.state.memory === -1);
    expect(s.state.memory).toBe(-1);
  });
});
