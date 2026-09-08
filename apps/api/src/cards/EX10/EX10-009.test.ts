import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle, type BoardSpec, type SeatSpec } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX10-009.js";

/**
 * Board Spec shared by every [When Digivolving] case: a level 5 source of a printed
 * evolution colour, Creepymon in hand, and a stocked deck so the digivolution bonus draw
 * and any milling have real cards to move.
 */
function digivolveBoard(source: string, opponent: SeatSpec): BoardSpec {
  return {
    0: {
      battleArea: [{ card: source, as: "source" }],
      hand: [{ card: "EX10-009", as: "creepymon" }],
      deck: [{ card: "BT1-013", as: "drawn" }, "BT1-009"],
    },
    1: opponent,
  };
}

describe("EX10-009 Creepymon", () => {
  it("matches every catalog field and compiles every printed clause", () => {
    expect(getCardDefinition("EX10-009")).toMatchObject({
      cardId: "EX10-009",
      nameEn: "Creepymon",
      colors: ["Red", "Purple"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [
        { color: "Red", level: 5, memoryCost: 4 },
        { color: "Purple", level: 5, memoryCost: 4 },
      ],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Demon Lord", "Seven Great Demon Lords", "Fallen Angel"],
    });
    // The catalog prints no inherited and no security text for this card; assert that so a
    // later catalog change that adds either is caught here instead of silently uncovered.
    const definition = getCardDefinition("EX10-009");
    expect(definition?.inheritedEffectText).toBeUndefined();
    expect(definition?.securityEffectText).toBeUndefined();

    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    for (const trigger of ["WhenDigivolving", "OnDeletion"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Delete",
            target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestDP" }, count: "all" },
          },
          { kind: "TrashTopDeck", controller: "opponent", amount: 5, condition: { kind: "ifThisEffectDidNotDelete" } },
        ],
      });
    }
    expect(compiled.effects?.find((effect) => effect.trigger === "WhenAttacking")).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          breeding: true,
          optional: true,
          condition: { kind: "zoneCount", seat: "opponent", zone: "trash", op: "gte", value: 10 },
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Red", "Purple"],
              dp: { op: "lte", value: 5000 },
            },
            count: 1,
          },
        },
      ],
    });
    // "This Digimon may attack" prints no "without suspending" clause (contrast BT21-072), so
    // the effect-driven attack follows the normal declaration rules and taps the attacker.
    expect(compiled.effects?.find((effect) => effect.trigger === "EndOfYourTurn")).toMatchObject({
      actions: [{ kind: "Attack", withoutSuspending: false, optional: true }],
    });
  });

  // C1: the printed evolution routes, driven by the public `digivolve` intent. Both printed
  // costs are level 5 / cost 4, one per colour.
  it.each([
    ["red", "BT1-020"],
    ["purple", "BT10-079"],
  ])("publicly digivolves from a %s level 5 source and deletes the opponent's lowest DP Digimon", async (_c, src) => {
    const s = setupEngine(
      digivolveBoard(src, {
        battleArea: [
          { card: "BT1-009", as: "low", dp: 3000 },
          { card: "BT1-014", as: "high", dp: 9000 },
        ],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
      }),
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 4;
    const sourceId = s.inst("source").instanceId;
    const creepymonId = s.inst("creepymon").instanceId;
    const deckBefore = s.state.players[1]!.deck.length;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: creepymonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1 && s.state.pendingDecision === undefined);

    expect(s.perm("source").topCard?.instanceId).toBe(creepymonId);
    expect(s.perm("source").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    // Only the lowest-DP Digimon is deleted, and because a deletion happened the deck is untouched.
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("high").permanentId,
    ]);
    expect(s.state.players[1]!.deck).toHaveLength(deckBefore);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses a level 4 source and leaves memory, hand and the board untouched", async () => {
    const s = setupEngine(digivolveBoard("BT1-014", { battleArea: [{ card: "BT1-009", as: "low" }] }));
    await s.ready();
    s.state.memory = 8;
    const creepymonId = s.inst("creepymon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: creepymonId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(8);
    expect(s.perm("source").topCard?.cardId).toBe("BT1-014");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([creepymonId]);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("deletes every tied lowest DP Digimon at once and does not mill", async () => {
    const s = setupEngine(
      digivolveBoard("BT1-020", {
        battleArea: [
          { card: "BT1-009", as: "lowA", dp: 3000 },
          { card: "BT1-010", as: "lowB", dp: 3000 },
          { card: "BT1-014", as: "high", dp: 5000 },
        ],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
      }),
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 4;
    const deckBefore = s.state.players[1]!.deck.length;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("creepymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1 && s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("high").permanentId,
    ]);
    expect(s.state.players[1]!.deck).toHaveLength(deckBefore);
    expect(s.state.players[1]!.trash).toHaveLength(2);
  });

  it("ignores the opponent's breeding-area Digimon when picking the lowest DP", async () => {
    const s = setupEngine(
      digivolveBoard("BT1-020", {
        battleArea: [{ card: "BT1-014", as: "onlyBattleArea", dp: 9000 }],
        breeding: { card: "BT1-009", as: "inBreeding", dp: 1000 },
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
      }),
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 4;
    const deckBefore = s.state.players[1]!.deck.length;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("creepymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.pendingDecision === undefined);

    // The 1000 DP breeding Digimon is untouched (Comprehensive Rules §3-4-5-2) and the
    // 9000 DP battle-area Digimon is the lowest among legal targets, so it dies.
    expect(s.state.players[1]!.breeding?.topCard?.instanceId).toBe(s.inst("inBreeding").instanceId);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck).toHaveLength(deckBefore);
  });

  // Q5016: no opposing Digimon at all still counts as "this effect didn't delete".
  it("Q5016 mills exactly 5 when the opponent has no Digimon to delete", async () => {
    const s = setupEngine(
      digivolveBoard("BT1-020", {
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
      }),
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("creepymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.length === 5 && s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT1-014"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual([
      "BT1-009",
      "BT1-010",
      "BT1-011",
      "BT1-012",
      "BT1-013",
    ]);
  });

  // Q5017: the only opposing Digimon survives a deletion-prevention static, so nothing was
  // deleted and the fallback mill still happens. BT14-062 Datamon prints
  // "[All Turns] This Digimon can't be deleted by your opponent's effects."
  it("Q5017 mills 5 when the only opposing Digimon cannot be deleted by opponent effects", async () => {
    const s = setupEngine(
      digivolveBoard("BT1-020", {
        battleArea: [{ card: "BT14-062", as: "protected" }],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
      }),
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("creepymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.deck.length === 1 && s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT14-062"]);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT1-014"]);
    expect(s.state.players[1]!.trash.filter((card) => card.cardId !== "BT14-062")).toHaveLength(5);
  });

  // Q5018: two tied lowest-DP Digimon, one protected. One deletion succeeds, so the
  // "didn't delete" condition is NOT met and the deck stays whole.
  it("Q5018 does not mill when at least one of the tied lowest DP Digimon is deleted", async () => {
    const s = setupEngine(
      digivolveBoard("BT1-020", {
        battleArea: [
          { card: "BT14-062", as: "protected", dp: 6000 },
          { card: "BT1-020", as: "vulnerable", dp: 6000 },
        ],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
      }),
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 4;
    const deckBefore = s.state.players[1]!.deck.length;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("creepymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1 && s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT14-062"]);
    expect(s.state.players[1]!.deck).toHaveLength(deckBefore);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-020"]);
  });

  // C1 on its second printed timing: [On Deletion], reached by losing a real battle.
  it("fires the same clause on deletion after losing a battle it declared", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX10-009", as: "creepymon" }], deck: ["BT1-009", "BT1-010"] },
        1: {
          battleArea: [{ card: "BT1-014", as: "wall", dp: 15_000, suspended: true }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const deckBefore = s.state.players[1]!.deck.length;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("creepymon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.length === 0 &&
        s.state.players[1]!.battleArea.length === 0 &&
        !observe(s.engine).isAttacking(),
      5000,
    );

    // Creepymon loses the battle (12000 vs 15000); its [On Deletion] then deletes the
    // survivor, which was the opponent's only — hence lowest DP — Digimon. A deletion
    // happened, so no mill.
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["EX10-009"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-014"]);
    expect(s.state.players[1]!.deck).toHaveLength(deckBefore);
  });

  // C2 + Q5019: the [When Attacking] breeding play, reached by a real attack declaration.
  it.each([
    ["red", "BT1-013"],
    ["purple", "BT3-083"],
  ])("plays a %s 5000 DP Digimon from trash into the empty breeding area on a real attack", async (_c, eligible) => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-009", as: "creepymon" }],
          trash: [
            { card: eligible, as: "eligible" },
            { card: "BT1-028", as: "wrongColour" },
            { card: "BT1-020", as: "tooLarge" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          security: ["BT1-009"],
          trash: Array.from({ length: 10 }, () => "BT1-009"),
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.inst("eligible").instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("creepymon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("eligible").instanceId, 5000);

    expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe(eligible);
    // The two non-matching trash cards stay put: 5000 DP is the inclusive boundary, and
    // "red or purple" excludes a blue card.
    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(["BT1-020", "BT1-028"]);
    expect(s.state.players[0]!.breeding?.inBreeding).toBe(true);
  });

  it("plays nothing when the trash holds only off-colour or over-DP Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-009", as: "creepymon" }],
          trash: [
            // Blue 3000 DP (within the DP bound, wrong colour) and red 6000 DP (right
            // colour, one over the 5000 DP bound).
            { card: "BT1-028", as: "wrongColour" },
            { card: "BT1-020", as: "tooLarge" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          security: ["BT1-009"],
          trash: Array.from({ length: 10 }, () => "BT1-009"),
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("creepymon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined, 5000);

    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(["BT1-020", "BT1-028"]);
  });

  // Q5019: a Digimon played into breeding by this effect does not trigger its own [On Play].
  it("Q5019 does not fire the played Digimon's On Play effect", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-009", as: "creepymon" }],
          // EX10-007 Greymon: "[On Play] [When Digivolving] 1 Digimon gets +3000 DP until
          // your opponent's turn ends." Red, 4000 DP, so it is a legal choice here.
          trash: [{ card: "EX10-007", as: "eligible" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-014", as: "opponent", dp: 9000, suspended: true }],
          trash: Array.from({ length: 10 }, () => "BT1-009"),
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.inst("eligible").instanceId);
    const creepymonDp = s.perm("creepymon").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("creepymon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("opponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "EX10-007", 5000);
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined, 5000);

    expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe("EX10-007");
    // No +3000 DP landed anywhere: the [On Play] never ran.
    expect(s.perm("creepymon").currentDP).toBe(creepymonDp);
    expect(s.state.players[0]!.breeding?.currentDP).toBe(4000);
  });

  it("offers no breeding play at 9 opposing trash cards, one below the printed gate", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-009", as: "creepymon" }],
          trash: [{ card: "BT1-013", as: "eligible" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          security: ["BT1-009"],
          trash: Array.from({ length: 9 }, () => "BT1-009"),
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("creepymon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined, 5000);

    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("eligible").instanceId)).toBe(true);
  });

  it("offers no breeding play while the breeding area is occupied", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-009", as: "creepymon" }],
          trash: [{ card: "BT1-013", as: "eligible" }],
          deck: ["BT1-009", "BT1-010"],
          breeding: { card: "BT1-009", as: "occupant" },
        },
        1: {
          security: ["BT1-009"],
          trash: Array.from({ length: 10 }, () => "BT1-009"),
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("creepymon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined, 5000);

    expect(s.state.players[0]!.breeding?.topCard?.instanceId).toBe(s.inst("occupant").instanceId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("eligible").instanceId)).toBe(true);
  });

  // RETAINED RED (Q5656). BT24-078 Creepymon (X Antibody) prints a {Trash} [Your Turn] effect
  // that reacts to the same attack declaration. The ruling: both trigger simultaneously and the
  // player picks the order, but resolving the trash digivolve first means this card's
  // [When Attacking] can no longer activate.
  //
  // Seam: the sub-trigger fire path in apps/api/src/engine/effects/subtriggers.ts together with
  // the timing-window queue in apps/api/src/engine/effects/EffectContext.ts (`fireTiming` /
  // `fireSubTriggers`). Two defects, both outside this card's module:
  //   1. No `orderTriggers` decision is raised for the simultaneous pair — three plain
  //      `optional` prompts are offered in the engine's own order instead.
  //   2. After BT24-078 digivolves over EX10-009, the already-queued [When Attacking] entry is
  //      still resolved, so BT1-013 reaches breeding. The queue never re-checks that the
  //      source card is still the permanent's top card.
  // Expected: `orderTriggers` offered, breeding empty, BT1-013 still in trash.
  // Actual: decisions ["optional","optional","optional"], breeding holds BT1-013, own trash empty.
  it.fails("Q5656 loses its When Attacking window when the trash digivolve is ordered first", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-009", as: "creepymon" }],
          trash: [
            { card: "BT24-078", as: "xAntibody" },
            // Avian trait, so BT24-078's own [When Digivolving] play (Evil / Fallen Angel
            // only) cannot pick it up; the only route into breeding is EX10-009's clause.
            { card: "BT1-013", as: "eligible" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          security: ["BT1-009", "BT1-011"],
          trash: Array.from({ length: 10 }, () => "BT1-009"),
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferTriggerKeys: ["BT24-078"] },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("creepymon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined, 5000);

    // The trash digivolve resolved: EX10-009 is now a digivolution card under BT24-078.
    expect(s.perm("creepymon").topCard?.instanceId).toBe(s.inst("xAntibody").instanceId);
    expect(s.perm("creepymon").stack.map((card) => card.cardId)).toContain("EX10-009");
    // The two [When Attacking] reactions were offered as a simultaneous set the controller
    // orders. ACTUAL: only three plain `optional` prompts are raised, never `orderTriggers`.
    expect(s.decisions.some(({ req }) => req.kind === "orderTriggers")).toBe(true);
    // EX10-009's own [When Attacking] never activated, so nothing reached breeding.
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("eligible").instanceId)).toBe(true);
  });

  // C3: [End of Your Turn] through the production turn loop, not an injected timing.
  it("attacks at the end of its controller's real turn and suspends doing so", async () => {
    const preferred = ["player"];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-009", as: "creepymon" }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
        1: { security: ["BT1-009"], deck: ["BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();

    await advance(s.engine).runTurn(0);
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined, 5000);

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.perm("creepymon").isSuspended).toBe(true);
  });

  it("declines the optional end-of-turn attack and leaves security untouched", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-009", as: "creepymon" }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
        1: { security: ["BT1-009"], deck: ["BT1-010", "BT1-011"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).runTurn(0);
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined, 5000);

    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.perm("creepymon").isSuspended).toBe(false);
  });

  it("cannot attack again at end of turn once its main-phase attack suspended it", async () => {
    // FAILS-WHEN-REVERTED: `withoutSuspending: true` would let the already-suspended
    // Creepymon declare a second, untapped attack. The printed text is the plain
    // "may attack" form. A Board Spec `suspended: true` cannot prove this — the turn's own
    // Unsuspend step clears it — so the suspension comes from a real attack this turn.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-009", as: "creepymon" }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
        1: { security: ["BT1-009", "BT1-011"], deck: ["BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: ["player"] },
    );
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("creepymon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 1, 5000);
    expect(s.perm("creepymon").isSuspended).toBe(true);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined, 5000);

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(observe(s.engine).isAttacking()).toBe(false);
  });
});
