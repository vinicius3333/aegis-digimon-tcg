import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-071.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT26-071 Flarerizamon", () => {
  it("compiles inherited Raid and both delete triggers", () => {
    expect(digivolutionRequirementsFor("BT26-071")).toContainEqual({ level: 3, traits: ["NSo"], cost: 2, isAlternate: true });
    expect(compiled.coverage).toBe("full");
    expect(compiled.effects.map((e) => e.trigger)).toEqual(["Static", "OnPlay", "WhenDigivolving"]);
  });
  it("deletes an own Digimon as cost, then deletes an opposing level-4 Digimon", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT26-071", as: "self" }], battleArea: [{ card: "BT26-012", as: "ownCost" }] }, 1: { battleArea: [{ card: "BT26-020", as: "target" }, { card: "BT26-021", as: "high" }] } }, { autoSelectCards: true });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("self").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1 && s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("BT26-071");
    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT26-021");
  });
  it("grants inherited Raid to its evolution host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT26-072", as: "host", under: ["BT26-071"] }] },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Raid")).toBe(true);
  });
});
