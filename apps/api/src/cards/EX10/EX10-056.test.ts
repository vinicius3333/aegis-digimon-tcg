import { EffectDuration, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { irNode } from "../../engine/testkit/irNode.js";
import compiled from "./EX10-056.js";
import "../index.js";

/**
 * EX10-056 Bagramon (Purple, Lv.6 Mega, [Demon Lord]/[Bagra Army], 13000 DP, play cost 13).
 *
 * "[On Play] [When Digivolving] You may place 1 of your opponent's Digimon as any of their other
 *  Digimon's bottom digivolution card or under any of their Tamers.
 *  [All Turns] [Once Per Turn] When any of your opponent's Digimon or Tamers digivolve or effects
 *  place cards under them, by trashing any 2 of this Digimon's digivolution cards, trash your
 *  opponent's top security card.
 *  [DigiXros -2] 2 Digimon cards w/[Bagra Army] trait"
 *
 * Every clause below is driven by a public intent: `playCard` with a `digiXros` plan, `digivolve`,
 * `linkCard`, and the real turn loop. The one exception is the Q5144 unaffectable-host negative,
 * which arms a restriction through the Test Seam's ledger surface because no in-set card grants
 * "unaffected by your opponent's effects" to an opposing permanent.
 */

const CARD_ID = "EX10-056";

/** Bagra Army Digimon cards that carry no [On Play] / [When Digivolving] text: safe DigiXros materials. */
const MATERIAL_A = "BT14-057"; // ChuuChuumon, Lv.3 Black/Purple [Bagra Army]
const MATERIAL_B = "BT14-059"; // Damemon, Lv.4 Black/Purple [Bagra Army]
const NON_MATERIAL = "BT1-009"; // Monodramon, Red [Dragon] — no [Bagra Army] trait, no text

describe("EX10-056 Bagramon catalog and compiled contract", () => {
  it("records the exact catalog", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Bagramon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 13,
      dp: 13000,
      evoCosts: [{ color: "Purple", level: 5, memoryCost: 5 }],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Demon Lord", "Bagra Army"],
    });
  });

  it("records permanent relocation with source shedding, the shared watcher key, and the recipe", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digiXrosRequirement).toEqual([
      { materials: [{ traits: ["Bagra Army"] }], count: 2, costReduction: 2, maxMaterials: 2 },
    ]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects?.find((candidate) => candidate.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "PlaceUnder",
        targetIsPermanent: true,
        position: "bottom",
        shedOwnCards: true,
        optional: true,
        underFilter: { controller: "opponent", kind: ["Digimon", "Tamer"] },
      });
    }
    const allTurns = compiled.effects?.find((effect) => effect.trigger === "AllTurns");
    expect(allTurns).toMatchObject({ frequency: "OncePerTurn" });
    // Both event forms carry the SAME `oncePerTurnKey`, so they spend one physical use.
    expect(allTurns?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenOneOfYoursDigivolves",
      // "Digimon or Tamers digivolve": a Tamer base digivolves as a Tamer, so the kind list
      // must name Tamer or the engine's `tamerDigivolvedGate` withholds the watcher.
      sourceFilter: { controller: "opponent", kind: ["Digimon", "Tamer"] },
      oncePerTurnKey: "EX10-056/all-turns",
    });
    expect(allTurns?.actions?.[1]).toMatchObject({
      kind: "SubTrigger",
      event: "onAddDigivolutionCards",
      sourceFilter: { controller: "opponent", kind: ["Digimon", "Tamer"], byEffect: true },
      oncePerTurnKey: "EX10-056/all-turns",
    });
    for (const index of [0, 1]) {
      expect(irNode(allTurns?.actions?.[index])?.actions?.[0]).toMatchObject({
        kind: "trashSecurityTop",
        controller: "opponent",
        count: 1,
        cost: { kind: "trash", target: { filter: { isSelfRef: true, zone: "digivolutionCards" }, count: 2 } },
      });
    }
  });
});

describe("EX10-056 [DigiXros -2] 2 Digimon cards w/[Bagra Army] trait", () => {
  it("places two hand materials and pays 13 - 2 per material = 9 memory", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "bagramon" },
            { card: MATERIAL_A, as: "first" },
            { card: MATERIAL_B, as: "second" },
            "BT1-013",
          ],
        },
        1: {},
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("bagramon").instanceId,
        digiXros: { materialInstanceIds: [s.inst("first").instanceId, s.inst("second").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    const played = s.state.players[0]!.battleArea[0]!;
    expect(played.topCard!.cardId).toBe(CARD_ID);
    expect(played.currentDP).toBe(13000);
    // `Permanent.stack[0]` is the BOTTOM digivolution card; each material is placed underneath
    // the previous one, so the last-declared material ends up bottom-most.
    expect(played.stack.map(({ cardId }) => cardId)).toEqual([MATERIAL_B, MATERIAL_A]);
    expect(s.state.memory).toBe(-9);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-013"]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("reduces the cost per material: one material costs 11, not 9", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: CARD_ID, as: "bagramon" }, { card: MATERIAL_A, as: "first" }, "BT1-013"] },
        1: {},
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("bagramon").instanceId,
        digiXros: { materialInstanceIds: [s.inst("first").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.players[0]!.battleArea[0]!.stack.map(({ cardId }) => cardId)).toEqual([MATERIAL_A]);
    expect(s.state.memory).toBe(-10);
  });

  it("takes a material from the battle area, shedding that permanent's own digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "bagramon" }, { card: MATERIAL_A, as: "fromHand" }, "BT1-013"],
          battleArea: [{ card: MATERIAL_B, as: "fromField", under: [{ card: "BT1-013", as: "shed" }] }],
        },
        1: {},
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 0;
    await s.ready();
    const fieldTopId = s.perm("fromField").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("bagramon").instanceId,
        digiXros: { materialInstanceIds: [s.inst("fromHand").instanceId, fieldTopId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    const played = s.state.players[0]!.battleArea[0]!;
    expect(played.topCard!.cardId).toBe(CARD_ID);
    // A hand material is placed at the bottom; a relocated battle-area permanent is pushed on
    // top of the existing stack, so the field material sits above it.
    expect(played.stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("fromHand").instanceId, fieldTopId]);
    // §7-2-2-7: only the battle-area material's TOP card becomes a digivolution card.
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("shed").instanceId]);
    expect(s.state.memory).toBe(-9);
  });

  it("refuses a material without the [Bagra Army] trait, spending nothing", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: CARD_ID, as: "bagramon" },
          { card: MATERIAL_A, as: "first" },
          { card: NON_MATERIAL, as: "wrong" },
        ],
      },
      1: {},
    });
    s.state.memory = 9;
    await s.ready();
    const handBefore = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("bagramon").instanceId,
        digiXros: { materialInstanceIds: [s.inst("first").instanceId, s.inst("wrong").instanceId] },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });
    expect(s.state.memory).toBe(9);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(handBefore);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("rejects a third material without spending memory or moving cards", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: CARD_ID, as: "played" },
          { card: MATERIAL_A, as: "firstMaterial" },
          { card: MATERIAL_B, as: "secondMaterial" },
          { card: MATERIAL_A, as: "thirdMaterial" },
        ],
      },
    });
    s.state.memory = 9;
    await s.ready();
    const originalHand = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("played").instanceId,
        digiXros: {
          materialInstanceIds: ["firstMaterial", "secondMaterial", "thirdMaterial"].map(
            (alias) => s.inst(alias).instanceId,
          ),
        },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });
    expect(s.state.memory).toBe(9);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(originalHand);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });
});

describe("EX10-056 [On Play] [When Digivolving] placement", () => {
  it("[On Play] via a real DigiXros: the victim leaves the battle area and its stack is trashed (Q5145)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: CARD_ID, as: "bagramon" }, { card: MATERIAL_A, as: "first" }, "BT1-013"] },
        1: {
          battleArea: [
            { card: NON_MATERIAL, as: "victim", under: [{ card: "BT1-013", as: "victimStack" }] },
            { card: "BT1-014", as: "host", under: [{ card: "BT1-013", as: "existing" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("victim").topCard!.instanceId);
    s.state.memory = 1;
    await s.ready();
    const victimTopId = s.perm("victim").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("bagramon").instanceId,
        digiXros: { materialInstanceIds: [s.inst("first").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    // Only the host is left; the victim's top card sits at the true BOTTOM of the host's stack
    // (Q5143) and the victim's own digivolution card was trashed at the same time (Q5145).
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([s.perm("host").permanentId]);
    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual([
      victimTopId,
      s.inst("existing").instanceId,
    ]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("victimStack").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[When Digivolving] via a real digivolve places under an opponent Tamer, at the bottom (Q5143/Q5146)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-081", as: "base" }],
          hand: [{ card: CARD_ID, as: "bagramon" }, "BT1-013"],
          deck: ["BT1-013"],
        },
        1: {
          battleArea: [
            { card: NON_MATERIAL, as: "victim" },
            {
              card: "BT1-088",
              as: "tamer",
              under: [
                { card: "BT1-013", as: "under1" },
                { card: "BT1-014", as: "under2" },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const victimTopId = s.perm("victim").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("bagramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.perm("base").topCard!.cardId).toBe(CARD_ID);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT10-081"]);
    // The Tamer keeps the cards it already had and receives the placed Digimon underneath them.
    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual([
      victimTopId,
      s.inst("under1").instanceId,
      s.inst("under2").instanceId,
    ]);
    // Q5146: a Tamer never gains an inherited effect from a card under it. The placed card is a
    // plain vanilla Digimon here, so the observable consequence is only the stack itself; the
    // gaining rule lives in the engine's inherited-effect resolution, not in this card.
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([s.perm("tamer").permanentId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q5144: cannot place an opposing Digimon under a host that isn't affected by effects", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "bagramon" }] },
        1: {
          battleArea: [
            { card: NON_MATERIAL, as: "material" },
            { card: "BT1-014", as: "host", under: [{ card: "BT1-013", as: "existing" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    // Test Seam ledger arming: no card in this set grants "unaffected by your opponent's effects"
    // to an OPPOSING permanent, so the only legal host is made unaffectable directly.
    advance(s.engine).ledgers.continuous.addRestriction(
      s.perm("host").permanentId,
      "beAffected",
      EffectDuration.Permanent,
      { fromSourceKind: ["Digimon"] },
    );
    const materialId = s.perm("material").permanentId;
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("bagramon"));
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(materialId);
    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("existing").instanceId]);
  });
});

describe("EX10-056 [All Turns] [Once Per Turn] security trash", () => {
  /** Seat 0 holds Bagramon with `underCount` digivolution cards; seat 1 can digivolve on its turn. */
  const board = (underCount: number) => ({
    0: {
      battleArea: [
        {
          card: CARD_ID,
          as: "bagramon",
          under: Array.from({ length: underCount }, (_, index) => ({
            card: "BT1-013",
            as: `under${index}`,
          })),
        },
      ],
      deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-013", "BT1-014"],
      hand: ["BT1-013"],
      security: ["BT1-013", "BT1-014"],
    },
    1: {
      battleArea: [
        { card: "BT1-009", as: "baseA" },
        { card: "BT1-009", as: "baseB" },
        { card: "BT1-009", as: "baseC" },
      ],
      hand: [
        { card: "BT23-009", as: "evoA" },
        { card: "BT23-009", as: "evoB" },
        { card: "BT23-009", as: "evoC" },
      ],
      deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-013", "BT1-014"],
      security: ["BT1-013", "BT1-014", "BT1-009", "BT1-013"],
    },
  });

  it("trashes the opponent's top security card by trashing exactly 2 digivolution cards, once per turn", async () => {
    const s = setupEngine(board(4), { autoAcceptOptional: true, autoSelectCards: true });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    const opponent = s.state.players[1]!;
    const securityBefore = opponent.security.map(({ instanceId }) => instanceId);
    expect(s.perm("bagramon").stack).toHaveLength(4);

    // First opponent digivolve of the turn: the watcher fires.
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("baseA").permanentId,
        instanceId: s.inst("evoA").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => opponent.security.length === securityBefore.length - 1);

    expect(opponent.security.map(({ instanceId }) => instanceId)).toEqual(securityBefore.slice(1));
    expect(opponent.trash.map(({ instanceId }) => instanceId)).toContain(securityBefore[0]);
    expect(s.perm("bagramon").stack).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(2);

    // Second opponent digivolve, same turn: [Once Per Turn] is spent.
    const securityAfterFirst = opponent.security.map(({ instanceId }) => instanceId);
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("baseB").permanentId,
        instanceId: s.inst("evoB").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 40);
    expect(opponent.security.map(({ instanceId }) => instanceId)).toEqual(securityAfterFirst);
    expect(s.perm("bagramon").stack).toHaveLength(2);

    // Next own turn of the opponent: the use has reset and the remaining 2 sources pay again.
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("baseC").permanentId,
        instanceId: s.inst("evoC").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => opponent.security.length === securityAfterFirst.length - 1);

    expect(opponent.security.map(({ instanceId }) => instanceId)).toEqual(securityAfterFirst.slice(1));
    expect(s.perm("bagramon").stack).toHaveLength(0);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Q5142: 1 remaining digivolution card cannot pay the 'by trashing any 2' condition", async () => {
    const s = setupEngine(board(1), { autoAcceptOptional: true, autoSelectCards: true });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    const opponent = s.state.players[1]!;
    const securityBefore = opponent.security.map(({ instanceId }) => instanceId);
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("baseA").permanentId,
        instanceId: s.inst("evoA").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 40);

    expect(opponent.security.map(({ instanceId }) => instanceId)).toEqual(securityBefore);
    expect(s.perm("bagramon").stack).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(0);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("fires when an opponent's EFFECT places a card under their Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "bagramon", under: ["BT1-013", "BT1-014"] }],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
          hand: ["BT1-013"],
          security: ["BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [{ card: "BT1-088", as: "tamer" }],
          hand: [
            { card: "EX10-044", as: "tuwarmon" },
            { card: MATERIAL_A, as: "placed" },
          ],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-013"],
          security: ["BT1-013", "BT1-014", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    const opponent = s.state.players[1]!;
    const securityBefore = opponent.security.map(({ instanceId }) => instanceId);
    // EX10-044's [On Play] places a [Bagra Army] Digimon card from hand under one of its
    // controller's Tamers — an EFFECT placing cards under an opponent permanent.
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("tuwarmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => opponent.security.length === securityBefore.length - 1);

    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("placed").instanceId]);
    expect(opponent.security.map(({ instanceId }) => instanceId)).toEqual(securityBefore.slice(1));
    expect(s.perm("bagramon").stack).toHaveLength(0);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Q5148: does not trigger when a card is linked to an opponent's Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "bagramon", under: ["BT1-013", "BT1-014"] }],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
          hand: ["BT1-013"],
          security: ["BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [{ card: "BT23-009", as: "coach" }],
          hand: [{ card: "BT23-007", as: "link" }],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-013"],
          security: ["BT1-013", "BT1-014", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    const opponent = s.state.players[1]!;
    const securityBefore = opponent.security.map(({ instanceId }) => instanceId);
    expect(
      s.engine.applyIntent(1, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("coach").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("coach").linked.length === 1);
    await settle(() => false, 40);

    expect(s.perm("coach").linked.map(({ instanceId }) => instanceId)).toEqual([s.inst("link").instanceId]);
    expect(opponent.security.map(({ instanceId }) => instanceId)).toEqual(securityBefore);
    expect(s.perm("bagramon").stack).toHaveLength(2);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not react to its own controller digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "bagramon", under: ["BT1-013", "BT1-014"] },
            { card: "BT1-009", as: "mine" },
          ],
          hand: [{ card: "BT23-009", as: "evo" }, "BT1-013"],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
        },
        1: { security: ["BT1-013", "BT1-014", "BT1-009"], deck: ["BT1-013", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("mine").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 40);

    expect(s.state.players[1]!.security).toHaveLength(3);
    expect(s.perm("bagramon").stack).toHaveLength(2);
  });
});
