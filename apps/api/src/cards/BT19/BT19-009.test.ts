import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT19-009.js";

describe("BT19-009 Growlmon", () => {
  it("matches the catalog printed text, DP and evolution cost", () => {
    expect(getCardDefinition("BT19-009")).toMatchObject({
      cardId: "BT19-009",
      nameEn: "Growlmon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      forms: ["Champion"],
      types: ["Dark Dragon"],
      evoCosts: [{ color: "Red", level: 3, memoryCost: 2 }],
      effectText:
        "[When Digivolving] If you have 1 or fewer Tamers, you may play 1 [Takato Matsuki] from your hand without paying the cost.",
      inheritedEffectText:
        "[All Turns] While you have 0 or less memory, add 2000 to this Digimon's DP deletion effects' maximums.",
    });
  });

  it("compiles both printed clauses", () => {
    // "[Takato Matsuki]" is a bracketed name: exact, never substring.
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          optional: true,
          payCost: false,
          from: ["hand"],
          target: {
            count: 1,
            filter: { controller: "mine", nameOrTrait: [{ tokens: ["Takato Matsuki"], match: "nameExact" }] },
          },
          condition: { kind: "youHave", filter: { controllerDefault: "mine", kind: ["Tamer"], countMax: 1 } },
        },
      ],
    });
    // "[All Turns] While you have 0 or less memory": the gauge is read from THIS card's
    // owner's side (KB Q3064), so the condition must be controller-scoped.
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
  // [When Digivolving] If you have 1 or fewer Tamers, you may play 1 [Takato Matsuki]
  // from your hand without paying the cost.
  // ---------------------------------------------------------------------------

  it.each([0, 1])("plays Takato for free through the digivolve intent with %i Tamer(s)", async (tamerCount) => {
    const tamers = Array.from({ length: tamerCount }, () => ({ card: "BT19-081" }));
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-007", as: "base" }, ...tamers],
          hand: [
            { card: "BT19-009", as: "growlmon" },
            { card: "BT19-080", as: "takato" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { security: [{ card: "BT1-009" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("growlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT19-080"));

    // Only the digivolution cost of 2 was paid: Takato (play cost 3) came down for free.
    expect(s.state.memory).toBe(0);
    expect(s.perm("base").topCard?.cardId).toBe("BT19-009");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT19-007"]);
    expect(
      s.state.players[0]!.battleArea.filter(
        (permanent) => permanent.topCard?.instanceId === s.inst("takato").instanceId,
      ),
    ).toHaveLength(1);
    // Only the digivolve bonus draw is left in hand.
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not play Takato when it already has 2 Tamers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-007", as: "base" }, { card: "BT19-081" }, { card: "BT19-079" }],
          hand: [
            { card: "BT19-009", as: "growlmon" },
            { card: "BT19-080", as: "takato" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { security: [{ card: "BT1-009" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("growlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-009");

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT19-080", "BT1-009"]);
    expect(s.state.players[0]!.battleArea).toHaveLength(3);
    expect(s.state.memory).toBe(0);
  });

  it("does not play a near-miss Tamer that is not Takato Matsuki", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-007", as: "base" }],
          hand: [
            { card: "BT19-009", as: "growlmon" },
            { card: "BT19-079", as: "taiki" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { security: [{ card: "BT1-009" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("growlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-009");

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT19-079", "BT1-009"]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("declines the optional play when the controller says no", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-007", as: "base" }],
          hand: [
            { card: "BT19-009", as: "growlmon" },
            { card: "BT19-080", as: "takato" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { security: [{ card: "BT1-009" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("growlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-009");

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT19-080", "BT1-009"]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  // ---------------------------------------------------------------------------
  // Inherited [All Turns] +2000 to this Digimon's DP-deletion maximums.
  // KB Q3064 (memory gauge), Q3065 (printed numeric maximum), Q3066 (DP-relative negative).
  // ---------------------------------------------------------------------------

  // The deletion effect under test is BT19-015 Gallantmon's own [When Digivolving]
  // "Delete 1 of your opponent's Digimon with 8000 DP or less" — a real printed numeric
  // maximum reached through the public digivolve intent, with Growlmon sitting in the
  // digivolution cards beneath it. 8000 + 2000 = 10000 covers a 9000 DP target.
  it.each([
    [0, true],
    [1, false],
  ])("applies the +2000 maximum only while its owner has 0 or less memory (memory %i)", async (memory, deletes) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-012", as: "base", under: ["BT19-009"] }],
          hand: [{ card: "BT19-015", as: "host" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 9000 }] },
      },
      { autoSelectCards: true },
    );
    // The Gallantmon route costs 4, so the gauge lands on exactly `memory` when the
    // [When Digivolving] effect resolves: the 0 edge and the 1 edge of Q3064.
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
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT19-009", "BT19-012"]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(
      deletes ? [] : ["BT1-009"],
    );
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("leaves the printed 8000 maximum alone without Growlmon in the digivolution cards", async () => {
    // Same board, same route, but an inert Lv3 under the stack instead of Growlmon:
    // the 9000 DP target survives, so the deletion above is Growlmon's doing.
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
          battleArea: [{ card: "BT19-012", as: "base", under: ["BT19-009"] }],
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

  it("does not add to a DP maximum that references the source Digimon's DP (Q3066)", async () => {
    // BT19-014 Shoutmon EX6's [When Attacking] "delete 1 of your opponent's Digimon with as
    // much or less DP as this Digimon" shows no printed number, so the +2000 cannot apply:
    // its own 12000 DP must not become 14000 against a 13000 DP target.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-014", as: "host", under: ["BT19-009"] }],
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
