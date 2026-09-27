import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("BT23 Bakemon Discord arena scenario", () => {
  it("offers its By cost after Necromon plays it with no opposing level-4 target", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layDevScenario("arena-bt23-bakemon-no-target", s.state, [BLUE_DECK, RED_DECK]);
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-bakemon-necromon" })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === "dev-bakemon-revive") &&
        s.state.pendingDecision === undefined,
    );

    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === "dev-field-0-bakemon-fodder")).toBe(true);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT1-024"]);
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
