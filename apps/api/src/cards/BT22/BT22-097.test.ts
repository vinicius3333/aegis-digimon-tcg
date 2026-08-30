import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-097.js";

describe("BT22-097 Music of the Heart", () => {
  it("waives color requirements only while an Appmon is in the field", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "Static");
    expect(effect?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      condition: {
        kind: "youHave",
        filter: {
          zone: ["battleArea", "breeding"],
          kind: ["Digimon", "Tamer"],
          nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }],
        },
      },
    });
  });

  it("draws and places itself in the battle area from Main", () => {
    const main = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(main?.actions).toEqual([{ kind: "Draw", controller: "mine", amount: 1 }, { kind: "PlaceInBattleAreaSelf" }]);
  });

  it("gates the Delay link under the own-Appmon played event", () => {
    const armed = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(armed).toMatchObject({
      keywords: [{ keyword: "Delay" }],
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }],
          },
          actions: [
            {
              kind: "Link",
              from: ["hand"],
              payCost: false,
              optional: true,
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }],
                  hasLinkRequirement: true,
                },
              },
              recipient: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
            },
          ],
        },
      ],
    });
    expect(
      compiled.effects.some((entry) => entry.trigger === "Main" && entry.keywords?.some((k) => k.keyword === "Delay")),
    ).toBe(false);
  });

  it("places itself in the battle area from Security", () => {
    const security = compiled.effects.find((entry) => entry.trigger === "Security");
    expect(security).toMatchObject({ isSecurity: true, actions: [{ kind: "PlaceInBattleAreaSelf" }] });
  });

  it("draws and places the used physical Option through the public play intent", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT22-097", as: "music" }], battleArea: ["BT22-087"], deck: ["BT22-001"] },
    });
    const musicId = s.inst("music").instanceId;
    const initialHand = s.state.players[0]!.hand.length;
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: musicId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === musicId));

    expect(s.state.players[0]!.hand).toHaveLength(initialHand);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === musicId)).toBe(true);
  });
});
