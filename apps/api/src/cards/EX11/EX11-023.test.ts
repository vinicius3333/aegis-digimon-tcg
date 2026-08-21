import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX11-023.js";

describe("EX11-023 Kaguyamon", () => {
  it("deletes the opponent's lowest-level Digimon when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX11-022", as: "base", dp: 7000 }], hand: [{ card: "EX11-023", as: "kaguya" }] },
        1: { battleArea: [{ card: "EX11-019", as: "low", dp: 2000 }, { card: "EX11-021", as: "high", dp: 6000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("kaguya").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "EX11-019"), 600);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "EX11-019")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "EX11-021")).toBe(true);
  });

  it("encodes Alliance, Scapegoat, shared once-per-turn deletion, and any-other-deletion recursion", () => {
    const compiled = runtimeCompiledCard("EX11-023")!;
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, traits: ["Puppet"], cost: 3, isAlternate: true }]);
    expect(compiled.effects.slice(0, 2)).toEqual(expect.arrayContaining([
      expect.objectContaining({ keywords: [{ keyword: "Alliance", raw: "＜Alliance＞" }] }),
      expect.objectContaining({ keywords: [{ keyword: "Scapegoat", raw: "＜Scapegoat＞" }] }),
    ]));
    for (const trigger of ["WhenDigivolving", "EndOfOpponentsTurn"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({ frequency: "OncePerTurn", sharedUseKey: "ir-shared-0", actions: [{ kind: "Delete", target: { filter: { superlative: "lowestLevel" } } }] });
    }
    expect(compiled.effects).toContainEqual(expect.objectContaining({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "onDeletionOf", sourceFilter: expect.objectContaining({ excludeSelf: true }), actions: [expect.objectContaining({ kind: "PlayWithoutCost", from: ["trash"], payCost: false })] }],
    }));
  });
});
