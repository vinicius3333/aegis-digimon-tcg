import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-099.js";

describe("BT22-099 Kuremi Detective Agency", () => {
  it("waives color requirements while a CS card is in either field area", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "Static");
    expect(effect?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      condition: {
        kind: "anyOf",
        conditions: [
          { kind: "youHave", filter: { kind: ["Digimon", "Tamer"] } },
          { kind: "youHave", filter: { zone: "breeding", kind: ["Digimon", "Tamer"] } },
        ],
      },
    });
  });

  it("reveals three, adds one CS card, bottoms the rest, then places itself", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(effect?.actions).toMatchObject([
      {
        kind: "RevealAdd",
        revealCount: 3,
        add: [{ filter: { nameOrTrait: [{ tokens: ["CS"], match: "trait" }] }, count: 1, to: "hand" }],
        rest: "deckBottom",
      },
      { kind: "PlaceInBattleAreaSelf" },
    ]);
  });

  it("keeps the Delay memory effect and Security placement", () => {
    const delay = compiled.effects.find(
      (entry) => entry.trigger === "Main" && entry.keywords?.some((k) => k.keyword === "Delay"),
    );
    expect(delay?.actions).toEqual([{ kind: "GainMemory", amount: 2 }]);
    expect(compiled.effects.find((entry) => entry.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlaceInBattleAreaSelf" }],
    });
  });

  it("reveals into observable hand/deck state and places the used Option", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT22-099", as: "agency" }],
          battleArea: ["BT22-054"],
          deck: ["BT1-001", "BT1-002", "BT22-054"],
        },
      },
      { autoSelectCards: true },
    );
    const agencyId = s.inst("agency").instanceId;
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: agencyId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === agencyId));
    expect(s.state.players[0]!.hand.some((c) => c.cardId === "BT22-054")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === agencyId)).toBe(true);
  });
});
