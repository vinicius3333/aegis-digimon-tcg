import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX11-014.js";

describe("EX11-014 Penguinmon", () => {
  it("reveals three and adds Suzune plus an Ice-Snow Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX11-014", as: "penguinmon" }],
          deck: ["EX11-057", "EX11-014", "BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("penguinmon").instanceId })).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.hand.some((card) => card.cardId === "EX11-057") && s.state.players[0]!.hand.some((card) => card.cardId === "EX11-014"),
      600,
    );
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX11-057")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX11-014")).toBe(true);
  });

  it("encodes the Hiyarimon evolution and inherited Jamming", () => {
    const compiled = runtimeCompiledCard("EX11-014")!;
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Hiyarimon"], cost: 0, isAlternate: true }]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [{
        kind: "RevealAdd",
        revealCount: 3,
        rest: "deckBottom",
        add: [
          { count: 1, to: "hand", filter: { nameOrTrait: [{ tokens: ["Suzune Kazuki"], match: "name" }] } },
          { count: 1, to: "hand", filter: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Ice-Snow"], match: "trait" }] } },
        ],
      }],
    });
    expect(compiled.effects).toContainEqual(expect.objectContaining({ isInherited: true, keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }] }));
  });
});
