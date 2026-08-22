import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "./EX12-034.js";

describe("EX12-034 Erlangmon", () => {
  it("maps Kotenken, the lowest-level return watcher, and the SW leave replacement", () => {
    const compiled = registeredCompiledCards.get("EX12-034")!;
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, traits: ["Shambala"], cost: 3, isAlternate: true }]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [{ kind: "PlayToken", tokens: ["Kotenken"], count: 1, payCost: false, optional: true }],
      });
    }
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          actions: [
            {
              kind: "Return",
              to: "deckBottom",
              target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestLevel" }, count: 1 },
            },
          ],
        },
      ],
    });
    const replacement = compiled.effects.filter((effect) => effect.trigger === "AllTurns")[1]!;
    expect(replacement).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["hand", "digivolutionCards"],
              payCost: false,
              optional: true,
              target: {
                source: "thisDigimon",
                filter: { levelComparison: { op: "lte", value: 5 }, nameOrTrait: [{ tokens: ["SW"], match: "trait" }] },
              },
            },
          ],
        },
      ],
    });
  });

  it("returns the opponent's lowest-level Digimon after one of your Digimon is played", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-034", as: "source" }], hand: [{ card: "BT1-009", as: "played" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowest" },
            { card: "BT1-014", as: "higher" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const lowestId = s.perm("lowest").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId } as never)).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowestId));

    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("higher").permanentId),
    ).toBe(true);
    expect(s.state.players[1]!.deck.some((card) => card.cardId === "BT1-009")).toBe(true);
  });

  it("plays a level-five SW card from this Digimon's stack when another own Digimon would leave", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-034", as: "source", under: ["EX12-015"] },
            { card: "BT1-009", as: "victim" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const victimId = s.perm("victim").permanentId;

    await advance(s.engine).verb.deletePermanent([victimId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-015"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === victimId)).toBe(false);
    expect(s.perm("source").stack.some((card) => card.cardId === "EX12-015")).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-015")).toBe(true);
  });
});
