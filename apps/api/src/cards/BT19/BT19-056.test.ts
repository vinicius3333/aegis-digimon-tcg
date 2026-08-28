import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT19-056 Monodramon", () => {
  it("public On Play must add a Cyborg and exact Ryo Akiyama, then bottom the rest (Q3115/Q3116)", async () => {
    const s = setupEngine({ 0: {
      hand: [{ card: "BT19-056", as: "mono" }], deck: ["BT19-052", "BT19-086", "BT19-046"],
    } }, { autoSelectCards: true });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mono").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT19-086"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT19-052", "BT19-086"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT19-046"]);
    expect(s.state.memory).toBe(0);
  });

  it("accepts a Device Option as the second search category", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "BT19-056", as: "mono" }], deck: ["BT19-052", "BT19-093", "BT19-046"],
    } }, { autoSelectCards: true });
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("mono"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT19-052", "BT19-093"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT19-046"]);
  });

  it("adds as many categories as possible when only one category is revealed", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "BT19-056", as: "mono" }], deck: ["BT19-052", "BT19-046", "BT19-044"],
    } }, { autoSelectCards: true });
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("mono"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT19-052"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT19-046", "BT19-044"]);
  });

  it("inherited All Turns gives its host +1000 DP", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT19-060", as: "host", under: ["BT19-056"] }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(6000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(6000);
  });
});
