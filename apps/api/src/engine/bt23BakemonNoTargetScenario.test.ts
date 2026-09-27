import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("BT23 Bakemon Discord arena scenario", () => {
  it("offers both By costs after EX11 Necromon's On Play and When Digivolving play Bakemon", async () => {
    const preferInstanceIds = [
      "dev-field-0-bakemon-fodder-first",
      "dev-field-0-bakemon-fodder-second",
      "dev-bakemon-revive-first",
      "dev-bakemon-revive-second",
    ];
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds });
    layDevScenario("arena-bt23-bakemon-no-target", s.state, [BLUE_DECK, RED_DECK]);
    await s.ready();
    const baseId = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "BT2-075")!.permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-bakemon-necromon-play" })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === "BT23-064").length === 1 &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === preferInstanceIds[0])).toBe(true);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT1-024", "BT1-024"]);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: baseId,
        instanceId: "dev-bakemon-necromon-digivolve",
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === "BT23-064").length === 2 &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === preferInstanceIds[1])).toBe(true);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT1-024"]);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX11-051" && req.kind === "selectCards")).toHaveLength(
      2,
    );
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "BT23-064" && req.kind === "optional")).toHaveLength(2);
  });

  it("also offers BT17-061's other-Digimon cost without a level-4 target", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT17-061", as: "source" }], battleArea: [{ card: "BT1-009", as: "fodder" }] },
        1: { battleArea: [{ card: "BT1-024", as: "tooHigh" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT17-061") && !s.state.pendingDecision,
    );
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("fodder").instanceId)).toBe(true);
  });

  it.each(["BT2-077", "P-102"])("also pays %s's printed By cost with no opponent Digimon", async (cardId) => {
    const s = setupEngine(
      { 0: { hand: [{ card: cardId, as: "source" }], battleArea: [{ card: "BT1-009", as: "fodder" }] }, 1: {} },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    const sourceId = s.inst("source").instanceId;
    const fodderId = s.inst("fodder").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: sourceId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === sourceId) &&
        !s.state.pendingDecision,
    );
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === fodderId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
