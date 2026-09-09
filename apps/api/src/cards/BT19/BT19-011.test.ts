import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle, settleAcrossTimers } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT19-011.js";

describe("BT19-011 WarGrowlmon", () => {
  it("matches the catalog printed text, DP, ACE overflow and evolution cost", () => {
    expect(getCardDefinition("BT19-011")).toMatchObject({
      cardId: "BT19-011",
      nameEn: "WarGrowlmon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 5,
      dp: 8000,
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Cyborg"],
      evoCosts: [{ color: "Red", level: 4, memoryCost: 3 }],
      isAce: true,
      overflowMemory: 3,
      effectText:
        "[Hand] [Counter] ＜Blast Digivolve＞ \n[On Play] [When Digivolving] Delete any of your opponent's Digimon with DP adding up to 3000. For each of your opponent's Digimon, add 2000 to this DP-Based deletion effect's maximum. Then, for each Digimon deleted by this effect, gain 1 memory.",
      inheritedEffectText: "[All Turns] Add 3000 to this Digimon's DP deletion effects' maximums.",
    });
  });

  it("compiles every printed clause", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Counter",
      isFromHand: true,
      keywords: [{ keyword: "BlastDigivolve" }],
    });
    // The aggregate deletion and its "then" memory gain are one action list, fired by both
    // printed timings. `budgetBonus` carries no zone: `countMatching`'s default scan is the
    // battle area only, which is what "for each of your opponent's Digimon" means — a
    // breeding-area Digimon must not raise the maximum.
    for (const index of [1, 2] as const) {
      expect(compiled.effects?.[index]).toMatchObject({
        trigger: index === 1 ? "OnPlay" : "WhenDigivolving",
        actions: [
          {
            kind: "DeleteByDPBudget",
            baseBudget: 3000,
            budgetBonus: { per: 2000, unit: "cards", filter: { controller: "opponent", kind: ["Digimon"] } },
            target: { count: "all", filter: { controller: "opponent", kind: ["Digimon"] } },
          },
          {
            kind: "GainMemory",
            amount: 1,
            scaling: { per: 1, unit: "cards", filter: { deletedByThisEffect: true, kind: ["Digimon"] } },
          },
        ],
      });
    }
    // Printed "[All Turns]" is the AllTurns trigger, not Static.
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [{ kind: "DeletionMaxDpModifier", amount: 3000, scope: "self", duration: "permanent" }],
    });
    expect(compiled.effects).toHaveLength(4);
  });

  // ---------------------------------------------------------------------------
  // [On Play] [When Digivolving] Delete any of your opponent's Digimon with DP adding
  // up to 3000; +2000 per opponent Digimon; then gain 1 memory per Digimon deleted.
  // ---------------------------------------------------------------------------

  it("deletes the whole opposing board within the scaled budget and gains 1 memory per deletion", async () => {
    // 3 opponent Digimon: 3000 + 3 x 2000 = 9000, and 2000 + 3000 + 4000 = 9000 exactly.
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-011", as: "warGrowlmon" }, { card: "BT1-014" }],
          battleArea: [{ card: "BT1-009", as: "ownDigimon", dp: 1000 }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "small", dp: 2000 },
            { card: "BT1-010", as: "mid", dp: 3000 },
            { card: "BT1-011", as: "big", dp: 4000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("warGrowlmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010", "BT1-011"]);
    // The controller's own 1000 DP Digimon is not a candidate: the filter is opponent-only.
    expect(s.perm("ownDigimon").topCard?.cardId).toBe("BT1-009");
    // 10 - 5 (play cost) + 3 (one per Digimon deleted by this effect) = 8.
    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-014"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([
    [5000, true],
    [6000, false],
  ])("pins the single-Digimon maximum at exactly 5000 (target %i DP)", async (dp, deletes) => {
    // One opponent Digimon: 3000 + 1 x 2000 = 5000.
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT19-011", as: "warGrowlmon" }, { card: "BT1-014" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("warGrowlmon").instanceId })).toEqual({
      ok: true,
    });
    if (deletes) await settle(() => s.state.players[1]!.battleArea.length === 0);
    else await drainMicrotasks(30);

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(
      deletes ? [] : ["BT1-009"],
    );
    // No deletion, no memory: the "then" clause scales by what this effect actually deleted.
    expect(s.state.memory).toBe(deletes ? 6 : 5);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("counts only battle-area Digimon for the +2000, not the opponent's breeding Digimon", async () => {
    // Battle area holds 1 opponent Digimon, so the maximum is 3000 + 2000 = 5000. Counting the
    // breeding Digimon too would make it 7000 and delete the 7000 DP target.
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT19-011", as: "warGrowlmon" }, { card: "BT1-014" }] },
        1: {
          battleArea: [{ card: "BT1-009", as: "target", dp: 7000 }],
          breeding: { card: "BT1-009", as: "inBreeding" },
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("warGrowlmon").instanceId })).toEqual({
      ok: true,
    });
    await drainMicrotasks(30);

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT1-009"]);
    expect(s.perm("inBreeding").topCard?.cardId).toBe("BT1-009");
    expect(s.state.memory).toBe(5);
  });

  it("resolves the same clause through a real digivolve, and refuses an illegal source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-009", as: "base" },
            { card: "BT19-008", as: "lv3" },
          ],
          hand: [{ card: "BT19-011", as: "warGrowlmon" }],
          deck: [{ card: "BT1-014", as: "evoDraw" }, "BT1-013"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 5000 }], security: [{ card: "BT1-009" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    // Lv.3 Shoutmon is not a Red Lv.4: the printed requirement rejects it.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lv3").permanentId,
        instanceId: s.inst("warGrowlmon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("warGrowlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("base").topCard?.cardId).toBe("BT19-011");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT19-009"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    // 5 - 3 (Red Lv.4 route) + 1 (one deletion) = 3, and the digivolve bonus draw arrived.
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("evoDraw").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("finishes the 'then' clause even when the source leaves mid-resolution (Q6016)", async () => {
    // BT6-064 Mamemon's [On Deletion] "delete 1 of your opponent's Digimon with a play cost of
    // 7 or less" fires from inside the deletion this effect performs and removes WarGrowlmon
    // (play cost 5) before the "then, gain 1 memory" step runs. Q6016: the effect is still
    // resolved in full. Budget = 3000 + 2 x 2000 = 7000, so only the 6000 DP Mamemon fits.
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT19-011", as: "warGrowlmon" }, { card: "BT1-014" }] },
        1: {
          battleArea: [
            { card: "BT6-064", as: "mamemon", dp: 6000 },
            { card: "BT1-009", as: "bystander", dp: 20_000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("warGrowlmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT1-009"]);
    // WarGrowlmon left the battle area during the deletion step.
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT19-011"]);
    // 10 - 5 (play cost) + 1 (the memory gain still resolved) - 3 (ACE Overflow ＜3＞) = 3.
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // [Hand] [Counter] ＜Blast Digivolve＞
  // ---------------------------------------------------------------------------

  it("blast digivolves from hand in the opponent's counter window without paying the cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-009", as: "base" }],
          hand: [{ card: "BT19-011", as: "warGrowlmon" }],
          deck: [{ card: "BT1-014", as: "evoDraw" }, "BT1-013", "BT1-012"],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker", dp: 20_000 }],
          hand: ["BT1-009"],
          security: ["BT1-011"],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 5;
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isAttacking());

    // ＜Blast Digivolve＞ is answered through the open [Counter] window, never as a bare
    // `digivolve` intent — the printed clause is [Hand] [Counter].
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: s.inst("warGrowlmon").instanceId,
        effectKey: `blast-digivolve:${s.perm("base").permanentId}`,
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-011");
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.perm("base").topCard?.cardId).toBe("BT19-011");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT19-009"]);
    // The memory cost was waived entirely; only the [When Digivolving] deletion moved the
    // gauge, and the attacker at 20000 DP was out of the 5000 maximum, so nothing died.
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT1-009"]);
    // The digivolve bonus draw still happened.
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("evoDraw").instanceId]);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // ---------------------------------------------------------------------------
  // Inherited [All Turns] Add 3000 to this Digimon's DP deletion effects' maximums.
  // ---------------------------------------------------------------------------

  it.each([
    ["BT19-011", 0],
    ["BT1-009", 1],
  ])("raises a host's printed numeric maximum only from under it (%s)", async (underCardId, survivors) => {
    // BT19-015 Gallantmon's printed [When Digivolving] "delete 1 of your opponent's Digimon
    // with 8000 DP or less" reached through the real digivolve intent: 8000 + 3000 = 11000.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-012", as: "base", under: [underCardId] }],
          hand: [{ card: "BT19-015", as: "host" }],
          deck: [{ card: "BT1-014", as: "evoDraw" }, "BT1-013"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 11_000 }], security: [{ card: "BT1-009" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
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
    if (survivors === 0) await settle(() => s.state.players[1]!.battleArea.length === 0);
    else await drainMicrotasks(30);

    expect(s.state.players[1]!.battleArea).toHaveLength(survivors);
    expect(s.perm("base").topCard?.cardId).toBe("BT19-015");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual([underCardId, "BT19-012"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("stacks the inherited +3000 onto its own aggregate maximum", async () => {
    // WarGrowlmon on top of WarGrowlmon: the inherited copy adds 3000 to the top card's own
    // DP-based deletion effect, so one opponent Digimon gives 3000 + 2000 + 3000 = 8000.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-009", as: "base", under: ["BT19-011"] }],
          hand: [{ card: "BT19-011", as: "warGrowlmon" }],
          deck: [{ card: "BT1-014", as: "evoDraw" }, "BT1-013"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 8000 }], security: [{ card: "BT1-009" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("warGrowlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT19-011", "BT19-009"]);
    expect(s.state.memory).toBe(3);
  });
});
