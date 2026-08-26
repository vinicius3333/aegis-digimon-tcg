import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-098.js";

describe("BT11-098 Maelstrom", () => {
  it("maps catalog facts and each printed effect to IR", () => {
    expect(getCardDefinition("BT11-098")).toMatchObject({ cardId: "BT11-098", colors: ["Blue"], kinds: ["Option"], playCost: 5 });
    expect(compiled.effects).toMatchObject([
      { trigger: "Main", actions: [{ kind: "PlayWithoutCost", from: ["digivolutionCards"] }, { kind: "Return", to: "deckBottom" }] },
      { trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] },
    ]);
  });

  it("plays a blue source, then bottom-decks an opposing level 4 with Seadramon in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-085", as: "seadramon", under: [{ card: "BT1-029", as: "source" }] }],
          hand: [{ card: "BT11-098", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-015", as: "target" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("source").instanceId) &&
        s.state.players[1]!.deck.some(({ cardId }) => cardId === "BT1-015"),
    );
    expect(s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT1-015")).toBe(false);
  });

  it("still performs the mandatory return when the optional source play is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-085", as: "seadramon", under: ["BT1-029"] }],
          hand: [{ card: "BT11-098", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-015", as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.deck.some(({ cardId }) => cardId === "BT1-015"));

    expect(s.perm("seadramon").stack).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
