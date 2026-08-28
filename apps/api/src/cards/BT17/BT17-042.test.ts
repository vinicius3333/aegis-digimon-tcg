import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-042.js";
import "./index.js";

describe("BT17-042 Argomon", () => {
  it("matches the catalog identity and evolution route", () => {
    expect(getCardDefinition("BT17-042")).toMatchObject({
      cardId: "BT17-042",
      colors: ["Green", "Purple"],
      level: 3,
      playCost: 3,
      dp: 2000,
      evoCosts: [
        { color: "Green", level: 2, memoryCost: 1 },
        { color: "Purple", level: 2, memoryCost: 1 },
      ],
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Argomon"], cost: 0, isAlternate: true },
    ]);
  });

  it("reveals three, adds one Argomon and one Rhythm, and bottoms the rest", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        {
          filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Argomon"], match: "name" }] },
          count: 1,
          to: "hand",
        },
        {
          filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Rhythm"], match: "name" }] },
          count: 1,
          to: "hand",
        },
      ],
      rest: "deckBottom",
    });
  });

  it("gains one memory on deletion as an inherited effect", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "OnDeletion",
      actions: [{ kind: "GainMemory", amount: 1 }],
    });
  });

  it("naturally adds the revealed Argomon and Rhythm and bottoms the remainder", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT17-042", as: "argomon" }],
          deck: [
            { card: "BT17-042", as: "revealedArgomon" },
            { card: "BT17-089", as: "revealedRhythm" },
            { card: "BT1-009", as: "bottomCard" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    const revealedArgomonId = s.inst("revealedArgomon").instanceId;
    const revealedRhythmId = s.inst("revealedRhythm").instanceId;
    const bottomCardId = s.inst("bottomCard").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("argomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === revealedRhythmId));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([revealedArgomonId, revealedRhythmId]),
    );
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(bottomCardId);
  });
});
