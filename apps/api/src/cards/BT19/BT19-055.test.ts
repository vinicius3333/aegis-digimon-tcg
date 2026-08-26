import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT19-055 Monitamon", () => {
  it("On Deletion must add one match and place a second match under a Tamer (Q3113)", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "BT19-055", as: "monita" }, { card: "BT19-081", as: "tamer" }],
      deck: ["BT10-058", "BT18-058", "BT19-046"],
    } }, { autoSelectCards: true });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("monita").permanentId], "byEffect");
    await settle(() => s.perm("tamer").stack.length === 1);
    expect({
      hand: s.state.players[0]!.hand.map((card) => card.cardId),
      under: s.perm("tamer").stack.map((card) => card.cardId),
      deck: s.state.players[0]!.deck.map((card) => card.cardId),
    }).toEqual({ hand: ["BT10-058"], under: ["BT18-058"], deck: ["BT19-046"] });
  });

  it("with only one applicable reveal, adds it to hand and cannot place it under a Tamer (Q3114)", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "BT19-055", as: "monita" }, { card: "BT19-081", as: "tamer" }],
      deck: ["BT10-058", "BT19-046", "BT19-044"],
    } }, { autoSelectCards: true });
    await advance(s.engine).verb.deletePermanent([s.perm("monita").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT10-058"));
    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT19-046", "BT19-044"]);
  });

  it("without a Tamer, adds the first of 2 matches and bottoms the rest", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "BT19-055", as: "monita" }], deck: ["BT10-058", "BT18-058", "BT19-046"],
    } }, { autoSelectCards: true });
    await advance(s.engine).verb.deletePermanent([s.perm("monita").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT10-058"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT18-058", "BT19-046"]);
  });

  it("inherited Reboot unsuspends the host during the opponent's public Active phase", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT19-058", as: "host", under: ["BT19-055"], suspended: true }], deck: ["BT19-030"] },
      1: { deck: ["BT19-030", "BT19-031"] },
    });
    s.state.turnSeat = 1;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("host").isSuspended).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });
});
