import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT19-027 Ryugumon", () => {
  it("is Aquatic and has Decode without leaking either property", async () => {
    const s = setupEngine({ 0: { battleArea: [
      { card: "BT19-027", as: "ryugu" }, { card: "BT19-015", as: "peer" },
    ] } });
    await s.ready();
    expect(observe(s.engine).hasEffectiveTrait(s.perm("ryugu"), "Aquatic")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("ryugu"), "Decode")).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("peer"), "Aquatic")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("peer"), "Decode")).toBe(false);
  });

  it("When Digivolving may freely play one blue level-4-or-lower source", async () => {
    const s = setupEngine({ 0: { battleArea: [
      { card: "BT19-027", as: "ryugu", under: ["BT19-019", "BT19-025"] },
    ] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("ryugu"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-019"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-025")).toBe(false);
    expect(s.perm("ryugu").stack.map((card) => card.cardId)).toEqual(["BT19-025"]);
  });

  it("returns a chosen Digimon as cost and bottoms only an opponent up to its level once per turn", async () => {
    const s = setupEngine({
      0: { battleArea: [
        { card: "BT19-020", as: "cost" }, { card: "BT19-027", as: "ryugu" },
      ] },
      1: { battleArea: [
        { card: "BT19-023", as: "level5" }, { card: "BT19-020", as: "level4" },
      ] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnEndTurn, s.perm("ryugu"));
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT19-020"]);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT19-020"]);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT19-023")).toBe(true);
    await advance(s.engine).fireForPermanent(EffectTiming.OnEndTurn, s.perm("ryugu"));
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[1]!.deck).toHaveLength(1);
  });

  it("can return itself, Decode a blue level 5, then bottom an opposing level 6 (Q3083)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT19-027", as: "ryugu", under: ["BT19-025"] }] },
      1: { battleArea: [{ card: "BT19-028", as: "level6" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnEndTurn, s.perm("ryugu"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-025"));
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT19-027"]);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT19-028"]);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).toEqual(["BT19-025"]);
  });
});
