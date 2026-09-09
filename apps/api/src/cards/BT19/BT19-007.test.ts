import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT19-007.js";

describe("BT19-007 Guilmon", () => {
  it("matches the catalog printed text, DP and evolution cost", () => {
    expect(getCardDefinition("BT19-007")).toMatchObject({
      cardId: "BT19-007",
      nameEn: "Guilmon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      forms: ["Rookie"],
      types: ["Reptile"],
      evoCosts: [{ color: "Red", level: 2, memoryCost: 0 }],
      effectText: "[Start of Your Main Phase] If you have [Takato Matsuki]/[Calumon], gain 1 memory.",
      inheritedEffectText:
        "[All Turns] While you have 0 or less memory, add 2000 to this Digimon's DP deletion effects' maximums.",
    });
  });

  it("compiles both printed clauses", () => {
    // "[Takato Matsuki]/[Calumon]" is a bracketed name list: exact, never substring.
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      condition: {
        kind: "youHave",
        count: 1,
        filter: {
          controller: "mine",
          zone: "battleArea",
          nameOrTrait: [{ tokens: ["Calumon", "Takato Matsuki"], match: "nameExact" }],
        },
      },
      actions: [{ kind: "GainMemory", amount: 1 }],
    });
    // "[All Turns] While you have 0 or less memory": the gauge is read from THIS card's
    // owner's side (KB Q3059), so the condition must be controller-scoped.
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          kind: "DeletionMaxDpModifier",
          amount: 2000,
          scope: "self",
          duration: "permanent",
          condition: { kind: "memoryAtMost", value: 0, controller: "mine" },
        },
      ],
    });
  });

  // ---------------------------------------------------------------------------
  // [Start of Your Main Phase] If you have [Takato Matsuki]/[Calumon], gain 1 memory.
  // ---------------------------------------------------------------------------

  it("gains 1 memory with Calumon in the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-007", as: "guilmon" },
            { card: "BT19-077", as: "calumon" },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 0;
    await s.ready();

    const turnLoop = advance(s.engine);
    const turn = s.engine.runOneTurn();
    await turnLoop.waitForMainPhase(0);

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);

    turnLoop.endMainPhaseIfOpen(0);
    await turn;
  });

  it("gains 1 memory with Takato Matsuki in the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-007", as: "guilmon" },
            { card: "BT19-080", as: "takato" },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 0;
    await s.ready();

    const turnLoop = advance(s.engine);
    const turn = s.engine.runOneTurn();
    await turnLoop.waitForMainPhase(0);

    // Takato's own [Start of Your Turn] sets 0 to 3 first; Guilmon then adds its 1.
    expect(s.state.memory).toBe(4);

    turnLoop.endMainPhaseIfOpen(0);
    await turn;
  });

  it("does not gain memory for a near-miss Tamer that is not Takato Matsuki", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-007", as: "guilmon" },
            { card: "BT19-081", as: "kiriha" },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 0;
    await s.ready();

    const turnLoop = advance(s.engine);
    const turn = s.engine.runOneTurn();
    await turnLoop.waitForMainPhase(0);

    expect(s.state.memory).toBe(0);

    turnLoop.endMainPhaseIfOpen(0);
    await turn;
  });

  it("does not count the opponent's Calumon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-007", as: "guilmon" }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT19-077", as: "theirCalumon" }] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 0;
    await s.ready();

    const turnLoop = advance(s.engine);
    const turn = s.engine.runOneTurn();
    await turnLoop.waitForMainPhase(0);

    expect(s.state.memory).toBe(0);

    turnLoop.endMainPhaseIfOpen(0);
    await turn;
  });

  // ---------------------------------------------------------------------------
  // Inherited [All Turns] +2000 to this Digimon's DP-deletion maximums.
  // KB Q3059 (memory gauge), Q3060 (printed numeric maximum), Q3061 (DP-relative negative).
  // ---------------------------------------------------------------------------

  // The deletion effect under test is BT19-015 Gallantmon's own [When Digivolving]
  // "Delete 1 of your opponent's Digimon with 8000 DP or less" — a real printed numeric
  // maximum reached through the public digivolve intent, with Guilmon sitting in the
  // digivolution cards beneath it. 8000 + 2000 = 10000 covers a 9000 DP target.
  it.each([
    [0, true],
    [1, false],
  ])("applies the +2000 maximum only while its owner has 0 or less memory (memory %i)", async (memory, deletes) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-012", as: "base", under: ["BT19-007"] }],
          hand: [{ card: "BT19-015", as: "host" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 9000 }] },
      },
      { autoSelectCards: true },
    );
    // The Gallantmon route costs 4, so the gauge lands on exactly `memory` when the
    // [When Digivolving] effect resolves: the 0 edge and the 1 edge of Q3059.
    s.state.memory = memory + 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    if (deletes) await settle(() => s.state.players[1]!.battleArea.length === 0, 20);
    else await drainMicrotasks(20);

    // Gallantmon's own [Your Turn] [Once Per Turn] "when an opponent's Digimon is deleted,
    // gain 2 memory" fires only on the branch where the raised maximum actually deleted.
    expect(s.state.memory).toBe(deletes ? memory + 2 : memory);
    expect(s.perm("base").topCard?.cardId).toBe("BT19-015");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT19-007", "BT19-012"]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(
      deletes ? [] : ["BT1-009"],
    );
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("leaves the printed 8000 maximum alone without Guilmon in the digivolution cards", async () => {
    // Same board, same route, but an inert Lv3 under the stack instead of Guilmon:
    // the 9000 DP target survives, so the deletion above is Guilmon's doing.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-012", as: "base", under: ["BT1-009"] }],
          hand: [{ card: "BT19-015", as: "host" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 9000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await drainMicrotasks(20);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT1-009"]);
  });

  it("still raises the printed maximum for a target the bonus alone brings into range", async () => {
    // 8000 printed, 8000 + 2000 = 10000: a 10000 DP target is deleted, an 11000 one is not.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-012", as: "base", under: ["BT19-007"] }],
          hand: [{ card: "BT19-015", as: "host" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "inRange", dp: 10_000 },
            { card: "BT1-010", as: "outOfRange", dp: 11_000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1, 20);

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT1-010"]);
  });

  it("does not add to a DP maximum that references the source Digimon's DP (Q3061)", async () => {
    // BT19-014 Shoutmon EX6's [When Attacking] "delete 1 of your opponent's Digimon with as
    // much or less DP as this Digimon" shows no printed number, so the +2000 cannot apply:
    // its own 12000 DP must not become 14000 against a 13000 DP target.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-014", as: "host", under: ["BT19-007"] }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 13_000 }], security: [{ card: "BT1-009" }] },
      },
      { autoSelectCards: true },
    );
    // Keep memory on the active player's side: negative memory is already the
    // opponent's Blitz window, so the attack intent is rejected before combat.
    s.state.memory = 0;
    s.state.turnSeat = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 20);

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT1-009"]);
    expect(s.perm("host").currentDP).toBe(12_000);
  });
});
