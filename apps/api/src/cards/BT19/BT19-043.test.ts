import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT19-043 Lucemon (X Antibody)", () => {
  it("has the cost-3 evolution route from level-5-or-higher Lucemon", () => {
    expect(digivolutionRequirementsFor("BT19-043")).toContainEqual({
      levelMin: 5, names: ["Lucemon"], cost: 3, isAlternate: true,
    });
  });

  it("trashes both top security cards atomically to prevent its first leave", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT19-043", as: "luceX", under: ["BT7-111"] }], security: ["BT19-030", "BT19-031"] },
      1: { security: ["BT19-032", "BT19-033"] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("luceX").permanentId], "byEffect");
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT19-031"]);
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT19-033"]);
  });

  it.each([0, 1])("cannot partially pay when seat %s has no security (Q3096)", async (emptySeat) => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT19-043", as: "luceX", under: ["BT7-111"] }], security: emptySeat === 0 ? [] : ["BT19-030"] },
      1: { security: emptySeat === 1 ? [] : ["BT19-031"] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("luceX").permanentId], "byEffect");
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(emptySeat === 0 ? 0 : 1);
    expect(s.state.players[1]!.security).toHaveLength(emptySeat === 1 ? 0 : 1);
  });

  it("uses the leave prevention only once per turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT19-043", as: "luceX", under: ["BT7-111"] }], security: ["BT19-030", "BT19-031"] },
      1: { security: ["BT19-032", "BT19-033"] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("luceX").permanentId], "byEffect");
    await advance(s.engine).verb.deletePermanent([s.perm("luceX").permanentId], "byEffect");
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("opponent acceptance trashes security and suppresses the fallback", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT19-043", as: "luceX" }], deck: ["BT19-030"] },
      1: { battleArea: [{ card: "BT19-020", as: "victim" }], security: ["BT19-031"] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    await advance(s.engine).fireForPermanent(EffectTiming.OnEndTurn, s.perm("luceX"));
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it.each(["BT19-020", "BT19-081"])("on opponent refusal, recovers and deletes one opposing permanent (%s)", async (victim) => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT19-043", as: "luceX" }], deck: ["BT19-030"] },
      1: { battleArea: [{ card: victim, as: "victim" }], security: ["BT19-031"] },
    }, { autoDeclineOptional: true, autoSelectCards: true });
    await advance(s.engine).fireForPermanent(EffectTiming.OnEndTurn, s.perm("luceX"));
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT19-030"]);
  });
});
