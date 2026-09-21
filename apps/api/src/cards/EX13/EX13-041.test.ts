import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./EX13-041.js";
import "../BT20/BT20-040.js";
import "../BT20/BT20-045.js";
import "../BT20/BT20-027.js";

const CARD_ID = "EX13-041";
const LOCK = "unsuspendDuringOwnUnsuspendPhase";

describe("EX13-041 Groundramon", () => {
  it("matches the catalog identity and the printed clauses", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      set: "EX13",
      nameEn: "Groundramon",
      colors: ["Green", "Red"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Earth Dragon"],
      evoCosts: [
        { color: "Green", level: 4, memoryCost: 4 },
        { color: "Red", level: 4, memoryCost: 4 },
      ],
      rarity: "C",
      maxCountInDeck: 4,
    });
    const effectText = getCardDefinition(CARD_ID)?.effectText ?? "";
    expect(effectText).toContain("[Digivolve] [Coredramon]: Cost 3");
    expect(effectText).toContain("＜Fortitude＞");
    expect(effectText).toContain(
      "[On Play] [When Digivolving] Suspend 1 of your opponent's Digimon or Tamers. Then, 1 of their Digimon or Tamers can't unsuspend in their next unsuspend phase.",
    );
    expect(effectText).toContain(
      "[All Turns] This Digimon is also treated as Lv.6 [Breakdramon] for [Examon]'s DNA digivolution.",
    );
    expect((getCardDefinition(CARD_ID)?.inheritedEffectText ?? "").trim()).toBe(
      "[All Turns] [Once Per Turn] When any of your Digimon with [Dracomon] or [Examon] in their texts delete your opponent's Digimon in battle, trash their top security card.",
    );
    expect(getCardDefinition(CARD_ID)?.securityEffectText ?? "").toBe("");
  });

  it("compiles every printed clause", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toHaveLength(5);

    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Fortitude", raw: "＜Fortitude＞" }],
    });
    expect(compiled.effects[0]?.isInherited).toBeUndefined();

    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect).toMatchObject({
        actions: [
          {
            kind: "Suspend",
            target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
          },
          {
            kind: "Restrict",
            target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
            restriction: LOCK,
            duration: "untilOpponentNextUnsuspendPhase",
          },
        ],
      });
      expect(effect?.frequency).toBeUndefined();
      expect(effect?.actions[1]).not.toHaveProperty("target.sameTarget");
      expect(effect?.actions[1]).not.toHaveProperty("target.fromSelectionRef");
      expect(effect?.actions[1]).not.toHaveProperty("condition");
    }

    expect(
      compiled.effects.find((entry) => entry.trigger === "AllTurns" && entry.isInherited === undefined),
    ).toMatchObject({
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true, zone: "battleArea" }, count: 1, isSelf: true },
          grant: "name",
          tokens: ["Breakdramon"],
        },
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true, zone: "battleArea" }, count: 1, isSelf: true },
          grant: { kind: "TreatAsLevel", level: 6, context: "DNADigivolution", intoNames: ["Examon"] },
        },
      ],
    });

    const inherited = compiled.effects.find((entry) => entry.isInherited === true);
    expect(inherited).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }],
            printedTextOnly: true,
          },
          actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
        },
      ],
    });
    expect(inherited?.actions[0]).not.toHaveProperty("sourceFilter.isSelfRef");

    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["Coredramon"], cost: 3, isAlternate: true }]);
  });

  it("Q7335/Q7336: reads [Coredramon] exactly and matches either [Dracomon] or [Examon] in card text", () => {
    const coredramon = { tokens: ["Coredramon"], match: "nameExact" as const };
    expect(matchNameOrTrait({ nameEn: "Coredramon" }, coredramon)).toBe(true);
    expect(matchNameOrTrait({ nameEn: "Coredramon X" }, coredramon)).toBe(false);
    expect(matchNameOrTrait({ nameEn: "Coredramonmon" }, coredramon)).toBe(false);

    const union = { tokens: ["Dracomon", "Examon"], match: "text" as const };
    expect(matchNameOrTrait(getCardDefinition("ST1-04")!, union)).toBe(true);
    expect(matchNameOrTrait(getCardDefinition("BT20-040")!, union)).toBe(true);
    expect(matchNameOrTrait(getCardDefinition("BT20-045")!, union)).toBe(true);
    expect(matchNameOrTrait(getCardDefinition("BT1-009")!, union)).toBe(false);
    expect(matchNameOrTrait(getCardDefinition("BT1-013")!, union)).toBe(false);
  });

  it("Q7337: suspends one opposing Digimon and locks a DIFFERENT Tamer", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "groundramon" },
            { card: "BT1-009", as: "spare" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "victim" },
            { card: "BT2-084", as: "tamer" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    const victimId = s.perm("victim").permanentId;
    const tamerId = s.perm("tamer").permanentId;
    preferred.includes = (id: string) => (s.perm("victim").isSuspended ? id === tamerId : id === victimId);
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("groundramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("victim").isSuspended && observe(s.engine).isRestricted(tamerId, LOCK));

    expect(s.state.memory).toBe(3);
    expect(s.perm("victim").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(tamerId, LOCK)).toBe(true);
    expect(observe(s.engine).isRestricted(victimId, LOCK)).toBe(false);
    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(tamerId, "unsuspend")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("groundramon"), "Fortitude")).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("blocks exactly the opponent's next unsuspend phase, survives an intervening own turn, then expires", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "groundramon" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: Array(14).fill("BT1-009"),
          security: Array(4).fill("BT1-009"),
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "locked" }],
          deck: Array(14).fill("BT1-009"),
          security: Array(4).fill("BT1-009"),
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    const lockedId = s.perm("locked").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("groundramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("locked").isSuspended && observe(s.engine).isRestricted(lockedId, LOCK));
    expect(s.perm("locked").isSuspended).toBe(true);

    await advance(s.engine).verb.unsuspend([lockedId]);
    expect(s.perm("locked").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(lockedId, LOCK)).toBe(true);
    await advance(s.engine).verb.suspend([lockedId]);
    expect(s.perm("locked").isSuspended).toBe(true);

    s.state.turnSeat = 0;
    s.state.memory = 3;
    await advance(s.engine).runTurn(0);
    expect(observe(s.engine).isRestricted(lockedId, LOCK)).toBe(true);
    expect(s.perm("locked").isSuspended).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    expect(s.perm("locked").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(lockedId, LOCK)).toBe(false);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    expect(s.perm("locked").isSuspended).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("digivolves publicly from Coredramon for the printed 3 and fires the same clause", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-040", as: "coredramon" }],
          hand: [
            { card: CARD_ID, as: "groundramon" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "victim" },
            { card: "BT2-084", as: "tamer" },
          ],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true, preferInstanceIds: preferred },
    );
    const victimId = s.perm("victim").permanentId;
    const tamerId = s.perm("tamer").permanentId;
    preferred.includes = (id: string) => (s.perm("victim").isSuspended ? id === tamerId : id === victimId);
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("coredramon").permanentId,
        instanceId: s.inst("groundramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("coredramon").topCard.cardId === CARD_ID && observe(s.engine).isRestricted(tamerId, LOCK),
    );

    expect(s.state.memory).toBe(0);
    expect(s.perm("coredramon").stack.map((card) => card.cardId)).toEqual(["BT20-040"]);
    expect(s.perm("victim").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(tamerId, LOCK)).toBe(true);
    expect(observe(s.engine).isRestricted(victimId, LOCK)).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("coredramon"), "Fortitude")).toBe(true);
    expect(s.perm("coredramon").currentDP).toBe(9000);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("falls back to the printed EvoCost for a non-Coredramon level-4 source and refuses a level-3 one", async () => {
    const fallback = setupEngine(
      { 0: { battleArea: [{ card: "BT1-071", as: "vegiemon" }], hand: [{ card: CARD_ID, as: "groundramon" }] } },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    fallback.state.memory = 4;
    await fallback.ready();
    expect(
      fallback.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: fallback.perm("vegiemon").permanentId,
        instanceId: fallback.inst("groundramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => fallback.perm("vegiemon").topCard.cardId === CARD_ID);
    expect(fallback.state.memory).toBe(0);
    expect(fallback.perm("vegiemon").stack.map((card) => card.cardId)).toEqual(["BT1-071"]);

    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "monodramon" }], hand: [{ card: CARD_ID, as: "groundramon" }] },
    });
    illegal.state.memory = 5;
    await illegal.ready();
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("monodramon").permanentId,
        instanceId: illegal.inst("groundramon").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(illegal.perm("monodramon").topCard.cardId).toBe("BT1-009");
    expect(illegal.state.memory).toBe(5);
  });

  it("is treated as [Breakdramon] only while in the battle area", async () => {
    const field = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "groundramon" }] } });
    await field.ready();
    expect(observe(field.engine).grantedNames(field.perm("groundramon"))).toContain("breakdramon");
    expect(observe(field.engine).effectiveNames(field.perm("groundramon"))).toEqual(
      expect.arrayContaining(["groundramon", "breakdramon"]),
    );
    expect(getCardDefinition(CARD_ID)?.level).toBe(5);

    const breeding = setupEngine({ 0: { breeding: { card: CARD_ID, as: "egg" } } });
    await breeding.ready();
    expect(observe(breeding.engine).grantedNames(breeding.perm("egg"))).not.toContain("breakdramon");
  });

  it("fills the [Breakdramon] slot of Examon's Blast DNA from the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "groundramon", under: ["BT20-040"] }],
          hand: [
            { card: "BT20-027", as: "slayerdramon" },
            { card: "BT20-045", as: "examon" },
          ],
          security: ["BT1-010", "BT1-010"],
          deck: ["BT1-010", "BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-013", as: "attacker" }], deck: ["BT1-010"] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.memory = 3;
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const choice = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("examon").instanceId);
    expect(choice).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: choice!.instanceId,
        effectKey: choice!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-045"),
    );
    const merged = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT20-045");
    expect(merged).toBeDefined();
    expect(merged!.stack.map((card) => card.cardId)).toEqual(["BT20-027", "BT20-040", CARD_ID]);
    expect(s.state.players[0]!.hand.some((card) => ["BT20-027", "BT20-045"].includes(card.cardId))).toBe(false);
  });

  it("Q7338: does not offer Examon's Blast DNA while Groundramon is only in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-027", as: "slayerdramon" }],
          hand: [
            { card: CARD_ID, as: "handGroundramon" },
            { card: "BT20-045", as: "examon" },
          ],
          security: ["BT1-009", "BT1-009"],
          deck: Array(8).fill("BT1-009"),
        },
        1: { battleArea: [{ card: "BT1-013", as: "attacker" }], deck: Array(8).fill("BT1-009") },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(
      s.events.some(
        (event) =>
          event.kind === "counterWindowOpened" &&
          event.eligibleCounters.some((entry) => entry.instanceId === s.inst("examon").instanceId),
      ),
    ).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual([CARD_ID, "BT20-045"]);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("trashes the opponent's top security card when ANY Dracomon-text Digimon wins a battle, once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST1-04", dp: 20_000, as: "carrier", under: [CARD_ID] },
            { card: "ST1-04", dp: 20_000, as: "other" },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: Array(14).fill("BT1-009"),
          security: Array(4).fill("BT1-009"),
        },
        1: {
          battleArea: [
            { card: "BT1-013", dp: 1000, suspended: true, as: "preyOne" },
            { card: "BT1-013", dp: 1000, suspended: true, as: "preyTwo" },
            { card: "BT1-013", dp: 1000, suspended: true, as: "preyThree" },
          ],
          deck: Array(14).fill("BT1-009"),
          security: Array(4).fill("BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("other").permanentId,
        target: { kind: "permanent", permanentId: s.perm("preyOne").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 3);
    expect(s.state.players[1]!.security).toHaveLength(3);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("carrier").permanentId,
        target: { kind: "permanent", permanentId: s.perm("preyTwo").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(3);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.suspend([s.perm("preyThree").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("carrier").permanentId,
        target: { kind: "permanent", permanentId: s.perm("preyThree").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Q7339: triggers after a separate qualifying Digimon trades in battle, but not when its own host trades", async () => {
    const separate = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-013", as: "survivingHost", under: [CARD_ID] },
            { card: "ST1-04", as: "qualifyingAttacker", dp: 5000 },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "prey", dp: 5000, suspended: true }],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    await separate.ready();

    expect(
      separate.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: separate.perm("qualifyingAttacker").permanentId,
        target: { kind: "permanent", permanentId: separate.perm("prey").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => separate.state.players[0]!.battleArea.length === 1);
    await settle();

    expect(separate.state.players[1]!.battleArea).toHaveLength(0);
    expect(separate.state.players[1]!.security).toHaveLength(1);

    const ownHost = setupEngine(
      {
        0: { battleArea: [{ card: "ST1-04", as: "hostAttacker", dp: 5000, under: [CARD_ID] }] },
        1: {
          battleArea: [{ card: "BT1-013", as: "prey", dp: 5000, suspended: true }],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    await ownHost.ready();

    expect(
      ownHost.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: ownHost.perm("hostAttacker").permanentId,
        target: { kind: "permanent", permanentId: ownHost.perm("prey").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => ownHost.state.players[0]!.battleArea.length === 0);
    await settle();

    expect(ownHost.state.players[1]!.battleArea).toHaveLength(0);
    expect(ownHost.state.players[1]!.security).toHaveLength(2);
  });

  it("stays silent for hosts with neither token in their OWN printed text", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-013", dp: 20_000, as: "carrier", under: [CARD_ID] },
            { card: "BT1-009", dp: 20_000, as: "nearMiss" },
          ],
          hand: [{ card: "BT1-010", as: "spare" }],
          deck: Array(10).fill("BT1-009"),
          security: Array(4).fill("BT1-009"),
        },
        1: {
          battleArea: [
            { card: "BT1-014", dp: 1000, suspended: true, as: "preyOne" },
            { card: "BT1-014", dp: 1000, suspended: true, as: "preyTwo" },
          ],
          deck: Array(10).fill("BT1-009"),
          security: Array(4).fill("BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("carrier").permanentId,
        target: { kind: "permanent", permanentId: s.perm("preyOne").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(4);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("nearMiss").permanentId,
        target: { kind: "permanent", permanentId: s.perm("preyTwo").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(4);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("replays itself for free through ＜Fortitude＞ when deleted in battle with digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, dp: 4000, suspended: true, as: "groundramon", under: ["BT20-040"] }],
          deck: Array(6).fill("BT1-009"),
        },
        1: { battleArea: [{ card: "BT1-013", dp: 9000, as: "killer" }], deck: Array(6).fill("BT1-009") },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("killer").permanentId,
        target: { kind: "permanent", permanentId: s.perm("groundramon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === CARD_ID && perm.stack.length === 0),
    );

    const replayed = s.state.players[0]!.battleArea.find((perm) => perm.topCard.cardId === CARD_ID);
    expect(replayed).toBeDefined();
    expect(replayed!.stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT20-040"]);
    expect(s.state.memory).toBe(0);
    expect(s.perm("killer").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("killer"), LOCK)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
