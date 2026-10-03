import { Phase, type ServerEvent } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("Discord 1555502942403043389 arena scenario", () => {
  it("BT20 SaviorHuckmon suspends the Option-played Sistermon at end of turn and digivolves into Jesmon", async () => {
    const events: ServerEvent[] = [];
    const s = setupEngine(
      { 0: {}, 1: {} },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferInstanceIds: ["dev-saviorhuckmon-sistermon"],
        onEvent: (event) => events.push(event),
      },
    );
    layDevScenario("arena-bt20-saviorhuckmon-end-turn-sistermon", s.state, [BLUE_DECK, RED_DECK]);
    const ownTurn = s.engine.runOneTurn();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
    const human = s.state.players[0]!;
    const opponent = s.state.players[1]!;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: "dev-perm-0-saviorhuckmon-base",
        instanceId: "dev-saviorhuckmon",
      }),
    ).toEqual({ ok: true });
    await settle(() => opponent.battleArea.length === 0 && s.state.pendingDecision === undefined);
    const sistermon = human.battleArea.find(({ topCard }) => topCard.cardId === "BT23-077");
    const gymTrashed = human.trash.some(({ cardId }) => cardId === "BT23-099");

    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
    const savior = human.battleArea.find(({ permanentId }) => permanentId === "dev-perm-0-saviorhuckmon-base")!;
    expect(savior.topCard.cardId).toBe("BT13-017");
    expect(sistermon).toBeDefined();
    expect(gymTrashed).toBe(true);
    // The client shows the Gym leaving the field from this identity, not from a state diff.
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: "cardsMoved",
        to: "trash",
        trashedPermanents: [
          {
            permanentId: "dev-perm-0-saviorhuckmon-gym",
            instanceId: "dev-field-0-saviorhuckmon-gym",
            cardId: "BT23-099",
            seat: 0,
          },
        ],
      }),
    );
    expect(sistermon?.isSuspended).toBe(true);
  });
});
