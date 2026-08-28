import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-063.js";
import "./index.js";

describe("BT20-063 Ghostmon", () => {
  it("reveals three and adds one Ghost and one LIBERATOR card, bottoming the rest", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")).toMatchObject({
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          rest: "deckBottom",
          add: [
            { filter: { nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }] }, count: 1, to: "hand" },
            { filter: { nameOrTrait: [{ tokens: ["LIBERATOR"], match: "trait" }] }, count: 1, to: "hand" },
          ],
        },
      ],
    });
  });

  it("inherits On Deletion gain 1 memory", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "OnDeletion",
      actions: [{ kind: "GainMemory", amount: 1 }],
    });
  });

  it("publishes the printed stats and zero-cost purple evolution route", () => {
    expect(getCardDefinition("BT20-063")).toMatchObject({
      colors: ["Purple"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Purple", level: 2, memoryCost: 0 }],
    });
  });

  it("on play adds separate Ghost and LIBERATOR matches and bottoms the nonmatch", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT20-063", as: "ghostmon" }],
          deck: [
            { card: "BT20-062", as: "ghost" },
            { card: "BT20-090", as: "liberator" },
            { card: "BT20-047", as: "machine" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ghostmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand.map((card) => card.cardId).sort()).toEqual(["BT20-062", "BT20-090"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT20-047"]);
  });

  it("gains 1 memory only when Ghostmon is an inherited source of the deleted stack", async () => {
    for (const [under, expected] of [
      [true, 1],
      [false, 0],
    ] as const) {
      const s = setupEngine({
        0: {
          battleArea: [
            under ? { card: "BT20-068", under: ["BT20-063"], as: "subject" } : { card: "BT20-063", as: "subject" },
          ],
        },
      });
      s.state.memory = 0;
      await s.ready();
      await advance(s.engine).verb.deletePermanent([s.perm("subject").permanentId], "byEffect");
      expect(s.state.memory).toBe(expected);
    }
  });
});
