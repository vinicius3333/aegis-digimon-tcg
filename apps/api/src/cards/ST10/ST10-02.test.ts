import { EffectTiming, type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, type EngineSetup } from "../../engine/testkit/harness.js";
import "./ST10-02.js";
import "./ST10-06.js";
import "./ST10-13.js";

describe("ST10-02 Salamon", () => {
  it("may DNA digivolve its host and another Digimon at end of turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST10-05", as: "yellow", under: ["ST10-02"] },
            { card: "ST10-12", as: "purple" },
          ],
          hand: [{ card: "ST10-06", as: "mastemon" }],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(
      EffectTiming.OnEndTurn,
      s.perm("yellow").stack.find((c) => c.cardId === "ST10-02")!,
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("mastemon").instanceId)).toBe(
      true,
    );
  });

  it("does not use a normal level 6 evolution as the DNA result", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST10-05", as: "yellow", under: ["ST10-02"] },
            { card: "ST10-12", as: "purple" },
          ],
          hand: [{ card: "ST10-13", as: "normalEvolution" }],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    const materialIds = [s.perm("yellow").permanentId, s.perm("purple").permanentId];

    await advance(s.engine).fireForInstance(
      EffectTiming.OnEndTurn,
      s.perm("yellow").stack.find((card) => card.cardId === "ST10-02")!,
    );

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("normalEvolution").instanceId)).toBe(
      true,
    );
    expect(
      materialIds.every((id) => s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === id)),
    ).toBe(true);
  });
});

describe("ST10-02 Salamon — KB Q&A rulings", () => {
  const FILLER = ["ST10-07", "ST10-08", "ST10-10", "ST10-03"];

  async function endTurnWithSalamon(partnerCardId: string, handCardId: string) {
    let setup: EngineSetup | undefined;
    let turnEnded = false;
    let mergeSnapshot: { turnSeat: Seat; turnEnded: boolean } | undefined;
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST10-05", as: "yellow", under: ["ST10-02"] },
            { card: partnerCardId, as: "partner" },
          ],
          hand: [{ card: handCardId, as: "result" }],
          deck: [...FILLER],
          security: 1,
        },
        1: { deck: [...FILLER], security: 1 },
      },
      {
        autoAcceptOptional: true,
        autoOrderTriggers: true,
        autoSelectCards: true,
        onEvent: (event) => {
          if (event.kind === "turnEnded") turnEnded = true;
          if (setup === undefined || mergeSnapshot !== undefined) return;
          const resultId = setup.inst("result").instanceId;
          const merged = setup.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === resultId);
          if (merged) mergeSnapshot = { turnSeat: setup.state.turnSeat as Seat, turnEnded };
        },
      },
    );
    setup = s;
    s.state.memory = 3;
    await s.ready();
    const materialIds = [s.perm("yellow").permanentId, s.perm("partner").permanentId];
    await advance(s.engine).runTurn(0);
    const board = s.state.players[0]!.battleArea;
    const resultPermanent = board.find((p) => p.topCard?.instanceId === s.inst("result").instanceId);
    const materialsRemain = materialIds.every((id) => board.some((p) => p.permanentId === id));
    const resultInHand = s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("result").instanceId);
    return { s, mergeSnapshot, resultPermanent, materialsRemain, resultInHand };
  }

  it("DNA digivolves its host and another Digimon at the end of your turn, before the opponent's turn (Q724)", async () => {
    const { s, mergeSnapshot, resultPermanent, materialsRemain } = await endTurnWithSalamon("ST10-12", "ST10-06");
    expect(resultPermanent).toBeDefined();
    expect(resultPermanent!.topCard?.cardId).toBe("ST10-06");
    expect(resultPermanent!.stack.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["ST10-02", "ST10-05", "ST10-12"]),
    );
    expect(materialsRemain).toBe(false);
    expect(mergeSnapshot).toEqual({ turnSeat: 0, turnEnded: false });
    expect(s.events).toContainEqual(expect.objectContaining({ kind: "turnEnded", endingSeat: 0, nextSeat: 1 }));
  });

  it("cannot DNA digivolve into a hand Digimon that lacks [DNA Digivolve] (Q725)", async () => {
    const withoutDna = await endTurnWithSalamon("ST10-12", "ST10-13");
    expect(withoutDna.resultInHand).toBe(true);
    expect(withoutDna.resultPermanent).toBeUndefined();
    expect(withoutDna.materialsRemain).toBe(true);

    const withDna = await endTurnWithSalamon("ST10-12", "ST10-06");
    expect(withDna.resultPermanent).toBeDefined();
  });

  it("cannot DNA digivolve with Digimon that do not meet the [DNA Digivolution] requirements (Q726)", async () => {
    const wrongLevel = await endTurnWithSalamon("ST10-09", "ST10-06");
    expect(wrongLevel.resultInHand).toBe(true);
    expect(wrongLevel.resultPermanent).toBeUndefined();
    expect(wrongLevel.materialsRemain).toBe(true);

    const matching = await endTurnWithSalamon("ST10-12", "ST10-06");
    expect(matching.resultPermanent).toBeDefined();
  });
});
