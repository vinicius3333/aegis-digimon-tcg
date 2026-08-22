import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("EX12-010 Greymon", () => {
  it("returns one matching Digimon from trash on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX12-010", as: "source" }],
          trash: ["EX12-005", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "EX12-005"));

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX12-005");
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });

  it("returns one matching Digimon from trash when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-005", as: "base" }],
          hand: [{ card: "EX12-010", as: "source" }],
          trash: ["EX12-008", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "EX12-008"));

    expect(s.perm("base").topCard?.cardId).toBe("EX12-010");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX12-008");
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });

  it("does not move an unrelated trash card in either timing window", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX12-010", as: "source" }],
          trash: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });

  it("keeps Raid as both a printed and inherited keyword", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX12-010", as: "host", under: ["EX12-010"] }] } });
    await s.ready();

    const continuous = (s.engine as unknown as { continuous: { hasKeyword(id: string, keyword: string): boolean } }).continuous;
    expect(continuous.hasKeyword(s.perm("host").permanentId, "Raid")).toBe(true);
  });

  it("encodes both optional recovery windows and alternate evolution requirements", () => {
    const compiled = registeredCompiledCards.get("EX12-010")!;
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 3, names: ["Agumon"], cost: 2, isAlternate: true },
      { level: 3, traits: ["ME", "VB"], cost: 2, isAlternate: true },
    ]);
    expect(compiled.effects.filter((effect) => effect.trigger === "Static")).toHaveLength(2);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Return",
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  { match: "name", tokens: ["Greymon"] },
                  { match: "trait", tokens: ["VB", "ME"] },
                ],
              },
              count: 1,
            },
            to: "hand",
            optional: true,
          },
        ],
      });
    }
  });
});
