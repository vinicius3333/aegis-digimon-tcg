import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX2-045.js";
import "../EX4/EX4-023.js";
import "../EX4/EX4-052.js";

const INERT_DECK = ["BT1-009", "BT1-013", "BT1-014", "BT1-009", "BT1-013", "BT1-014"];
const TURN_DECK = [...INERT_DECK, ...INERT_DECK, ...INERT_DECK];
const INERT_SECURITY = ["BT1-009", "BT1-013", "BT1-014"];

describe("EX2-045 Calumon", () => {
  it("matches the catalog and compiles every printed clause", () => {
    expect(getCardDefinition("EX2-045")).toMatchObject({
      cardId: "EX2-045",
      nameEn: "Calumon",
      colors: ["White"],
      kinds: ["Digimon"],
      playCost: 3,
      dp: 1000,
      evoCosts: [],
      forms: ["Unknown"],
      attributes: ["Unknown"],
      types: ["Unknown"],
      effectText:
        "When you would play this card from your hand, reduce its play cost by 2 if you have [Guilmon], [Terriermon], [Renamon], or [Impmon] in play.[Your Turn] This Digimon can't attack.[Your Turn] When one of your Digimon digivolves, you may suspend this Digimon to gain 1 memory, ＜Draw 1＞ (Draw 1 card from your deck), and have 1 of your Digimon get +3000 DP for the turn.",
    });
    expect(getCardDefinition("EX2-045")?.level).toBeUndefined();
    const card = runtimeCompiledCard("EX2-045");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled).toEqual(card);
    expect(card?.effects).toMatchObject([
      {
        trigger: "Static",
        actions: [
          {
            kind: "Replacement",
            event: "wouldBePlayed",
            condition: {
              kind: "youHave",
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Guilmon", "Terriermon", "Renamon", "Impmon"],
                    match: "nameExact",
                  },
                ],
              },
            },
            actions: [{ kind: "Replacement", mode: "reduceCost", amount: 2 }],
          },
        ],
      },
      {
        trigger: "YourTurn",
        actions: [{ kind: "Restrict", restriction: "attack", duration: "permanent" }],
      },
      {
        trigger: "YourTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenOneOfYoursDigivolves",
            optional: true,
            cost: { kind: "suspend" },
            actions: [
              { kind: "GainMemory", amount: 1 },
              { kind: "Draw", amount: 1 },
              { kind: "ModifyDP", amount: 3000 },
            ],
          },
        ],
      },
    ]);
  });

  it("reduces play cost with an exact named partner", async () => {
    const s = setupEngine(
      { 0: { battleArea: ["EX2-019"], hand: [{ card: "EX2-045", as: "calumon" }], security: INERT_SECURITY } },
      { autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("calumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.memory).toBe(9);
  });

  it("does not reduce play cost without an exact named partner", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["EX2-014"],
        hand: [{ card: "EX2-045", as: "calumon" }],
        deck: INERT_DECK,
        security: INERT_SECURITY,
      },
    });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("calumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.memory).toBe(7);
  });

  it("does not treat Guilmon (X Antibody) as the exact Guilmon name", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["BT9-009"],
        hand: [{ card: "EX2-045", as: "calumon" }],
        deck: INERT_DECK,
        security: INERT_SECURITY,
      },
    });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("calumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.memory).toBe(7);
  });

  it("may suspend after a public own Digimon evolution to gain memory, draw, and grant +3000 DP", async () => {
    const preferredTargets: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-045", as: "calumon" },
            { card: "BT1-009", as: "base" },
            { card: "BT1-013", as: "boosted" },
          ],
          hand: [{ card: "BT1-014", as: "evolution" }],
          deck: [{ card: "BT1-014", as: "drawn" }, ...INERT_DECK],
          security: INERT_SECURITY,
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoOrderTriggers: true,
        preferInstanceIds: preferredTargets,
      },
    );
    preferredTargets.push(s.perm("boosted").topCard.instanceId);
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("calumon").isSuspended &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId),
    );
    expect(s.state.memory).toBe(3);
    expect(s.perm("calumon").isSuspended).toBe(true);
    expect(s.perm("boosted").currentDP).toBe(8000);
  });

  it("does not activate from an opponent's public Digimon evolution", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-045", as: "calumon" }], deck: TURN_DECK, security: INERT_SECURITY },
        1: {
          battleArea: [{ card: "BT1-009", as: "opponentBase" }],
          hand: [{ card: "BT1-014", as: "opponentEvolution" }],
          deck: TURN_DECK,
          security: INERT_SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 4;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(1);
      expect(
        s.engine.applyIntent(1, {
          type: "digivolve",
          permanentId: s.perm("opponentBase").permanentId,
          instanceId: s.inst("opponentEvolution").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("opponentBase").topCard.cardId === "BT1-014");
      expect(s.perm("calumon").isSuspended).toBe(false);
      expect(s.state.memory).toBe(2);
    } finally {
      if (!s.state.gameOver) s.engine.applyIntent(1, { type: "surrender" });
      await loop;
    }
  });

  it("cannot pay the optional suspend cost while already suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-045", as: "calumon", suspended: true },
            { card: "BT1-009", as: "base" },
          ],
          hand: [{ card: "BT1-014", as: "evolution" }],
          deck: [{ card: "BT1-014", as: "drawn" }, ...INERT_DECK],
          security: INERT_SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT1-014");
    expect(s.state.memory).toBe(2);
    expect(s.perm("calumon").isSuspended).toBe(true);
    expect(s.perm("base").currentDP).toBe(4000);
  });

  it("leaves the board and resources unchanged when the optional effect is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-045", as: "calumon" },
            { card: "BT1-009", as: "base" },
          ],
          hand: [{ card: "BT1-014", as: "evolution" }],
          deck: [{ card: "BT1-014", as: "drawn" }, ...INERT_DECK],
          security: INERT_SECURITY,
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional"));
    const optionalDecision = s.decisions.find(({ req }) => req.kind === "optional");
    expect(optionalDecision).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optionalDecision!.req.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("calumon").isSuspended).toBe(false);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.perm("base").currentDP).toBe(4000);
  });

  it("Q3465 does not reveal a level-less Calumon as the same level", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-023", as: "expert" }],
          hand: [{ card: "EX2-045", as: "calumon" }],
          deck: TURN_DECK,
          security: INERT_SECURITY,
        },
        1: { hand: [{ card: "EX2-045", as: "played" }], deck: TURN_DECK, security: INERT_SECURITY },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(0);
      advance(s.engine).endMainPhaseIfOpen(0);
      await advance(s.engine).waitForMainPhase(1);
      expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
        ok: true,
      });
      await settle();
      expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(INERT_SECURITY);
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("calumon").instanceId);
    } finally {
      if (!s.state.gameOver) s.engine.applyIntent(1, { type: "surrender" });
      await loop;
    }
  });

  it("Q3494 does not trash a level-less Calumon after a public deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-052", as: "expert" },
            { card: "BT1-013", as: "attacker" },
          ],
          hand: [{ card: "EX2-045", as: "ownCalumon" }],
          deck: [{ card: "BT1-009", as: "first" }, { card: "BT1-014", as: "second" }, ...INERT_DECK],
          security: INERT_SECURITY,
        },
        1: {
          battleArea: [{ card: "EX2-045", as: "opponentCalumon", suspended: true }],
          deck: TURN_DECK,
          security: INERT_SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    const deckBefore = s.state.players[0]!.deck.map((card) => card.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("opponentCalumon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "EX2-045"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX2-045"]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(deckBefore);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("cannot attack during its controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-045", as: "calumon" }], security: INERT_SECURITY },
      1: { deck: INERT_DECK, security: INERT_SECURITY },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("calumon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });
});
