import { assemblyRequirementFor, digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX13-037.js";
import "../index.js";

const CARD_ID = "EX13-037";
// [Witchelny]-text Digimon by level, verified against the catalog:
//   BT18-039 Mistymon   Lv.5 Yellow
//   BT18-036 Wizardmon  Lv.4 Yellow
//   BT18-030 Candlemon  Lv.3 Yellow
const WITCHELNY_LV5 = "BT18-039";
const WITCHELNY_LV4 = "BT18-036";
const WITCHELNY_LV3 = "BT18-030";
// BT1-020 Groundramon: Lv.5 Red, no printed text and no [Witchelny] token — refused by the
// Assembly Lv.5 slot, though the printed RED EvoCost still reaches this card from it.
const PLAIN_LV5 = "BT1-020";
// BT1-038: Lv.5 BLUE with no printed text — off-colour for both printed EvoCosts and carrying no
// [Witchelny] token, so it is legal on NO route into this card.
const OFF_COLOUR_LV5 = "BT1-038";
// BT8-017: printed 13000 DP with no printed text — survives the -12000 with 1000 DP left, so the
// modifier is observable rather than lethal. A harness-seeded `dp` would not survive a recompute.
const BIG_VICTIM = "BT8-017";

describe("EX13-037 Dynasmon", () => {
  it("matches the catalog identity", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      nameEn: "Dynasmon",
      colors: ["Yellow", "Red"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Holy Warrior", "Royal Knight"],
      evoCosts: [
        { color: "Yellow", level: 5, memoryCost: 4 },
        { color: "Red", level: 5, memoryCost: 4 },
      ],
      effectText: expect.stringContaining("[Assembly -5] Lv.5 × Lv.4 × Lv.3, all w/[Witchelny] in text"),
    });
    expect(getCardDefinition(CARD_ID)?.inheritedEffectText).toBeUndefined();
  });

  it("compiles every printed clause", () => {
    expect(compiled).toMatchObject({ cardId: CARD_ID, coverage: "full", residual: [] });
    expect(compiled.effects).toHaveLength(7);

    expect(compiled.effects.slice(0, 3).map((effect) => effect.keywords?.[0]?.keyword)).toEqual([
      "Raid",
      "Piercing",
      "Blocker",
    ]);

    const sharedKeys = new Set<string>();
    for (const [index, trigger] of (["OnPlay", "WhenDigivolving", "WhenAttacking"] as const).entries()) {
      const effect = compiled.effects[index + 3]!;
      expect(effect).toMatchObject({ trigger, frequency: "OncePerTurn" });
      sharedKeys.add(effect.sharedUseKey!);
      expect(effect.actions).toMatchObject([
        { kind: "trashSecurityTop", controller: "mine", count: 1 },
        { kind: "ModifyDP", amount: 10000, duration: "untilOpponentTurnEnd", target: { isSelf: true } },
        {
          kind: "trashSecurityTop",
          controller: "opponent",
          count: 1,
          condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 3 },
        },
      ]);
    }
    expect(sharedKeys.size).toBe(1);

    expect(compiled.effects[6]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          // PLURAL "security stackS" ⇒ either player's stack arms it.
          sourceFilter: { controller: "any" },
          actions: [
            {
              kind: "ModifyDP",
              amount: -12000,
              duration: "untilOpponentTurnEnd",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            },
            {
              kind: "Recover",
              amount: 1,
              condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 3 },
            },
          ],
        },
      ],
    });
    expect(compiled.effects[6]?.actions[0]).not.toHaveProperty("fireCondition");

    expect(digivolutionRequirementsFor(CARD_ID)).toEqual(
      expect.arrayContaining([{ level: 5, texts: ["Witchelny"], cost: 3, isAlternate: true }]),
    );
    expect(assemblyRequirementFor(CARD_ID)).toEqual([
      {
        reduceCost: 5,
        materials: [
          { level: 5, count: 1, nameOrTrait: [{ tokens: ["Witchelny"], match: "text" }] },
          { level: 4, count: 1, nameOrTrait: [{ tokens: ["Witchelny"], match: "text" }] },
          { level: 3, count: 1, nameOrTrait: [{ tokens: ["Witchelny"], match: "text" }] },
        ],
      },
    ]);
  });

  it("carries all three printed keywords", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "dynasmon" }], deck: ["BT1-010"], security: ["BT1-013"] },
      1: { deck: ["BT1-011"] },
    });
    await s.ready();
    await advance(s.engine).recompute();
    for (const keyword of ["Raid", "Piercing", "Blocker"]) {
      expect(observe(s.engine).hasKeyword(s.perm("dynasmon"), keyword)).toBe(true);
    }
  });

  it("[On Play] trashes your top security, gains +10000 DP, and spares theirs above the gate", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "dynasmon" }],
          deck: ["BT1-010", "BT1-012"],
          security: ["BT1-013", "BT1-011", "BT1-012", "BT1-010", "BT1-009"],
        },
        1: { deck: ["BT1-011"], security: ["BT1-013", "BT1-011"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    const printedDp = getCardDefinition(CARD_ID)!.dp!;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("dynasmon"));
    await settle();

    expect(s.state.players[0]!.security).toHaveLength(4);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-013"]);
    expect(s.perm("dynasmon").currentDP).toBe(printedDp + 10000);
    // 4 security left ⇒ "3 or fewer" fails, so their stack is untouched.
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("trashes THEIR top security once your own stack is down to 3 or fewer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "dynasmon" }],
          deck: ["BT1-010", "BT1-012"],
          security: ["BT1-013", "BT1-011"],
        },
        1: { deck: ["BT1-011"], security: [{ card: "BT1-013", as: "theirTop" }, "BT1-011"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("dynasmon"));
    await settle();

    // Own stack: 2 -> 1 by this clause's own trash, then back to 2 because that removal armed this
    // card's own [All Turns] watcher, whose "3 or fewer" gate then fired the printed ＜Recovery +1＞.
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-013"]);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("theirTop").instanceId);
  });

  it("the [When Attacking] window fires on a real declared attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "dynasmon" }],
          deck: ["BT1-010", "BT1-012"],
          security: ["BT1-013", "BT1-011", "BT1-012", "BT1-010", "BT1-009"],
        },
        1: { deck: ["BT1-011"], security: ["BT1-013", "BT1-011"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    s.state.memory = 3;
    const printedDp = getCardDefinition(CARD_ID)!.dp!;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("dynasmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length > 0);
    await settle();

    // The controller's own top security card was trashed as the attack was declared.
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-013"]);
    expect(s.perm("dynasmon").currentDP).toBeGreaterThanOrEqual(printedDp + 10000);
  });

  it("spends one shared use across all three printed timings", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "dynasmon" }],
          deck: ["BT1-010", "BT1-012"],
          security: ["BT1-013", "BT1-011", "BT1-012", "BT1-010", "BT1-009"],
        },
        1: { deck: ["BT1-011"], security: ["BT1-013", "BT1-011"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("dynasmon"));
    await settle();
    expect(s.state.players[0]!.security).toHaveLength(4);

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("dynasmon"));
    await settle();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("dynasmon"));
    await settle();

    // Still one trash, one buff: the printed [Once Per Turn] is shared by all three windows.
    expect(s.state.players[0]!.security).toHaveLength(4);
    expect(s.state.players[0]!.trash).toHaveLength(1);
    expect(s.perm("dynasmon").currentDP).toBe(getCardDefinition(CARD_ID)!.dp! + 10000);

    // A real turn through the production turn loop refills the quota.
    s.state.turnSeat = 0;
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 0;
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("dynasmon"));
    await settle();
    expect(s.state.players[0]!.trash).toHaveLength(2);
  });

  it("[All Turns] fires when YOUR security stack is removed from, and recovers under the gate", async () => {
    const s = setupEngine(
      {
        0: {
          // Suspended so its printed ＜Blocker＞ cannot intercept the attack: this scenario is
          // about the security removal, not about blocking.
          battleArea: [{ card: CARD_ID, as: "dynasmon", suspended: true }],
          deck: [{ card: "BT1-012", as: "recovered" }, "BT1-010"],
          security: ["BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT9-035", as: "attacker", dp: 20_000 },
            { card: BIG_VICTIM, as: "victim" },
          ],
          deck: ["BT1-011", "BT1-014"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: [] },
    );
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.security.some(({ instanceId }) => instanceId === s.inst("recovered").instanceId),
    );
    await settle();

    // ＜Recovery +1＞ put the deck's top card on top of the controller's stack.
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toContain(s.inst("recovered").instanceId);
    // -12000 DP landed on exactly one of the opponent's Digimon; the choice itself is free.
    const dropped = ["attacker", "victim"].filter(
      (alias) => s.perm(alias).currentDP === (alias === "victim" ? 1000 : 8000),
    );
    expect(dropped).toHaveLength(1);
  });

  it("[All Turns] also fires when the OPPONENT's security stack is the one removed from", async () => {
    const s = setupEngine(
      {
        0: {
          // Dynasmon watches from the sidelines: a separate attacker keeps this scenario to ONE
          // security removal — the OPPONENT's, which is the direction under test.
          battleArea: [
            { card: CARD_ID, as: "dynasmon", suspended: true },
            { card: "BT1-019", as: "attacker", dp: 20_000 },
          ],
          deck: [{ card: "BT1-012", as: "recovered" }, "BT1-010"],
          security: ["BT1-013"],
        },
        1: {
          battleArea: [{ card: BIG_VICTIM, as: "victim" }],
          deck: ["BT1-011", "BT1-014"],
          security: ["BT1-009"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    await settle();

    expect(s.perm("victim").currentDP).toBe(1000);
    // Own stack was 1 card ⇒ the gate holds and Recovery +1 fires from the controller's deck.
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toContain(s.inst("recovered").instanceId);
  });

  it("digivolves from a Lv.5 [Witchelny]-text source for 3 and refuses an off-colour plain Lv.5", async () => {
    const legal = setupEngine({
      0: {
        battleArea: [{ card: WITCHELNY_LV5, as: "base" }],
        hand: [{ card: CARD_ID, as: "dynasmon" }],
        deck: [{ card: "BT1-010", as: "evolutionDraw" }, "BT1-012"],
        security: ["BT1-013"],
      },
      1: { deck: ["BT1-011"] },
    });
    legal.state.memory = 8;
    await legal.ready();
    const baseInstanceId = legal.perm("base").topCard.instanceId;

    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("dynasmon").instanceId,
        // Every printed [Witchelny]-text Lv.5 in the catalog is Yellow, so the alternate header and
        // the printed Yellow EvoCost always both match on this card; the flag is how a client names
        // the cheaper header route.
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("base").topCard.instanceId === legal.inst("dynasmon").instanceId);
    expect(legal.state.memory).toBe(5);
    expect(legal.perm("base").stack.map((card) => card.instanceId)).toEqual([baseInstanceId]);

    const illegal = setupEngine({
      0: {
        battleArea: [{ card: OFF_COLOUR_LV5, as: "base" }],
        hand: [{ card: CARD_ID, as: "dynasmon" }],
        deck: ["BT1-010"],
        security: ["BT1-013"],
      },
      1: { deck: ["BT1-011"] },
    });
    illegal.state.memory = 8;
    await illegal.ready();
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("base").permanentId,
        instanceId: illegal.inst("dynasmon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(illegal.state.memory).toBe(8);
  });

  it("plays through Assembly -5 with Lv.5 × Lv.4 × Lv.3 trash materials", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "dynasmon" }],
          trash: [
            { card: WITCHELNY_LV5, as: "lv5" },
            { card: WITCHELNY_LV4, as: "lv4" },
            { card: WITCHELNY_LV3, as: "lv3" },
          ],
          deck: ["BT1-010", "BT1-012"],
          security: ["BT1-013", "BT1-011", "BT1-012", "BT1-010", "BT1-009"],
        },
        1: { deck: ["BT1-011"], security: ["BT1-013"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("dynasmon").instanceId,
        assembly: {
          materialInstanceIds: [s.inst("lv5").instanceId, s.inst("lv4").instanceId, s.inst("lv3").instanceId],
        },
      } as never),
    ).toEqual({ ok: true });
    await settle(() => {
      const permanent = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === CARD_ID);
      return permanent?.stack.length === 3;
    });
    await settle();

    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === CARD_ID)!;
    expect(played.stack.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining([WITCHELNY_LV5, WITCHELNY_LV4, WITCHELNY_LV3]),
    );
    // Printed play cost 12 reduced by 5 = 7, paid from 8.
    expect(s.state.memory).toBe(1);
  });

  it("＜Blocker＞ intercepts a real attack declared at the player", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "dynasmon" }],
          deck: ["BT1-010", "BT1-012"],
          security: ["BT1-013", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT9-035", as: "attacker", dp: 20_000 }],
          deck: ["BT1-011", "BT1-014"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = 1;
    const securityBefore = s.state.players[0]!.security.length;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("dynasmon").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    await settle();

    // The block happened: the attack never reached security, and the 12000 blocker lost the battle
    // to the 20000 attacker instead.
    expect(s.state.players[0]!.security).toHaveLength(securityBefore);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain(CARD_ID);
  });

  it("＜Raid＞ switches the attack onto their Digimon and ＜Piercing＞ carries the excess to security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "dynasmon" }],
          deck: ["BT1-010", "BT1-012"],
          // 5 cards: after the [When Attacking] trash the stack is 4, so the "3 or fewer" tails of
          // BOTH printed clauses stay shut and this test is only about the two keywords.
          security: ["BT1-013", "BT1-011", "BT1-012", "BT1-010", "BT1-009"],
        },
        1: {
          battleArea: [{ card: BIG_VICTIM, as: "victim" }],
          deck: ["BT1-011", "BT1-014"],
          security: ["BT1-013", "BT1-011"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("dynasmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle();

    // ＜Raid＞ redirected an attack that was DECLARED at the player onto their only unsuspended
    // Digimon...
    expect(s.events.some((event) => event.kind === "attackDeclared" && event.target.kind === "player")).toBe(true);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain(BIG_VICTIM);
    // ...and ＜Piercing＞ then sent the surplus through as a security check.
    expect(s.state.players[1]!.security).toHaveLength(1);
    // The own-stack tail never opened: 5 - 1 (the [When Attacking] trash) = 4.
    expect(s.state.players[0]!.security).toHaveLength(4);
  });

  it("gains the +10000 DP even with an EMPTY security stack: the trash is an action, not a cost", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "dynasmon" }], deck: ["BT1-010", "BT1-012"], security: [] },
        1: { deck: ["BT1-011"], security: [] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("dynasmon"));
    await settle();

    expect(s.perm("dynasmon").currentDP).toBe(getCardDefinition(CARD_ID)!.dp! + 10000);
    // Nothing to trash on either side; the empty stacks simply no-op.
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });

  // "until your opponent's turn ends" spans two turn boundaries when the clause resolves on the
  // controller's own turn: it must survive the controller's own turn end and expire at the
  // opponent's. Each boundary needs its own engine; a hand-laid turn cannot be chained.
  it.each([
    ["the +10000 DP survives the controller's own turn end", 0 as const, 22_000],
    ["the +10000 DP expires at the opponent's turn end", 1 as const, 12_000],
  ])("%s", async (_label, turnSeat, expectedDP) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "dynasmon" }],
          deck: ["BT1-010", "BT1-012"],
          security: ["BT1-013", "BT1-011", "BT1-012", "BT1-010", "BT1-009"],
        },
        1: { deck: ["BT1-011"], security: ["BT1-013", "BT1-011"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("dynasmon"));
    await settle();
    expect(s.perm("dynasmon").currentDP).toBe(22_000);

    s.state.turnSeat = turnSeat;
    await advance(s.engine).runTurn(turnSeat);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("dynasmon").currentDP).toBe(expectedDP);
  });

  it("holds the ＜Recovery +1＞ gate at 4 security and spends the watcher's own once-per-turn", async () => {
    const s = setupEngine(
      {
        0: {
          // Suspended: this scenario is about the security removals, not about blocking.
          battleArea: [{ card: CARD_ID, as: "dynasmon", suspended: true }],
          deck: [{ card: "BT1-012", as: "recovered" }, "BT1-010"],
          security: ["BT1-013", "BT1-011", "BT1-012", "BT1-010", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT9-035", as: "attacker", dp: 20_000 },
            { card: "BT1-019", as: "secondAttacker", dp: 20_000 },
            { card: BIG_VICTIM, as: "victim" },
          ],
          deck: ["BT1-011", "BT1-014"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: [] },
    );
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 4);
    await settle();

    // The -12000 target is a free choice, so measure the whole opposing board: 20000 + 20000 +
    // 13000 = 53000 printed/seeded, minus exactly one 12000 debuff.
    const opposingDP = () => s.state.players[1]!.battleArea.reduce((total, { currentDP }) => total + currentDP, 0);

    // 4 security left ⇒ the "3 or fewer" tail is shut, so the -12000 landed but Recovery did not.
    expect(opposingDP()).toBe(53_000 - 12_000);
    expect(s.state.players[0]!.security).toHaveLength(4);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toContain(s.inst("recovered").instanceId);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 3);
    await settle();

    // A second removal in the SAME turn: the [Once Per Turn] watcher is spent, so no further
    // -12000 and no Recovery even though the gate would now hold at 3.
    expect(opposingDP()).toBe(53_000 - 12_000);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toContain(s.inst("recovered").instanceId);
  });

  it("pays the printed Yellow/Red EvoCost of 4 from a Lv.5 that prints no [Witchelny] token", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: PLAIN_LV5, as: "base" }],
        hand: [{ card: CARD_ID, as: "dynasmon" }],
        deck: [{ card: "BT1-010", as: "evolutionDraw" }, "BT1-012"],
        security: ["BT1-013"],
      },
      1: { deck: ["BT1-011"] },
    });
    s.state.memory = 8;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("dynasmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("dynasmon").instanceId);

    // The alternate header needs [Witchelny] in the source's text, so this Red Lv.5 pays the
    // printed 4, not the header's 3.
    expect(s.state.memory).toBe(4);
  });

  it.each([
    // Right levels, but the Lv.5 slot's card prints no [Witchelny] token.
    ["a material without the [Witchelny] token", [PLAIN_LV5, WITCHELNY_LV4, WITCHELNY_LV3]],
    // The header fixes a level per slot, so a Lv.5 in the Lv.3 slot is refused.
    ["the wrong level in a slot", [WITCHELNY_LV5, WITCHELNY_LV4, WITCHELNY_LV5]],
  ])("rejects Assembly with %s", (_why, materials) => {
    const s = setupEngine({
      0: {
        hand: [{ card: CARD_ID, as: "dynasmon" }],
        trash: materials.map((card, index) => ({ card, as: `material${index}` })),
        deck: ["BT1-010"],
        security: ["BT1-013"],
      },
      1: { deck: ["BT1-011"] },
    });
    s.state.memory = 8;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("dynasmon").instanceId,
        assembly: {
          materialInstanceIds: materials.map((_card, index) => s.inst(`material${index}`).instanceId),
        },
      } as never),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });
});
