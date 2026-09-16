import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

const FILLER = ["BT1-009", "BT1-013", "BT1-009", "BT1-013", "BT1-009", "BT1-013"];
const SECURITY = ["BT1-009", "BT1-013", "BT1-009"];

const handIds = (s: EngineSetup, seat: 0 | 1 = 0): string[] =>
  s.state.players[seat]!.hand.map((card) => card.cardId).sort();

const deckIds = (s: EngineSetup, seat: 0 | 1 = 0): string[] => s.state.players[seat]!.deck.map((card) => card.cardId);

describe("BT19-083 Rika Nonaka — catalog", () => {
  it("matches the printed catalog record", () => {
    expect(getCardDefinition("BT19-083")).toMatchObject({
      cardId: "BT19-083",
      nameEn: "Rika Nonaka",
      colors: ["Yellow"],
      kinds: ["Tamer"],
      playCost: 3,
      dp: 0,
      evoCosts: [],
      maxCountInDeck: 4,
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    const printed = getCardDefinition("BT19-083")!.effectText!;
    expect(printed).toContain("\u00a0");
    expect(printed.replace(/\u00a0/g, " ")).toBe(
      "[On Play] Reveal the top 3 cards of your deck. Add 1 Digimon card with [Renamon]/[Kyubimon]/[Taomon]/[Sakuyamon] in its name and 1 Option card with [Plug-In] in its name among them to the hand. Return the rest to the bottom of the deck.\n[Your Turn] When you use an Option card with a cost of 2 or more, by suspending this Tamer, gain 1 memory.",
    );
  });

  it("compiles the three printed clauses to the intended IR shape", () => {
    const card = runtimeCompiledCard("BT19-083");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "OnPlay",
        actions: [
          {
            kind: "RevealAdd",
            revealCount: 3,
            add: [
              {
                filter: {
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Renamon", "Kyubimon", "Taomon", "Sakuyamon"], match: "name" }],
                },
                count: 1,
                to: "hand",
              },
              {
                filter: { kind: ["Option"], nameOrTrait: [{ tokens: ["Plug-In"], match: "name" }] },
                count: 1,
                to: "hand",
              },
            ],
            rest: "deckBottom",
          },
        ],
      },
      {
        trigger: "YourTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenOptionUsed",
            fireCondition: { kind: "triggerOptionCostAtLeast", value: 2 },
            actions: [
              {
                kind: "GainMemory",
                amount: 1,
                cost: { kind: "suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
                optional: true,
              },
            ],
          },
        ],
      },
      {
        trigger: "Security",
        isSecurity: true,
        actions: [{ kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, isSelf: true }, payCost: false }],
      },
    ]);
  });
});

describe("BT19-083 Rika Nonaka — [On Play] reveal 3, add 1 Digimon + 1 Option", () => {
  it("pays 3 from a real play and adds both name hits, returning only the rest to the deck bottom", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-083", as: "rika" }],
          deck: [
            { card: "BT19-030", as: "renamon" },
            { card: "P-095", as: "plugIn" },
            { card: "BT1-064", as: "nameMiss" },
            { card: "BT1-013", as: "bottomMarker" },
          ],
          security: [...SECURITY],
        },
        1: { deck: [...FILLER], security: [...SECURITY] },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rika").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 2);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT19-083"]);
    expect(handIds(s)).toEqual(["BT19-030", "P-095"]);
    expect(deckIds(s)).toEqual(["BT1-013", "BT1-064"]);
    expect(s.state.players[0]!.deck.at(-1)!.instanceId).toBe(s.inst("nameMiss").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("adds nothing when the 3 revealed cards are all near-misses (Q3145)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-083", as: "rika" }],
          deck: [
            { card: "BT1-064", as: "nameMiss" },
            { card: "BT1-065", as: "nameMiss2" },
            { card: "ST3-13", as: "optionMiss" },
            { card: "BT1-013", as: "bottomMarker" },
          ],
          security: [...SECURITY],
        },
        1: { deck: [...FILLER], security: [...SECURITY] },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rika").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 4);

    expect(handIds(s)).toEqual([]);
    expect(deckIds(s)).toEqual(["BT1-013", "BT1-064", "BT1-065", "ST3-13"]);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("adds only the Digimon hit when no [Plug-In] Option was revealed (Q3145)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-083", as: "rika" }],
          deck: [
            { card: "BT19-030", as: "renamon" },
            { card: "ST3-13", as: "optionMiss" },
            { card: "BT1-064", as: "nameMiss" },
            { card: "BT1-013", as: "bottomMarker" },
          ],
          security: [...SECURITY],
        },
        1: { deck: [...FILLER], security: [...SECURITY] },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rika").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 3);

    expect(handIds(s)).toEqual(["BT19-030"]);
    expect(deckIds(s)).toEqual(["BT1-013", "ST3-13", "BT1-064"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});

describe("BT19-083 Rika Nonaka — [Your Turn] when you use a cost-2+ Option", () => {
  it("suspends this Tamer for 1 memory on a real cost-2 Option play, and stays silent on a cost-1 one", async () => {
    for (const [option, expectedGain] of [
      ["BT1-102", 1],
      ["ST3-13", 0],
    ] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT19-083", as: "rika" },
              { card: "BT1-064", as: "friend" },
            ],
            hand: [
              { card: option, as: "option" },
              { card: "BT1-009", as: "spare" },
            ],
            deck: [...FILLER],
            security: [...SECURITY],
          },
          1: { deck: [...FILLER], security: [...SECURITY] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 5;
      const loop = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(0);
      await s.ready();

      const optionCost = getCardDefinition(option)!.playCost;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === option));

      expect(s.state.memory).toBe(5 - optionCost + expectedGain);
      expect(s.perm("rika").isSuspended).toBe(expectedGain === 1);
      expect(s.state.pendingDecision).toBeUndefined();

      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    }
  });

  it("declining the optional suspend cost gains nothing and leaves the Tamer unsuspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-083", as: "rika" }],
          hand: [
            { card: "BT1-102", as: "option" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { deck: [...FILLER], security: [...SECURITY] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-102"));

    expect(s.state.memory).toBe(3);
    expect(s.perm("rika").isSuspended).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("cannot pay the suspend cost twice in one turn, and pays again after a real unsuspend phase", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-083", as: "rika" }],
          hand: [
            { card: "BT1-102", as: "first" },
            { card: "BT1-102", as: "second" },
            { card: "BT1-102", as: "third" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          hand: [{ card: "BT1-009", as: "opponentSpare" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("rika").isSuspended);
    const afterFirst = s.state.memory;
    expect(s.perm("rika").isSuspended).toBe(true);
    expect(afterFirst).toBe(5);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-102").length === 2);
    expect(s.state.memory).toBe(afterFirst - 2);
    expect(s.perm("rika").isSuspended).toBe(true);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(s.perm("rika").isSuspended).toBe(true);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(s.perm("rika").isSuspended).toBe(false);
    const beforeThird = s.state.memory;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("third").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("rika").isSuspended);
    expect(s.state.memory).toBe(beforeThird - 2 + 1);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("stays silent while the OPPONENT uses a cost-2 Option on their own turn ([Your Turn])", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-083", as: "rika" }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [{ card: "BT1-059", as: "opponentYellow" }],
          hand: [
            { card: "BT1-102", as: "opponentOption" },
            { card: "BT1-009", as: "opponentSpare" },
          ],
          deck: [...FILLER],
          security: [...SECURITY],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    const beforeOpponentOption = s.state.memory;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT1-102"));

    expect(s.state.memory).toBe(beforeOpponentOption - 2);
    expect(s.perm("rika").isSuspended).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("reads the Option's own USE cost, not its printed cost (Q5476/Q5477)", async () => {
    for (const [securityCount, expectedGain] of [
      [1, 0],
      [3, 1],
    ] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT19-083", as: "rika" }],
            hand: [
              { card: "BT7-100", as: "qualialise" },
              { card: "BT1-009", as: "spare" },
            ],
            deck: [...FILLER],
            security: Array.from({ length: securityCount }, () => "BT1-009"),
          },
          1: {
            battleArea: [{ card: "BT1-064", as: "victim", dp: 10_000 }],
            deck: [...FILLER],
            security: [...SECURITY],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 6;
      const loop = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(0);
      await s.ready();

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("qualialise").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.perm("victim").currentDP === 7000);

      expect(s.perm("victim").currentDP).toBe(7000);
      expect(s.state.memory).toBe(6 - securityCount + expectedGain);
      expect(s.perm("rika").isSuspended).toBe(expectedGain === 1);

      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    }
  });

  it("triggers on an Option used WITHOUT paying its cost (Q5478)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-083", as: "rika" }],
          hand: [
            { card: "BT19-037", as: "taomon" },
            { card: "BT1-102", as: "freeOption" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { deck: [...FILLER], security: [...SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("taomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("rika").isSuspended);

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT1-102");
    expect(s.state.memory).toBe(8 - 5 + 1);
    expect(s.perm("rika").isSuspended).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("stays silent when a cost-2 Option's effect activates from a security check rather than a use (Q5475)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-083", as: "rika" }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: [...FILLER],
          security: [{ card: "EX2-068", as: "plugIn" }, "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker", dp: 3000 }],
          hand: [{ card: "BT1-009", as: "opponentSpare" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    const handBefore = s.state.players[0]!.hand.length;
    const memoryBefore = s.state.memory;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "securityChecked"));

    expect(s.state.players[0]!.hand.length).toBe(handBefore + 2);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX2-068");
    expect(s.perm("rika").isSuspended).toBe(false);
    expect(s.state.memory).toBe(memoryBefore);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

describe("BT19-083 Rika Nonaka — [Security] play without paying the cost", () => {
  it("plays itself for free out of a real security check and resolves its own [On Play]", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "attacker", dp: 3000 }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          security: [{ card: "BT19-083", as: "rika" }, "BT1-009"],
          deck: [
            { card: "BT19-030", as: "renamon" },
            { card: "P-095", as: "plugIn" },
            { card: "BT1-064", as: "nameMiss" },
            { card: "BT1-013", as: "bottomMarker" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT19-083"));

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toEqual([
      s.inst("rika").instanceId,
    ]);
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.memory).toBe(memoryBefore);
    expect(handIds(s, 1)).toEqual(["BT19-030", "P-095"]);
    expect(deckIds(s, 1)).toEqual(["BT1-013", "BT1-064"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
