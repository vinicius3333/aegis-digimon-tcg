import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-042.js";

describe("EX5-042 Merukimon", () => {
  it("has Fortitude and reveals one level five or lower Fortitude Digimon to play on play/digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toMatchObject([
      { keyword: "Fortitude" },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 1,
      rest: "hand",
      add: [
        {
          count: 1,
          to: "play",
          filter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            levelComparison: { op: "lte", value: 5 },
            keywords: ["Fortitude"],
          },
        },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 1,
      rest: "hand",
      add: [{ to: "play", filter: { levelComparison: { op: "lte", value: 5 }, keywords: ["Fortitude"] } }],
    });
  });
  it("grants Rush to all own Fortitude Digimon without digivolution cards on your turn", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions?.[0]).toMatchObject({
      kind: "GainKeyword",
      duration: "permanent",
      keyword: { keyword: "Rush" },
      target: {
        count: "all",
        filter: { controller: "mine", kind: ["Digimon"], digivolutionCards: "none", keywords: ["Fortitude"] },
      },
    });
  });

  it("plays a revealed Fortitude Digimon from the deck on public On Play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX5-042", as: "source" }],
          deck: [{ card: "EX5-039", as: "fortitude" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true, autoChooseOption: true },
    );
    s.state.memory = 12;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX5-039"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX5-039")).toBe(true);
  });

  it("returns a revealed non-Fortitude Digimon to hand instead of playing it", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX5-042", as: "source" }],
          deck: [{ card: "BT10-079", as: "ineligible" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true, autoChooseOption: true },
    );
    s.state.memory = 12;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT10-079")).toBe(false);
  });
});
