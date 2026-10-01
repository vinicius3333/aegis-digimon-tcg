import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST14-03.js";

describe("ST14-03 Candlemon", () => {
  it("mills 2 on play", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "ST14-03", as: "candle" }], deck: ["BT1-009", "BT1-010"] } });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("candle").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.length === 2);
    expect(s.state.players[0]!.trash).toHaveLength(2);
  });
  it("draws on deletion with 10 cards in trash", async () => {
    const trash = Array.from({ length: 9 }, () => "BT1-009");
    const s = setupEngine({ 0: { battleArea: [{ card: "ST14-03", as: "candle" }], trash, deck: ["BT1-010"] } });
    await advance(s.engine).verb.deletePermanent([s.perm("candle").permanentId]);
    await settle(() => s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });
  it("does not draw on deletion when the trash remains below 10 cards", async () => {
    const trash = Array.from({ length: 8 }, () => "BT1-009");
    const s = setupEngine({ 0: { battleArea: [{ card: "ST14-03", as: "candle" }], trash, deck: ["BT1-010"] } });
    await advance(s.engine).verb.deletePermanent([s.perm("candle").permanentId]);
    await settle(() => s.state.players[0]!.trash.length === 9);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });
});

describe("ST14-03 Candlemon — KB Q&A rulings", () => {
  it("counts the deleted Candlemon itself toward the 10 cards in trash for its On Deletion draw (Q798)", async () => {
    const boardWithTrash = (count: number) =>
      setupEngine({
        0: {
          battleArea: [{ card: "ST14-03", as: "candle" }],
          trash: Array.from({ length: count }, () => "BT1-009"),
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
      });

    const s = boardWithTrash(9);
    await advance(s.engine).verb.deletePermanent([s.perm("candle").permanentId]);
    await settle(() => s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.trash).toHaveLength(10);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);

    const oneShort = boardWithTrash(8);
    await advance(oneShort.engine).verb.deletePermanent([oneShort.perm("candle").permanentId]);
    await settle(() => oneShort.state.players[0]!.trash.length === 9);
    await drainMicrotasks();
    expect(oneShort.state.players[0]!.trash).toHaveLength(9);
    expect(oneShort.state.players[0]!.hand).toHaveLength(0);
  });
});
