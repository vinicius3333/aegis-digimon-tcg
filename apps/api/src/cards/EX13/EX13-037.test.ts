import { assemblyRequirementFor, digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX13-037.js";
import "../index.js";

const CARD_ID = "EX13-037";
const WITCHELNY_LV5 = "BT18-039";
const WITCHELNY_LV4 = "BT18-036";
const WITCHELNY_LV3 = "BT18-030";
const PLAIN_LV5 = "BT1-020";
const OFF_COLOUR_LV5 = "BT1-038";
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
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("Q7327: rechecks the gate after trashing from four to three before security-removal reactions", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "dynasmon" }],
          deck: ["BT1-010", "BT1-012"],
          security: ["BT1-013", "BT1-011", "BT1-012", "BT1-010"],
        },
        1: { deck: ["BT1-011"], security: [{ card: "BT1-013", as: "theirTop" }, "BT1-011"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("dynasmon"));
    await settle();

    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-013"]);
    // Dynasmon's own watcher recovers after the complete On Play effect resolves.
    expect(s.state.players[0]!.security).toHaveLength(4);
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

    expect(s.state.players[0]!.security).toHaveLength(4);
    expect(s.state.players[0]!.trash).toHaveLength(1);
    expect(s.perm("dynasmon").currentDP).toBe(getCardDefinition(CARD_ID)!.dp! + 10000);

    s.state.turnSeat = 0;
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 0;
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("dynasmon"));
    await settle();
    expect(s.state.players[0]!.trash).toHaveLength(2);
  });

  it("Q7328/Q7329: resolves [Security] first, finishes recovery, then rule-deletes the 0 DP target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "dynasmon", suspended: true }],
          deck: [{ card: "BT1-012", as: "recovered" }, "BT1-010"],
          security: ["BT10-087"],
        },
        1: {
          battleArea: [{ card: "BT9-035", as: "attacker", dp: 12_000 }],
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

    const triggerOrder = s.events
      .filter((event) => event.kind === "effectTriggered")
      .map((event) => `${event.sourceCardId}/${event.timing}`);
    expect(triggerOrder).toContain("BT10-087/OnPlay");
    expect(triggerOrder).toContain("EX13-037/whenSecurityRemoved");
    expect(triggerOrder.indexOf("BT10-087/OnPlay")).toBeLessThan(triggerOrder.indexOf("EX13-037/whenSecurityRemoved"));
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toContain(s.inst("recovered").instanceId);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("attacker").instanceId);
  });

  it("[All Turns] also fires when the OPPONENT's security stack is the one removed from", async () => {
    const s = setupEngine(
      {
        0: {
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
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toContain(s.inst("recovered").instanceId);
  });

  it("Q7325: matches [Witchelny] anywhere in a Lv.5 card's text for the alternate evolution", async () => {
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

    expect(s.events.some((event) => event.kind === "attackDeclared" && event.target.kind === "player")).toBe(true);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain(BIG_VICTIM);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(4);
  });

  it("Q7326: resolves the remaining effect with an empty security stack because trashing is not a cost", async () => {
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
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });

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

    const opposingDP = () => s.state.players[1]!.battleArea.reduce((total, { currentDP }) => total + currentDP, 0);

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

    expect(s.state.memory).toBe(4);
  });

  it.each([
    ["a material without the [Witchelny] token", [PLAIN_LV5, WITCHELNY_LV4, WITCHELNY_LV3]],
    ["the wrong level in a slot", [WITCHELNY_LV5, WITCHELNY_LV4, WITCHELNY_LV5]],
  ])("Q7330: rejects Assembly when each material does not independently satisfy %s", (_why, materials) => {
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
