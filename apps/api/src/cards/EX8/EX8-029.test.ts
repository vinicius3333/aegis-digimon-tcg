import {
  dnaDigivolutionRequirementsFor as dnaRequirementsFor,
  getCardDefinition as cardDefinition,
} from "@aegis/shared";
import { dnaDigivolveCostFor } from "../../engine/effects/primitives.js";
import { compiled as compiledDna } from "./EX8-029.js";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { drainMicrotasks, settle, setupEngine } from "../../engine/testkit/harness.js";
import type { BoardSpec, EngineSetup, PermanentSpec, SeatSpec } from "../../engine/testkit/harness.js";
import { registerIrCard } from "../../engine/effects/interpreter.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter/compiledCards.js";
import { EffectDuration, getCardDefinition, type CompiledCard } from "@aegis/shared";
import "./index.js";
import "../BT2/BT2-107.js";
import "../BT14/BT14-075.js";
import "../BT18/BT18-049.js";
import "../BT18/BT18-066.js";
import "../BT24/BT24-013.js";
import "../EX4/EX4-018.js";
import "../EX5/EX5-059.js";
import "../BT1/BT1-055.js";
import "../BT1/BT1-070.js";
import "../P/P-134.js";
import "../EX10/EX10-045.js";
import { compiled } from "./EX8-029.js";

describe("EX8-029", () => {
  it("matches committed catalog identity and every printed text field", () => {
    expect(getCardDefinition("EX8-029")).toMatchObject({
      cardId: "EX8-029",
      nameEn: "Aegisdramon",
      colors: ["Blue", "Black", "Yellow"],
      kinds: ["Digimon"],
      level: 7,
      playCost: 15,
      dp: 15000,
      evoCosts: [
        { color: "Blue", level: 6, memoryCost: 5 },
        { color: "Black", level: 6, memoryCost: 5 },
        { color: "Yellow", level: 6, memoryCost: 5 },
      ],
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Cyborg", "DS", "Aquatic"],
      effectText:
        "[DNA Digivolve] Blue/purple Lv.6 + black/yellow Lv.6: Cost 0\n[DNA Digivolve] [Plesiomon] + Lv.5 w/[Seadramon] in name: Cost 0\n[When Digivolving] Return up to 14 play cost's total worth of your opponent's Digimon to the bottom of the deck. If DNA digivolving, you may play up to 12 play cost's total worth of [DS]\u00a0trait cards from this Digimon's digivolution cards without paying the costs.\n[All Turns] While you have 1 or more memory, none of your [DS]\u00a0trait Digimon are affected by your opponent's Digimon's effects. While you have 1 or less, none of your opponent's Digimon can activate [On Play] effects.\n[Rule] Trait: Has the [Aquatic] type.",
    });
    expect(getCardDefinition("EX8-029")?.inheritedEffectText).toBeUndefined();
  });

  it("returns opposing Digimon up to total play cost 14 and plays DS cards from digivolution cards when DNA digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "Return",
      to: "deckBottom",
      target: { totalPlayCostBudget: 14, upTo: true },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[1]).toMatchObject({
      kind: "PlayMultiple",
      totalCost: 12,
      from: ["digivolutionCards"],
      filter: { hostFilter: { isSelfRef: true } },
      condition: { kind: "isDnaDigivolving" },
    });
  });
  it("grants DS immunity with memory and restricts opposing On Play effects at low memory, plus Aquatic", () => {
    const allTurns = compiled.effects?.filter((entry) => entry.trigger === "AllTurns") ?? [];
    expect(allTurns).toHaveLength(2);
    expect(allTurns[0]?.actions).toMatchObject([
      { kind: "GrantStatic", grant: "immuneToOpponentDigimonEffects", condition: { kind: "memoryAtLeast", value: 1 } },
    ]);
    expect(allTurns[1]).toMatchObject({
      condition: { kind: "memoryAtMost", value: 1, controller: "mine" },
      actions: [
        {
          kind: "DisableTimingEffect",
          whileMatchesTargetFilter: true,
          timings: ["onPlay"],
          duration: "permanent",
          target: { count: "all", filter: { controller: "opponent", kind: ["Digimon"] } },
        },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")?.actions[0]).toMatchObject({
      kind: "GrantStatic",
      tokens: ["Aquatic"],
    });
  });

  it("disables opposing On Play effects only at 1 or less memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-029", as: "aegisdramon" }] },
      1: { battleArea: [{ card: "AD1-001", as: "opponent" }] },
    });
    await s.ready();

    s.state.memory = 1;
    await advance(s.engine).recompute();
    await settle(() => observe(s.engine).timingEffectDisabled(s.perm("opponent"), "onPlay"));
    expect(observe(s.engine).timingEffectDisabled(s.perm("opponent"), "onPlay")).toBe(true);

    s.state.memory = 2;
    await advance(s.engine).recompute();
    expect(observe(s.engine).timingEffectDisabled(s.perm("opponent"), "onPlay")).toBe(false);
  });

  it("blocks a real opposing On Play draw at low memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-029", as: "aegisdramon" }] },
      1: {
        hand: [{ card: "BT1-029", as: "gabumon" }],
        deck: ["AD1-001", "AD1-002"],
      },
    });
    await s.ready();

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).recompute();
    const deckBefore = s.state.players[1]!.deck.length;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gabumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-029"));

    expect(s.state.players[1]!.deck).toHaveLength(deckBefore);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-029")).toBe(true);
  });

  it("prevents an opponent Digimon effect from suspending DS while at least 1 memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX8-029", as: "aegisdramon" },
          { card: "EX8-020", as: "ds" },
          { card: "AD1-001", as: "nonDs" },
        ],
      },
      1: { battleArea: [{ card: "BT1-029", as: "opponent" }] },
    });
    await s.ready();
    s.state.memory = 1;
    await advance(s.engine).recompute();

    const driver = advance(s.engine);
    driver.verb.enterEffectResolution(1, ["Digimon"], s.perm("opponent").permanentId);
    await driver.verb.suspend([s.perm("ds").permanentId, s.perm("nonDs").permanentId], 1);
    driver.verb.leaveEffectResolution();

    expect(s.perm("ds").isSuspended).toBe(false);
    expect(s.perm("nonDs").isSuspended).toBe(true);
  });

  it("returns real opposing Digimon within the 14-cost budget and leaves an over-budget target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-026", as: "base" }],
          hand: [{ card: "EX8-029", as: "aegisdramon" }],
          deck: ["AD1-001", "AD1-002"],
        },
        1: {
          battleArea: [
            { card: "BT1-024", as: "sevenA" },
            { card: "BT1-024", as: "sevenB" },
            { card: "EX8-029", as: "overBudget" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 5;
    await s.ready();
    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("aegisdramon").instanceId,
    });
    expect(result).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.deck.some((card) => card.instanceId === s.inst("sevenA").instanceId));

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([
      s.inst("overBudget").instanceId,
    ]);
    expect(s.state.players[1]!.deck.slice(-2).map((card) => card.cardId)).toEqual(["BT1-024", "BT1-024"]);
  });

  it("evaluates both memory thresholds from Aegisdramon's side off-turn (Q3898–Q3899)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX8-029", as: "aegisdramon" },
          { card: "EX8-020", as: "ds" },
          { card: "AD1-001", as: "nonDs" },
        ],
      },
      1: { battleArea: [{ card: "AD1-001", as: "opponent" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = -1;
    await advance(s.engine).recompute();

    expect(observe(s.engine).timingEffectDisabled(s.perm("opponent"), "onPlay")).toBe(true);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("ds"), "beAffected", "Digimon")).toBe(true);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("nonDs"), "beAffected", "Digimon")).toBe(false);

    s.state.memory = 0;
    await advance(s.engine).recompute();
    expect(observe(s.engine).timingEffectDisabled(s.perm("opponent"), "onPlay")).toBe(true);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("ds"), "beAffected", "Digimon")).toBe(false);

    s.state.memory = -2;
    await advance(s.engine).recompute();
    expect(observe(s.engine).timingEffectDisabled(s.perm("opponent"), "onPlay")).toBe(false);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("ds"), "beAffected", "Digimon")).toBe(true);
  });

  it("plays DS cards only from the DNA result's own sources", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX8-026",
              as: "metal",
              under: [
                { card: "EX8-020", as: "own" },
                { card: "EX8-024", as: "middle" },
              ],
            },
          ],
          breeding: { card: "BT1-037", as: "other", under: [{ card: "EX8-017", as: "foreign" }] },
          hand: [
            { card: "EX8-027", as: "plesiomon" },
            { card: "EX8-029", as: "aegis" },
          ],
        },
        1: { security: 1 },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("plesiomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("own").instanceId),
    );

    expect(s.state.players[0]!.breeding?.stack.some((card) => card.instanceId === s.inst("foreign").instanceId)).toBe(
      true,
    );
  });
});

describe("EX8-029 DNA requirement", () => {
  it("exposes both printed DNA routes: the color pairs and [Plesiomon] + Lv.5 with [Seadramon] in name", () => {
    expect(dnaRequirementsFor("EX8-029")).toEqual(compiledDna.dnaDigivolveRequirement);
    expect(compiledDna.dnaDigivolveRequirement).toContainEqual({
      cost: 0,
      materials: [{ namesExact: ["Plesiomon"] }, { level: 5, names: ["Seadramon"] }],
    });
    expect(compiledDna.dnaDigivolveRequirement).toHaveLength(5);
    const evolving = cardDefinition("EX8-029")!;
    const plesiomon = cardDefinition("EX8-027")!;
    const megaSeadramon = cardDefinition("BT2-029")!;
    expect(dnaDigivolveCostFor(evolving, [plesiomon, megaSeadramon])).toBe(0);
    expect(dnaDigivolveCostFor(evolving, [cardDefinition("BT15-032")!, megaSeadramon])).toBeUndefined();
    expect(dnaDigivolveCostFor(evolving, [plesiomon, cardDefinition("BT1-063")!])).toBe(0);
  });

  it("publicly DNA digivolves through Plesiomon + MegaSeadramon and rejects Plesiomon X", async () => {
    const legal = setupEngine({
      0: {
        battleArea: [
          { card: "EX8-027", as: "plesiomon" },
          { card: "BT2-029", as: "megaSeadramon" },
        ],
        hand: [{ card: "EX8-029", as: "aegisdramon" }],
      },
    });
    legal.state.memory = 10;
    await legal.ready();
    expect(
      legal.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [legal.perm("plesiomon").permanentId, legal.perm("megaSeadramon").permanentId],
        instanceId: legal.inst("aegisdramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.state.players[0]!.battleArea.length === 1);
    expect(legal.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("EX8-029");
    expect(legal.state.players[0]!.battleArea[0]!.stack.map(({ cardId }) => cardId)).toEqual(["BT2-029", "EX8-027"]);
    expect(legal.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual([]);
    expect(legal.state.memory).toBe(10);

    const illegal = setupEngine({
      0: {
        battleArea: [
          { card: "BT15-032", as: "plesiomonX" },
          { card: "BT2-029", as: "megaSeadramon" },
        ],
        hand: [{ card: "EX8-029", as: "aegisdramon" }],
      },
    });
    illegal.state.memory = 10;
    await illegal.ready();
    expect(
      illegal.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [illegal.perm("plesiomonX").permanentId, illegal.perm("megaSeadramon").permanentId],
        instanceId: illegal.inst("aegisdramon").instanceId,
      }),
    ).toMatchObject({ ok: false, reason: "invalid-evolution" });
    expect(illegal.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT15-032", "BT2-029"]);
    expect(illegal.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX8-029"]);
    expect(illegal.state.memory).toBe(10);
  });
});

describe("EX8-029 Aegisdramon — KB Q&A rulings", () => {
  const filler = ["BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010"];

  function aegisdramonBoard(opponent: SeatSpec, lockPresent = true, ownOthers: PermanentSpec[] = []): BoardSpec {
    return {
      0: {
        battleArea: [...(lockPresent ? [{ card: "EX8-029", as: "aegisdramon" }] : []), ...ownOthers],
        security: ["BT1-010"],
        deck: filler,
      },
      1: { deck: filler, ...opponent },
    };
  }

  async function startSeatOneTurn(s: EngineSetup, memory = 10): Promise<void> {
    s.state.turnSeat = 1;
    s.state.memory = memory;
    await s.ready();
    await advance(s.engine).recompute();
  }

  async function seatOnePlays(s: EngineSetup, alias: string): Promise<void> {
    const instanceId = s.inst(alias).instanceId;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === instanceId));
    await settle(() => s.state.pendingDecision === undefined);
    await drainMicrotasks();
  }

  it("keeps an opposing Digimon's [On Play] from activating when it is played at 1 or less memory (Q3900)", async () => {
    const devimonBoard = aegisdramonBoard({ hand: [{ card: "BT14-075", as: "devimon" }] });

    const locked = setupEngine(devimonBoard, { autoSelectCards: true });
    await startSeatOneTurn(locked, 10);
    await seatOnePlays(locked, "devimon");
    expect(locked.state.memory).toBe(3);
    expect(locked.state.players[1]!.deck).toHaveLength(filler.length);

    const unlocked = setupEngine(devimonBoard, { autoSelectCards: true });
    await startSeatOneTurn(unlocked, 5);
    await seatOnePlays(unlocked, "devimon");
    expect(unlocked.state.memory).toBe(-2);
    expect(unlocked.state.players[1]!.deck).toHaveLength(filler.length - 3);
  });

  it("still lets an opposing [On Play] [When Attacking] effect activate on the attack timing (Q3901)", async () => {
    const s = setupEngine(aegisdramonBoard({ battleArea: [{ card: "BT14-075", as: "devimon" }] }), {
      autoSelectCards: true,
    });
    await startSeatOneTurn(s);
    expect(observe(s.engine).timingEffectDisabled(s.perm("devimon"), "onPlay")).toBe(true);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("devimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.deck).toHaveLength(filler.length - 3);
  });

  it("stops an opposing Digimon from activating its own [On Play] through an effect (Q3902)", async () => {
    const dobermonBoard: SeatSpec = {
      battleArea: [{ card: "BT14-071", under: ["BT4-082"], as: "dobermonBase" }],
      hand: [{ card: "EX5-059", as: "dobermonX" }, "BT1-010"],
    };
    const digivolveIntoDobermonX = async (s: EngineSetup) => {
      expect(
        s.engine.applyIntent(1, {
          type: "digivolve",
          permanentId: s.perm("dobermonBase").permanentId,
          instanceId: s.inst("dobermonX").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("dobermonBase").topCard.cardId === "EX5-059" && s.state.pendingDecision === undefined);
      await drainMicrotasks();
    };

    const locked = setupEngine(aegisdramonBoard(dobermonBoard), { autoSelectCards: true, autoAcceptOptional: true });
    await startSeatOneTurn(locked);
    await digivolveIntoDobermonX(locked);
    expect(locked.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-010");
    expect(observe(locked.engine).hasKeyword(locked.perm("dobermonBase"), "Retaliation")).toBe(false);

    const unlocked = setupEngine(aegisdramonBoard(dobermonBoard, false), {
      autoSelectCards: true,
      autoAcceptOptional: true,
    });
    await startSeatOneTurn(unlocked);
    await digivolveIntoDobermonX(unlocked);
    expect(observe(unlocked.engine).hasKeyword(unlocked.perm("dobermonBase"), "Retaliation")).toBe(true);
  });

  it("stops an opposing Digimon from activating another card's [On Play] as its own effect (Q3903)", async () => {
    const sephirothmonBoard: SeatSpec = {
      battleArea: [
        { card: "BT1-030", as: "target" },
        { card: "BT18-064", as: "sephirothmonBase" },
      ],
      hand: [{ card: "BT18-066", as: "sephirothmon" }],
      trash: [{ card: "BT18-049", as: "hybrid", faceUp: true }],
    };
    const targetDpAfterSephirothmon = async (lockPresent: boolean) => {
      const preferred: string[] = [];
      const s = setupEngine(aegisdramonBoard(sephirothmonBoard, lockPresent), {
        autoSelectCards: true,
        autoAcceptOptional: true,
        preferInstanceIds: preferred,
      });
      await startSeatOneTurn(s);
      preferred.push(s.perm("target").permanentId, s.perm("target").topCard.instanceId);
      const dpBefore = s.perm("target").currentDP;
      expect(
        s.engine.applyIntent(1, {
          type: "digivolve",
          permanentId: s.perm("sephirothmonBase").permanentId,
          instanceId: s.inst("sephirothmon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() =>
        s.perm("sephirothmonBase").stack.some((card) => card.instanceId === s.inst("hybrid").instanceId),
      );
      await settle(() => s.state.pendingDecision === undefined);
      await drainMicrotasks();
      return s.perm("target").currentDP - dpBefore;
    };

    expect(await targetDpAfterSephirothmon(true)).toBe(0);
    expect(await targetDpAfterSephirothmon(false)).toBe(3000);
  });

  it("lets an unaffected card activate a locked Digimon's [On Play] as an effect of itself (Q3904)", async () => {
    // No printed card lets a non-Digimon card borrow a battle-area Digimon's [On Play]
    // "as an effect of this card", so an Option probe stands in for one.
    const optionId = "BT2-107";
    const printedOption = runtimeCompiledCard(optionId);
    if (printedOption === undefined) throw new Error(`Expected ${optionId} to be registered`);
    const borrowingOption: CompiledCard = {
      effects: [
        {
          trigger: "Main",
          actions: [
            {
              kind: "ActivateEffect",
              asEffectOf: "this card",
              target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
              effectType: "OnPlay",
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    };
    registerIrCard(optionId, borrowingOption);
    try {
      const s = setupEngine(
        aegisdramonBoard({
          battleArea: [{ card: "BT14-075", as: "devimon" }],
          hand: [{ card: optionId, as: "option" }],
        }),
        { autoSelectCards: true },
      );
      await startSeatOneTurn(s);
      expect(observe(s.engine).timingEffectDisabled(s.perm("devimon"), "onPlay")).toBe(true);
      const optionInstanceId = s.inst("option").instanceId;
      expect(s.engine.applyIntent(1, { type: "playCard", instanceId: optionInstanceId })).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === optionInstanceId));
      await settle(() => s.state.pendingDecision === undefined);
      expect(s.state.players[1]!.deck).toHaveLength(filler.length - 3);
    } finally {
      registerIrCard(optionId, printedOption);
    }
  });

  it("does not let a locked [On Play] pay just its 'by trashing' cost (Q3905)", async () => {
    const fugamonBoard: SeatSpec = {
      hand: [
        { card: "BT24-013", as: "fugamon" },
        { card: "BT1-010", as: "fodder" },
      ],
    };
    const victim: PermanentSpec = { card: "BT20-010", as: "victim" };
    const afterFugamon = async (lockPresent: boolean) => {
      const s = setupEngine(aegisdramonBoard(fugamonBoard, lockPresent, [victim]), {
        autoSelectCards: true,
        autoAcceptOptional: true,
      });
      await startSeatOneTurn(s);
      await seatOnePlays(s, "fugamon");
      return {
        fodderInHand: s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("fodder").instanceId),
        victimInPlay: s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-010"),
      };
    };

    expect(await afterFugamon(true)).toEqual({ fodderInHand: true, victimInPlay: true });
    expect(await afterFugamon(false)).toEqual({ fodderInHand: false, victimInPlay: false });
  });

  it("does not spend a shared [Once Per Turn] when the locked [On Play] cannot activate (Q3906)", async () => {
    const tuwarmonBoard: SeatSpec = {
      battleArea: [{ card: "EX10-045", under: ["BT1-010", "BT1-010"], as: "bagraHost" }],
      hand: [{ card: "EX10-045", as: "tuwarmon" }],
    };
    const hostStackAfterPlayAndAttack = async (lockPresent: boolean) => {
      const s = setupEngine(
        aegisdramonBoard(tuwarmonBoard, lockPresent, lockPresent ? [] : [{ card: "BT1-024", as: "aegisdramon" }]),
        { autoSelectCards: true, autoAcceptOptional: true },
      );
      await startSeatOneTurn(s);
      await seatOnePlays(s, "tuwarmon");
      const afterPlay = s.perm("bagraHost").stack.length;
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("tuwarmon").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => observe(s.engine).blockingSeat() === 0);
      const afterAttack = s.perm("bagraHost").stack.length;
      // Tuwarmon's ＜Collision＞ forces the only seat-0 Digimon to block.
      expect(
        s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("aegisdramon").permanentId }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
      await drainMicrotasks();
      return { afterPlay, afterAttack };
    };

    expect(await hostStackAfterPlayAndAttack(true)).toEqual({ afterPlay: 2, afterAttack: 1 });
    expect(await hostStackAfterPlayAndAttack(false)).toEqual({ afterPlay: 1, afterAttack: 1 });
  });

  function immunityBoard(opponentHand: string) {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-029", as: "aegisdramon" },
            { card: "EX8-020", as: "ds" },
            { card: "BT1-016", as: "nonDs" },
          ],
          deck: filler,
        },
        1: {
          hand: [{ card: opponentHand, as: "played" }],
          battleArea: [{ card: "BT1-009", as: "opponentDigimon" }],
          security: ["BT1-009", "BT1-009"],
          deck: filler,
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true, preferInstanceIds: preferred },
    );
    return { s, preferred };
  }

  /** Seat 1 plays its hand card so the payment leaves seat 0 with 2 memory: DS immunity on, [On Play] lock off. */
  async function seatOnePlaysLeavingTwoMemory(s: EngineSetup, preferred: string[], targetAlias: string) {
    preferred.push(s.perm(targetAlias).topCard.instanceId);
    await startSeatOneTurn(s, (getCardDefinition(s.inst("played").cardId)!.playCost ?? 0) - 2);
    await seatOnePlays(s, "played");
    expect(s.state.memory).toBe(-2);
  }

  function offeredToSeatOne(s: EngineSetup, alias: string): boolean {
    const ids = [s.perm(alias).permanentId, s.perm(alias).topCard.instanceId];
    return s.decisions
      .filter(({ seat, req }) => seat === 1 && req.kind === "chooseTargets")
      .flatMap(({ req }) => req.options?.candidateInstanceIds ?? [])
      .some((id) => ids.includes(id));
  }

  async function seatZeroAttacksWith(s: EngineSetup, alias: string, memory: number) {
    s.state.turnSeat = 0;
    s.state.memory = memory;
    await advance(s.engine).recompute();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm(alias).permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
  }

  it("keeps an opposing Digimon's suspend and -3000 DP effects off a DS Digimon (Q3907)", async () => {
    const afterKuwagamon = async (targetAlias: string) => {
      const { s, preferred } = immunityBoard("BT1-070");
      await seatOnePlaysLeavingTwoMemory(s, preferred, targetAlias);
      return s.perm(targetAlias).isSuspended;
    };
    expect(await afterKuwagamon("ds")).toBe(false);
    expect(await afterKuwagamon("nonDs")).toBe(true);

    const dpLossFromAngemon = async (targetAlias: string) => {
      const { s, preferred } = immunityBoard("BT1-055");
      const before = s.perm(targetAlias).currentDP;
      await seatOnePlaysLeavingTwoMemory(s, preferred, targetAlias);
      return before - s.perm(targetAlias).currentDP;
    };
    expect(await dpLossFromAngemon("ds")).toBe(0);
    expect(await dpLossFromAngemon("nonDs")).toBe(3000);
  });

  it("lets the opponent choose the unaffected DS Digimon, and the choice does nothing (Q3908)", async () => {
    const { s, preferred } = immunityBoard("BT1-070");
    await seatOnePlaysLeavingTwoMemory(s, preferred, "ds");

    expect(offeredToSeatOne(s, "ds")).toBe(true);
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.isSuspended)).toHaveLength(0);
  });

  it("can be given an opponent's <Security A. -1> without being considered to have it (Q3909)", async () => {
    const securityAttackAfterShoemon = async (targetAlias: string) => {
      const { s, preferred } = immunityBoard("P-134");
      await seatOnePlaysLeavingTwoMemory(s, preferred, targetAlias);
      expect(offeredToSeatOne(s, targetAlias)).toBe(true);
      return observe(s.engine).keywordAmount(s.perm(targetAlias), "SecurityAttack");
    };
    expect(await securityAttackAfterShoemon("ds")).toBe(0);
    expect(await securityAttackAfterShoemon("nonDs")).toBe(-1);
  });

  it("stops an opposing DP reduction already on the Digimon as soon as it becomes unaffected (Q3910)", async () => {
    const { s } = immunityBoard("BT1-070");
    await startSeatOneTurn(s, 3);
    const driver = advance(s.engine);
    driver.verb.enterEffectResolution(1, ["Digimon"], s.perm("opponentDigimon").permanentId);
    await driver.verb.modifyDP(s.perm("ds").permanentId, -3000, EffectDuration.UntilOpponentTurnEnd);
    driver.verb.leaveEffectResolution();
    expect(s.perm("ds").currentDP).toBe(1000);

    s.state.memory = -1;
    await advance(s.engine).recompute();
    expect(s.perm("ds").currentDP).toBe(4000);
  });

  it("applies an opposing effect given during the immunity as soon as the immunity ends (Q3911)", async () => {
    const checksAfterShoemon = async (seatZeroMemory: number) => {
      const { s, preferred } = immunityBoard("P-134");
      await seatOnePlaysLeavingTwoMemory(s, preferred, "ds");
      await seatZeroAttacksWith(s, "ds", seatZeroMemory);
      return 2 - s.state.players[1]!.security.length;
    };
    expect(await checksAfterShoemon(1)).toBe(1);
    expect(await checksAfterShoemon(0)).toBe(0);
  });

  it("does not trigger an opponent-given [When Attacking] effect while the DS Digimon is unaffected (Q3912)", async () => {
    const memoryAfterAttack = async (seatZeroMemory: number) => {
      const { s, preferred } = immunityBoard("EX4-018");
      await seatOnePlaysLeavingTwoMemory(s, preferred, "ds");
      expect(offeredToSeatOne(s, "ds")).toBe(true);
      await seatZeroAttacksWith(s, "ds", seatZeroMemory);
      return s.state.memory;
    };
    expect(await memoryAfterAttack(3)).toBe(3);
    expect(await memoryAfterAttack(0)).toBe(-2);
  });
});
