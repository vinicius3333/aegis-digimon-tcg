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

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").topCard?.cardId).toBe("BT19-009");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT19-007"]);
    expect(
      s.state.players[0]!.battleArea.filter(
        (permanent) => permanent.topCard?.instanceId === s.inst("takato").instanceId,
      ),
    ).toHaveLength(1);
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

    expect(s.state.memory).toBe(deletes ? memory + 2 : memory);
    expect(s.perm("base").topCard?.cardId).toBe("BT19-015");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT19-009", "BT19-012"]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(
      deletes ? [] : ["BT1-009"],
    );
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("leaves the printed 8000 maximum alone without Growlmon in the digivolution cards", async () => {
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
