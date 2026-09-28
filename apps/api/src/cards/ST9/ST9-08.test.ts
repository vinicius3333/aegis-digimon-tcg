import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import {
  setupEngine,
  settle,
  type CardSpec,
  type EngineSetup,
  type PermanentSpec,
} from "../../engine/testkit/harness.js";
import "./ST9-05.js";
import "./ST9-08.js";

describe("ST9-08 Wormmon", () => {
  it("offers inherited end-of-turn DNA digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST9-09", as: "green", under: ["ST9-08"] },
            { card: "ST9-04", as: "blue" },
          ],
          hand: [{ card: "ST9-05", as: "dna" }],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("green"));
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("dna").instanceId)).toBe(false);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    const result = s.state.players[0]!.battleArea[0]!;
    expect(result.topCard.cardId).toBe("ST9-05");
    expect(result.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["ST9-09", "ST9-08", "ST9-04"]));
    expect(result.isSuspended).toBe(false);
  });

  it("does not use a normal level 5 evolution as the DNA result", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST9-07", as: "green", under: ["ST9-08"] },
            { card: "ST9-04", as: "blue" },
          ],
          hand: [{ card: "ST9-12", as: "normalLevel5" }],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    await advance(s.engine).fireForInstance(
      EffectTiming.OnEndTurn,
      s.perm("green").stack.find((card) => card.cardId === "ST9-08")!,
    );

    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("normalLevel5").instanceId)).toBe(true);
  });
});

describe("ST9-08 Wormmon — KB Q&A rulings", () => {
  const DECK = ["BT1-009", "BT1-009", "BT1-009"];

  function wormmonBoard(partner: PermanentSpec[], hand: CardSpec[], preferred: string[] = []) {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST9-09", as: "host", under: ["ST9-08"] }, ...partner],
          hand,
          deck: DECK,
        },
        1: { deck: DECK },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 3;
    return s;
  }

  function wormmonSource(s: EngineSetup) {
    return s.perm("host").stack.find((card) => card.cardId === "ST9-08")!;
  }

  it("DNA digivolves at the end of your turn, before the opponent's turn begins (Q712)", async () => {
    const topCardsWhenTurnEnded: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST9-09", as: "host", under: ["ST9-08"] },
            { card: "ST9-04", as: "partner" },
          ],
          hand: [{ card: "ST9-05", as: "paildramon" }],
          deck: DECK,
        },
        1: { deck: DECK },
      },
      {
        autoOrderTriggers: true,
        autoSelectCards: true,
        onEvent(event) {
          if (event.kind !== "turnEnded") return;
          topCardsWhenTurnEnded.push(...s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId));
        },
      },
    );
    s.state.memory = 3;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional", 3000);

    expect(s.decisions.at(-1)?.req).toMatchObject({ seat: 0, kind: "optional", sourceCardId: "ST9-08" });
    expect(s.state.turnSeat).toBe(0);
    expect(s.events.some((event) => event.kind === "turnEnded")).toBe(false);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await turn;

    expect(s.events).toContainEqual(expect.objectContaining({ kind: "turnEnded", endingSeat: 0, nextSeat: 1 }));
    expect(topCardsWhenTurnEnded).toEqual(["ST9-05"]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    const result = s.state.players[0]!.battleArea[0]!;
    expect(result.topCard.instanceId).toBe(s.inst("paildramon").instanceId);
    expect(result.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["ST9-09", "ST9-08", "ST9-04"]));
  });

  it("cannot DNA digivolve into a hand Digimon without [DNA Digivolution] (Q713)", async () => {
    const preferred: string[] = [];
    const s = wormmonBoard(
      [{ card: "ST9-04", as: "partner" }],
      [
        { card: "ST9-12", as: "jewelBeemon" },
        { card: "ST9-05", as: "paildramon" },
      ],
      preferred,
    );
    preferred.push(s.inst("jewelBeemon").instanceId);
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.OnEndTurn, wormmonSource(s));

    const offeredIds = s.decisions.flatMap((decision) => decision.req.options?.candidateInstanceIds ?? []);
    expect(offeredIds).not.toContain(s.inst("jewelBeemon").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("jewelBeemon").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea[0]!.topCard.instanceId).toBe(s.inst("paildramon").instanceId);

    const onlyJewelBeemon = wormmonBoard([{ card: "ST9-04", as: "partner" }], [{ card: "ST9-12", as: "jewelBeemon" }]);
    await onlyJewelBeemon.ready();
    await advance(onlyJewelBeemon.engine).fireForInstance(EffectTiming.OnEndTurn, wormmonSource(onlyJewelBeemon));

    expect(onlyJewelBeemon.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      onlyJewelBeemon.inst("jewelBeemon").instanceId,
    ]);
    expect(onlyJewelBeemon.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual([
      "ST9-09",
      "ST9-04",
    ]);
  });

  it("cannot DNA digivolve with a partner the [DNA Digivolution] requirement does not specify (Q714)", async () => {
    const preferred: string[] = [];
    const s = wormmonBoard(
      [
        { card: "ST9-02", as: "wrongLevelPartner" },
        { card: "ST9-04", as: "partner" },
      ],
      [{ card: "ST9-05", as: "paildramon" }],
      preferred,
    );
    preferred.push(s.perm("wrongLevelPartner").topCard!.instanceId);
    await s.ready();
    const wrongLevelPartnerId = s.perm("wrongLevelPartner").permanentId;

    await advance(s.engine).fireForInstance(EffectTiming.OnEndTurn, wormmonSource(s));

    const battleArea = s.state.players[0]!.battleArea;
    expect(battleArea.some((permanent) => permanent.permanentId === wrongLevelPartnerId)).toBe(true);
    const result = battleArea.find((permanent) => permanent.topCard.cardId === "ST9-05")!;
    expect(result.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["ST9-09", "ST9-08", "ST9-04"]));
    expect(result.stack.map((card) => card.cardId)).not.toContain("ST9-02");

    const onlyWrongPartner = wormmonBoard(
      [{ card: "ST9-02", as: "wrongLevelPartner" }],
      [{ card: "ST9-05", as: "paildramon" }],
    );
    await onlyWrongPartner.ready();
    await advance(onlyWrongPartner.engine).fireForInstance(EffectTiming.OnEndTurn, wormmonSource(onlyWrongPartner));

    expect(onlyWrongPartner.state.players[0]!.battleArea).toHaveLength(2);
    expect(onlyWrongPartner.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      onlyWrongPartner.inst("paildramon").instanceId,
    ]);
  });
});
