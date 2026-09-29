import { EffectTiming, type ServerEvent } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { type PermanentSpec, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST13-04.js";
import "./ST13-06.js";

describe("ST13-04 Duramon", () => {
  it("reduces a Legend-Arms digivolution cost by 1 on its turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST13-04", as: "duramon" }],
        hand: [{ card: "ST13-05", as: "durandamon" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("duramon").permanentId,
        instanceId: s.inst("durandamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("duramon").topCard.cardId === "ST13-05");
    expect(s.state.memory).toBe(1);
  });

  it("does not reduce the cost of a non-black, non-Legend-Arms card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST13-04", as: "duramon" }],
        hand: [{ card: "BT1-025", as: "wargreymon" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("duramon").permanentId,
        instanceId: s.inst("wargreymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("duramon").topCard.cardId === "BT1-025");

    expect(s.state.memory).toBe(1);
  });

  it("DNA digivolves its host with the required second material at end of turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST13-05", as: "red-material", under: ["ST13-04"] },
            { card: "ST13-14", as: "black-material" },
          ],
          hand: [{ card: "ST13-06", as: "ragna" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("red-material"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "ST13-06"));

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("ST13-06");
    expect(s.state.players[0]!.battleArea[0]!.stack.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["ST13-04", "ST13-05", "ST13-14"]),
    );
  });

  it("cannot use the inherited effect to DNA digivolve into a card without a DNA requirement", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST13-05", as: "host", under: ["ST13-04"] },
            { card: "ST13-14", as: "partner" },
          ],
          hand: [{ card: "BT1-025", as: "non-dna" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("host"));
    await settle();

    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("non-dna").instanceId)).toBe(true);
  });
});

function setupEndOfTurnDna(partner: PermanentSpec, handCards: string[]) {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "ST13-05", as: "host", under: ["ST13-04"] }, partner],
        hand: handCards.map((card) => ({ card, as: card })),
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  return s;
}

async function fireEndOfTurn(s: ReturnType<typeof setupEndOfTurnDna>) {
  await s.ready();
  await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("host"));
  await settle();
}

function battleAreaTopCards(s: ReturnType<typeof setupEndOfTurnDna>) {
  return Array.from(s.state.players[0]!.battleArea, (permanent) => permanent.topCard.cardId);
}

function isOpponentTurnStart(event: ServerEvent) {
  return event.kind === "phaseChanged" && event.turnSeat === 1;
}

function isRagnaLoardmonDna(event: ServerEvent) {
  return event.kind === "cardPlayed" && event.cardId === "ST13-06" && event.mechanic === "dna";
}

describe("ST13-04 Duramon — KB Q&A rulings", () => {
  it("DNA digivolves at the end of your own turn, before your opponent's turn begins (Q770)", async () => {
    const filler = Array.from({ length: 6 }, () => "BT1-009");
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST13-05", as: "host", under: ["ST13-04"] },
            { card: "ST13-14", as: "partner" },
          ],
          hand: [{ card: "ST13-06", as: "ragna" }],
          deck: filler,
          security: 5,
        },
        1: { deck: filler, security: 5 },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["Blitz"] },
    );
    s.state.memory = 3;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();

    const dnaIndex = s.events.findIndex(isRagnaLoardmonDna);
    const opponentTurnIndex = s.events.findIndex(isOpponentTurnStart);
    expect(dnaIndex).toBeGreaterThanOrEqual(0);
    expect(opponentTurnIndex).toBeGreaterThan(dnaIndex);
    expect(battleAreaTopCards(s)).toEqual(["ST13-06"]);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("cannot DNA digivolve into a hand Digimon that has no DNA digivolve requirement (Q771)", async () => {
    const withoutDnaCard = setupEndOfTurnDna({ card: "ST13-14", as: "partner" }, ["BT1-025"]);
    await fireEndOfTurn(withoutDnaCard);
    expect(battleAreaTopCards(withoutDnaCard).sort()).toEqual(["ST13-05", "ST13-14"]);
    expect(Array.from(withoutDnaCard.state.players[0]!.hand, (card) => card.cardId)).toEqual(["BT1-025"]);

    const withDnaCard = setupEndOfTurnDna({ card: "ST13-14", as: "partner" }, ["BT1-025", "ST13-06"]);
    await fireEndOfTurn(withDnaCard);
    expect(battleAreaTopCards(withDnaCard)).toEqual(["ST13-06"]);
    expect(Array.from(withDnaCard.state.players[0]!.hand, (card) => card.cardId)).toEqual(["BT1-025"]);
  });

  it("cannot DNA digivolve with a partner that the [DNA Digivolution] requirement does not name (Q772)", async () => {
    const twoRedMegas = setupEndOfTurnDna({ card: "BT1-025", as: "partner" }, ["ST13-06"]);
    await fireEndOfTurn(twoRedMegas);
    expect(battleAreaTopCards(twoRedMegas).sort()).toEqual(["BT1-025", "ST13-05"]);
    expect(Array.from(twoRedMegas.state.players[0]!.hand, (card) => card.cardId)).toEqual(["ST13-06"]);

    const redAndBlackMegas = setupEndOfTurnDna({ card: "ST13-14", as: "partner" }, ["ST13-06"]);
    await fireEndOfTurn(redAndBlackMegas);
    expect(battleAreaTopCards(redAndBlackMegas)).toEqual(["ST13-06"]);
  });
});
