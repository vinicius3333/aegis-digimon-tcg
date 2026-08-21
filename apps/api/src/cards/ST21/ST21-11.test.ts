import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
describe("ST21-11", () => {
  it("returns an opponent level 4 or lower Digimon with Tamer-color scaling", () => {
    const effects = runtimeCompiledCard("ST21-11")?.effects ?? [];
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = effects.find((effect) => effect.trigger === trigger)?.actions[0];
      expect(action).toMatchObject({ kind: "Return", to: "deckBottom" });
      expect(action.target.filter.levelComparison).toEqual({ op: "lte", value: 4 });
      expect(action.target.filter.controller).toBe("opponent");
    }
  });
  it("keeps Blast Digivolve and optional once-per-turn trash play", () => {
    const effects = runtimeCompiledCard("ST21-11")?.effects ?? [];
    expect(effects.find((effect) => effect.trigger === "Counter")?.keywords?.[0].keyword).toBe("BlastDigivolve");
    expect(effects.find((effect) => effect.trigger === "WhenAttacking")).toMatchObject({ frequency: "OncePerTurn" });
    expect(effects.find((effect) => effect.trigger === "WhenAttacking")?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["trash"] });
  });

  it("returns a level-4 opponent to the bottom of the deck when digivolving", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST21-09", as: "base" }], hand: [{ card: "ST21-11", as: "metal" }] },
      1: { battleArea: [{ card: "ST1-05", as: "target" }, { card: "ST1-08", as: "level5" }], security: ["BT1-001"] },
    }, { autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 10;
    const level5PermanentId = s.perm("level5").permanentId;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("metal").instanceId })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "ST1-05"));
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "ST1-05")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === level5PermanentId)).toBe(true);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("ST1-05");
  });
});
