import { describe, expect, it } from "vitest";
import { cite } from "./_kb.js";
import { advance } from "../testkit/advance.js";
import { observe } from "../testkit/observe.js";
import { assertNoLoudGap, setupEngine, settle } from "../testkit/harness.js";
import "../../cards/index.js";

describe("BT13-007 legal batch placement events", () => {
  it("emits public placement events for the egg and Royal Knight tops", async () => {
    cite(
      "comprehensive-0292",
      "3-1-3-4 and 4-7-5: the activating player orders multiple cards; placed cards remain face-up",
      "703276fe13872e365e719f8577a6ccf56e5e00dac5dc84cd15a5434784dee855",
    );
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "opponent" }],
          deck: [{ card: "BT1-028", as: "opponentDeck" }],
          security: [{ card: "BT1-028", as: "opponentSecurity" }],
        },
        1: {
          breeding: { card: "BT13-007", as: "drasil", under: [{ card: "BT1-001", as: "existing" }] },
          eggDeck: [{ card: "BT1-001", as: "egg", faceUp: false }],
          battleArea: [
            { card: "AD1-008", as: "knightA" },
            { card: "BT13-040", as: "knightB" },
          ],
          deck: [{ card: "BT1-028", as: "drasilDeck" }],
          security: [{ card: "BT1-028", as: "drasilSecurity" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 3;
    s.state.turnSeat = 1;
    s.state.isFirstPlayersFirstTurn = false;
    await s.ready();

    const drasil = s.perm("drasil");
    const eggId = s.inst("egg").instanceId;
    const knightAId = s.perm("knightA").topCard.instanceId;
    const knightBId = s.perm("knightB").topCard.instanceId;
    const placementEvents = await observe(s.engine).captureSubTriggers(async () => {
      await advance(s.engine).runTurn(1);
      await settle();
    });

    const additions = placementEvents.filter((entry) => entry.event === "onAddDigivolutionCards");
    expect(additions).toHaveLength(3);
    expect(additions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: "onAddDigivolutionCards",
          payload: expect.objectContaining({
            subjectPermanentId: drasil.permanentId,
            addedDigivolutionCardInstanceIds: [eggId],
            addedDigivolutionCardsPosition: "bottom",
            byEffectSeat: 1,
          }),
        }),
        expect.objectContaining({
          event: "onAddDigivolutionCards",
          payload: expect.objectContaining({
            subjectPermanentId: drasil.permanentId,
            addedDigivolutionCardInstanceIds: [knightAId],
            addedDigivolutionCardsPosition: "bottom",
            byEffectSeat: 1,
          }),
        }),
        expect.objectContaining({
          event: "onAddDigivolutionCards",
          payload: expect.objectContaining({
            subjectPermanentId: drasil.permanentId,
            addedDigivolutionCardInstanceIds: [knightBId],
            addedDigivolutionCardsPosition: "bottom",
            byEffectSeat: 1,
          }),
        }),
      ]),
    );
    expect(drasil.stack).toHaveLength(4);
    expect(drasil.stack.every((card) => card.faceUp)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);

    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });
});
