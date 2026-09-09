import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-014.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";

describe("EX9-014", () => {
  it("reveals 3 for a DM and Ver.2 card, placing the latter under a DM Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        { count: 1, to: "hand" },
        { count: 1, to: "placeUnder", faceDown: true },
      ],
      rest: "deckBottom",
    }));
  it("has the alternate zero-cost DM level 2 digivolution requirement", () =>
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["DM"], cost: 0, isAlternate: true }]));
  it("inherits Jamming", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Jamming",
      raw: "＜Jamming＞",
    }));

  it("reveals a DM card and places a Ver.2 card underneath a DM Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX9-014", as: "source" }], deck: ["EX9-007", "EX9-014", "BT1-012"] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX9-007")).toBe(true);
    expect(s.perm("source").stack).toContainEqual(expect.objectContaining({ cardId: "EX9-014", faceUp: false }));
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-012"]);
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q4757 adds a card before choosing a remaining Ver.2 card", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX9-014", as: "source" }], deck: ["EX9-014", "BT1-012", "BT1-013"] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.players[0]!.hand.filter((card) => card.cardId === "EX9-014")).toHaveLength(1);
    expect(s.perm("source").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-012", "BT1-013"]);
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("passes Jamming through an EX9-014 evolution stack", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX9-007", as: "host", under: ["EX9-014"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
  });
});
