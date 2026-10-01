import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-015.js";
import "./BT8-020.js";

describe("BT8-020 Patamon", () => {
  it("may DNA digivolve its host and another Digimon at the end of your turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-010", as: "red", under: ["BT8-020"] },
            { card: "BT8-036", as: "yellow" },
          ],
          hand: [{ card: "BT8-015", as: "silphymon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(
      EffectTiming.OnEndTurn,
      s.perm("red").stack.find((card) => card.cardId === "BT8-020")!,
    );
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("silphymon").instanceId,
      ),
    ).toBe(true);
  });

  it("does not consume the two materials for a normal level 5 evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-010", as: "red", under: ["BT8-020"] },
            { card: "BT8-036", as: "yellow" },
          ],
          hand: [{ card: "BT8-016", as: "normalEvolution" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const materialIds = [s.perm("red").permanentId, s.perm("yellow").permanentId];

    await advance(s.engine).fireForInstance(
      EffectTiming.OnEndTurn,
      s.perm("red").stack.find((card) => card.cardId === "BT8-020")!,
    );

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("normalEvolution").instanceId)).toBe(
      true,
    );
    expect(
      materialIds.every((id) => s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === id)),
    ).toBe(true);
  });

  it("does not DNA digivolve with materials outside the printed requirement", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-010", as: "red", under: ["BT8-020"] },
            { card: "BT8-052", as: "black" },
          ],
          hand: [{ card: "BT8-015", as: "silphymon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const materialIds = [s.perm("red").permanentId, s.perm("black").permanentId];

    await advance(s.engine).fireForInstance(
      EffectTiming.OnEndTurn,
      s.perm("red").stack.find((card) => card.cardId === "BT8-020")!,
    );

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("silphymon").instanceId)).toBe(true);
    expect(
      materialIds.every((id) => s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === id)),
    ).toBe(true);
  });

  it("allows the player to decline the legal end-of-turn DNA digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-010", as: "red", under: ["BT8-020"] },
            { card: "BT8-036", as: "yellow" },
          ],
          hand: [{ card: "BT8-015", as: "silphymon" }],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    const materialIds = [s.perm("red").permanentId, s.perm("yellow").permanentId];

    const firing = advance(s.engine).fireForInstance(
      EffectTiming.OnEndTurn,
      s.perm("red").stack.find((card) => card.cardId === "BT8-020")!,
    );
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await firing;

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("silphymon").instanceId)).toBe(true);
    expect(
      materialIds.every((id) => s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === id)),
    ).toBe(true);
  });
});

describe("BT8-020 Patamon — KB Q&A rulings", () => {
  const FILLER = ["BT1-009", "BT1-013", "BT1-009", "BT1-013", "BT1-009", "BT1-013"];

  const setupPatamonHost = (partnerCardId: string, handCardId: string) =>
    setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-010", as: "red", under: ["BT8-020"] },
            { card: partnerCardId, as: "partner" },
          ],
          hand: [{ card: handCardId, as: "candidate" }],
          deck: [...FILLER],
          security: [...FILLER],
        },
        1: { deck: [...FILLER], security: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

  const firePatamonEndOfTurn = (s: ReturnType<typeof setupPatamonHost>) =>
    advance(s.engine).fireForInstance(
      EffectTiming.OnEndTurn,
      s.perm("red").stack.find((card) => card.cardId === "BT8-020")!,
    );

  const candidateIsInPlay = (s: ReturnType<typeof setupPatamonHost>) =>
    s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("candidate").instanceId);

  it("DNA digivolves the host and another Digimon at the end of your turn, before the opponent's turn starts (Q1708)", async () => {
    const s = setupPatamonHost("BT8-036", "BT8-015");
    const materialIds = [s.perm("red").permanentId, s.perm("partner").permanentId];
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();

    let turnSeatWhenDnaResolved: number | undefined;
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => {
      if (!candidateIsInPlay(s)) return false;
      turnSeatWhenDnaResolved = s.state.turnSeat;
      return true;
    });

    expect(turnSeatWhenDnaResolved).toBe(0);
    const silphymon = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === s.inst("candidate").instanceId,
    )!;
    expect(silphymon.stack.map((card) => card.cardId).sort()).toEqual(["BT8-010", "BT8-020", "BT8-036"]);
    expect(
      materialIds.some((id) => s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === id)),
    ).toBe(false);

    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("cannot DNA digivolve into a hand Digimon that has no [DNA Digivolution] requirement (Q1709)", async () => {
    const control = setupPatamonHost("BT8-036", "BT8-015");
    await firePatamonEndOfTurn(control);
    expect(candidateIsInPlay(control)).toBe(true);

    const s = setupPatamonHost("BT8-036", "BT8-016");
    const materialIds = [s.perm("red").permanentId, s.perm("partner").permanentId];
    await firePatamonEndOfTurn(s);

    expect(candidateIsInPlay(s)).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("candidate").instanceId)).toBe(true);
    expect(
      materialIds.every((id) => s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === id)),
    ).toBe(true);
  });

  it("cannot DNA digivolve with a partner Digimon the [DNA Digivolution] requirement does not name (Q1710)", async () => {
    const control = setupPatamonHost("BT8-036", "BT8-015");
    await firePatamonEndOfTurn(control);
    expect(candidateIsInPlay(control)).toBe(true);

    const s = setupPatamonHost("BT8-052", "BT8-015");
    const materialIds = [s.perm("red").permanentId, s.perm("partner").permanentId];
    await firePatamonEndOfTurn(s);

    expect(candidateIsInPlay(s)).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("candidate").instanceId)).toBe(true);
    expect(
      materialIds.every((id) => s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === id)),
    ).toBe(true);
  });
});
