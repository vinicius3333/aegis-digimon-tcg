import { describe, expect, it } from "vitest";
import { cite } from "./_kb.js";
import { advance } from "../testkit/advance.js";
import { observe } from "../testkit/observe.js";
import { assertNoLoudGap, setupEngine, settle } from "../testkit/harness.js";
import "../../cards/index.js";

const MOTHER_EATER = "BT22-007";

function citeMotherEater(): void {
  cite(
    "comprehensive-0292",
    "4-7-5: source cards are face-up unless specified otherwise",
    "703276fe13872e365e719f8577a6ccf56e5e00dac5dc84cd15a5434784dee855",
  );
}

describe("BT22-007 public top placement from the Digi-Egg deck", () => {
  it.each([
    { name: "accepts and reveals a Mother Eater", egg: MOTHER_EATER, accept: true, stack: 1 },
    { name: "returns a declined Mother Eater face down", egg: MOTHER_EATER, accept: false, stack: 1 },
    { name: "returns a non-Mother-Eater top card face down", egg: "BT1-001", accept: true, stack: 1 },
  ])("$name", async ({ egg, accept, stack }) => {
    citeMotherEater();
    const s = setupEngine(
      {
        0: {
          breeding: {
            card: MOTHER_EATER,
            as: "host",
            under: Array.from({ length: stack }, (_, index) => ({ card: "BT1-001", as: `oldSource${index}` })),
          },
          eggDeck: [{ card: egg, as: "egg", faceUp: false }],
          deck: [{ card: "BT1-028", as: "quietDeck" }],
          security: [{ card: "BT1-009", as: "quietSecurity" }],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "opponentQuiet" }],
          deck: [{ card: "BT1-028", as: "opponentDeck" }],
          security: [{ card: "BT1-009", as: "opponentSecurity" }],
        },
      },
      {
        autoAcceptOptional: accept,
        autoDeclineOptional: !accept,
        autoSelectCards: true,
        autoOrderTriggers: true,
      },
    );
    s.state.memory = 3;
    s.state.isFirstPlayersFirstTurn = true;
    await s.ready();
    const host = s.perm("host");
    const hostId = host.topCard.instanceId;
    const oldId = s.inst("oldSource0").instanceId;
    const eggId = s.inst("egg").instanceId;
    const events = await observe(s.engine).captureSubTriggers(async () => {
      await advance(s.engine).runTurn(0);
      await settle();
    });

    // The outer generic optional owns this choice; refusal/nonmatching cards also need one.
    expect(s.decisions.filter((entry) => entry.req.kind === "optional")).toHaveLength(1);
    expect(host.stack.map((source) => source.instanceId)).toEqual(
      egg === MOTHER_EATER && accept ? [oldId, eggId] : [oldId],
    );
    expect(host.stack.map((source) => source.faceUp)).toEqual(egg === MOTHER_EATER && accept ? [true, true] : [true]);
    const expectedAddition = {
      event: "onAddDigivolutionCards",
      payload: expect.objectContaining({
        subjectPermanentId: host.permanentId,
        addedDigivolutionCardInstanceIds: [eggId],
        addedDigivolutionCardsPosition: "top",
        byEffectSeat: 0,
      }),
    };
    expect(events.filter((entry) => entry.event === "onAddDigivolutionCards")).toEqual(
      egg === MOTHER_EATER && accept ? [expectedAddition] : [],
    );
    expect(s.state.players[0]!.eggDeck.map((source) => source.instanceId)).toEqual(
      egg === MOTHER_EATER && accept ? [] : [eggId],
    );
    expect(s.state.players[0]!.eggDeck[0]?.faceUp).toBe(egg === MOTHER_EATER && accept ? undefined : false);
    expect(s.state.players[0]!.breeding?.topCard.instanceId).toBe(hostId);
    expect(s.state.memory).toBe(-3);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("with an empty Digi-Egg deck still offers the 10-card-stack clause and plays three sources", async () => {
    citeMotherEater();
    const s = setupEngine(
      {
        0: {
          breeding: {
            card: MOTHER_EATER,
            as: "host",
            under: [
              ...Array.from({ length: 7 }, (_, index) => ({ card: "BT1-001", as: `oldSource${index}` })),
              { card: MOTHER_EATER, as: "mother1" },
              { card: MOTHER_EATER, as: "mother2" },
              { card: MOTHER_EATER, as: "mother3" },
            ],
          },
          eggDeck: [],
          deck: [{ card: "BT1-028", as: "quietDeck" }],
          security: [{ card: "BT1-009", as: "quietSecurity" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponentQuiet" }], security: [{ card: "BT1-009" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 3;
    s.state.isFirstPlayersFirstTurn = true;
    await s.ready();
    const events = await observe(s.engine).captureSubTriggers(async () => {
      await advance(s.engine).runTurn(0);
      await settle();
    });
    // Empty egg deck still reaches the play-from-stack optional; the generic placement
    // confirmation remains a separate no-op prompt until eligibility is separately audited.
    expect(s.decisions.filter((entry) => entry.req.kind === "optional")).toHaveLength(2);
    expect(s.state.players[0]!.breeding?.stack.filter((source) => source.cardId === MOTHER_EATER)).toHaveLength(0);
    expect(
      s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === MOTHER_EATER),
    ).toHaveLength(3);
    expect(events.filter((entry) => entry.event === "onAddDigivolutionCards")).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });
});
