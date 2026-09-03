import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-041.js";

describe("EX2-041 Dobermon", () => {
  it("costs 2 less to play while Alice McCoy is in play", async () => {
    const s = setupEngine(
      { 0: { battleArea: ["EX2-064"], hand: [{ card: "EX2-041", as: "dobermon" }] } },
      { autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dobermon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX2-041"));
    expect(s.state.memory).toBe(5);
  });

  it("does not reduce its play cost without Alice McCoy", async () => {
    const s = setupEngine({
      0: { battleArea: ["EX2-014"], hand: [{ card: "EX2-041", as: "dobermon" }] },
    });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dobermon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.memory).toBe(5);
  });

  it("trashes three cards then returns a purple Tamer from trash on deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-041", as: "dobermon" }],
          deck: [
            { card: "BT1-001", as: "millOne" },
            { card: "BT1-002", as: "millTwo" },
            { card: "BT1-003", as: "millThree" },
          ],
          trash: [
            { card: "BT10-093", as: "returnee" },
            { card: "EX2-060", as: "wrongColor" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const dobermonId = s.perm("dobermon").permanentId;
    await advance(s.engine).verb.deletePermanent([dobermonId], "byEffect");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("returnee").instanceId);
    expect(s.state.players[0]!.trash).toHaveLength(5);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("wrongColor").instanceId);
  });
});
