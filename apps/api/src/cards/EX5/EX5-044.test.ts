import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-044.js";

describe("EX5-044 Elecmon", () => {
  it("reveals five and adds a Leomon card", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 5,
      rest: "deckBottom",
      add: [
        {
          count: 1,
          to: "hand",
          filter: { controllerDefault: "mine", nameOrTrait: [{ match: "name", tokens: ["Leomon"] }] },
        },
      ],
    });
  });
  it("inherits De-Digivolve 1 on one opposing Digimon when deleted", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")).toMatchObject({
      isInherited: true,
      actions: [
        { kind: "DeDigivolve", amount: 1, target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } },
      ],
    });
  });

  it("adds a Leomon-name card from the revealed top five through public play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX5-044", as: "source" }],
          deck: ["BT1-009", "BT1-035", "BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-035"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-035")).toBe(true);
  });

  it("does not add a card when the revealed top five contain no Leomon name", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX5-044", as: "source" }], deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"] },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-035")).toBe(false);
  });
});
