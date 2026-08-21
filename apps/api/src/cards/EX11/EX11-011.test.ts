import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX11-011.js";

describe("EX11-011 Dinomon", () => {
  it("keeps one highest-play-cost Digimon per player and deletes the rest", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-008", as: "mineLow", dp: 1000 },
            { card: "EX11-011", as: "mineHigh", dp: 13000 },
          ],
          hand: [{ card: "EX11-011", as: "dinomon" }],
        },
        1: {
          battleArea: [
            { card: "EX11-008", as: "oppLow", dp: 1000 },
            { card: "EX11-010", as: "oppHigh", dp: 7000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 13;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dinomon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "EX11-008"), 600);

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX11-008")).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "EX11-008")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "EX11-011")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "EX11-010")).toBe(true);
  });

  it("has both printed keywords and the two alternate evolution requirements", () => {
    const compiled = runtimeCompiledCard("EX11-011")!;
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, names: ["Tyrannomon"], cost: 4, isAlternate: true },
      { traits: ["Dinosaur"], cost: 4, isAlternate: true, level: 5 },
    ]);
    const staticActions = compiled.effects
      .filter((effect) => effect.trigger === "Static")
      .flatMap((effect) => effect.actions);
    expect(staticActions).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: 1 } }),
      expect.objectContaining({ kind: "GainKeyword", keyword: { keyword: "Fortitude" } }),
    ]));
    expect(compiled.effects).toContainEqual(expect.objectContaining({
      isInherited: true,
      actions: [expect.objectContaining({ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: 1 } })],
    }));
  });
});
