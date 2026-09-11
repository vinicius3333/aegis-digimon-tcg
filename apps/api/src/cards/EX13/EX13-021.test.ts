import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./EX13-021.js";
import "./EX13-018.js";
import "../BT20/BT20-045.js";

const CARD_ID = "EX13-021";

describe("EX13-021 Wingdramon", () => {
  it("matches the catalog identity and the printed clauses", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      set: "EX13",
      nameEn: "Wingdramon",
      colors: ["Blue", "Red"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Sky Dragon"],
      evoCosts: [
        { color: "Blue", level: 4, memoryCost: 4 },
        { color: "Red", level: 4, memoryCost: 4 },
      ],
      rarity: "U",
      maxCountInDeck: 4,
    });
    const effectText = getCardDefinition(CARD_ID)?.effectText ?? "";
    expect(effectText).toContain("[Digivolve] [Coredramon]: Cost 3");
    expect(effectText).toContain("＜Jamming＞");
    expect(effectText).toContain(
      "[On Play] [When Digivolving] trash the bottom 2 digivolution cards of 1 of your opponent's Digimon. Then, 1 of their Digimon or Tamers can't suspend until their turn ends.",
    );
    expect(effectText).toContain(
      "[All Turns] This Digimon is also treated as Lv.6 [Slayerdramon] for [Examon]'s DNA digivolution.",
    );
    expect((getCardDefinition(CARD_ID)?.inheritedEffectText ?? "").trim()).toBe(
      "[All Turns] [Once Per Turn] When this Digimon with [Dracomon] or [Examon] in its text suspends, it may unsuspend.",
    );
    expect(getCardDefinition(CARD_ID)?.securityEffectText ?? "").toBe("");
  });

  it("compiles every printed clause", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toHaveLength(5);

    // ＜Jamming＞ is printed on the main text only — the inherited box carries the unsuspend clause.
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }],
    });
    expect(compiled.effects[0]?.isInherited).toBeUndefined();

    // Both printed timings carry the same pair of actions, and neither is once-per-turn.
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect).toMatchObject({
        actions: [
          {
            kind: "TrashDigivolution",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            amount: 2,
            fromTop: false,
          },
          {
            kind: "Restrict",
            target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
            restriction: "suspend",
            blocksCombatSuspend: true,
            duration: "untilOpponentTurnEnd",
          },
        ],
      });
      expect(effect?.frequency).toBeUndefined();
      // No `ifThisEffectActed` gate: the first sentence is a mandatory trash, not a
      // "by X, Y" optional processing condition (comprehensive §15-7-1/§15-7-2).
      expect(effect?.actions[1]).not.toHaveProperty("condition");
    }

    // The field-only [Slayerdramon] alias plus the Examon-scoped level treatment.
    expect(
      compiled.effects.find((entry) => entry.trigger === "AllTurns" && entry.isInherited === undefined),
    ).toMatchObject({
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true, zone: "battleArea" }, count: 1, isSelf: true },
          grant: "name",
          tokens: ["Slayerdramon"],
        },
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true, zone: "battleArea" }, count: 1, isSelf: true },
          grant: { kind: "TreatAsLevel", level: 6, context: "DNADigivolution", intoNames: ["Examon"] },
        },
      ],
    });

    expect(compiled.effects.find((entry) => entry.isInherited === true)).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { isSelfRef: true },
          hostFilter: {
            nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }],
            printedTextOnly: true,
          },
          actions: [
            { kind: "Unsuspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, optional: true },
          ],
        },
      ],
    });

    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["Coredramon"], cost: 3, isAlternate: true }]);
  });

  it("reads [Coredramon] as an exact name and [Dracomon]/[Examon] as a text union", () => {
    const coredramon = { tokens: ["Coredramon"], match: "nameExact" as const };
    expect(matchNameOrTrait({ nameEn: "Coredramon" }, coredramon)).toBe(true);
    expect(matchNameOrTrait({ nameEn: "Coredramon X" }, coredramon)).toBe(false);
    expect(matchNameOrTrait({ nameEn: "Coredramonmon" }, coredramon)).toBe(false);

    // "in its text" is the full card-information union, so three distinct routes qualify and
    // a merely similar "…dramon" name does not.
    const dracomonText = { tokens: ["Dracomon", "Examon"], match: "text" as const };
    expect(matchNameOrTrait(getCardDefinition("ST1-04")!, dracomonText)).toBe(true); // named Dracomon
    expect(matchNameOrTrait(getCardDefinition("EX13-018")!, dracomonText)).toBe(true); // prints the token
    expect(matchNameOrTrait(getCardDefinition("BT20-045")!, dracomonText)).toBe(true); // named Examon
    expect(matchNameOrTrait(getCardDefinition("BT1-009")!, dracomonText)).toBe(false); // Monodramon
    expect(matchNameOrTrait(getCardDefinition("BT1-013")!, dracomonText)).toBe(false); // Muchomon
  });

  it("plays for 7, trashes exactly the bottom two sources, and locks a second opposing permanent", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "wingdramon" },
            { card: "BT1-009", as: "spare" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-014", as: "stacked", under: ["BT1-009", "BT1-010", "BT1-011"] },
            { card: "BT1-013", as: "locked" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    const stackedId = s.perm("stacked").permanentId;
    const lockedId = s.perm("locked").permanentId;
    // Two independent chooseTargets prompts draw from overlapping candidate pools, so bias
    // dynamically: the trash must land on the stacked Digimon, the lock on the other one.
    preferred.includes = (id: string) => (s.perm("stacked").stack.length === 3 ? id === stackedId : id === lockedId);
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wingdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("stacked").stack.length === 1 && observe(s.engine).isRestricted(lockedId, "beSuspended"));

    expect(s.state.memory).toBe(3);
    // "the BOTTOM 2": seeded bottom-to-top as BT1-009, BT1-010, BT1-011, so the two lowest go
    // and the highest source card stays.
    expect(s.perm("stacked").stack.map((card) => card.cardId)).toEqual(["BT1-011"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);
    expect(s.perm("stacked").topCard.cardId).toBe("BT1-014");

    // "can't suspend" is BOTH halves: the effect-facing prohibition and the combat one.
    expect(observe(s.engine).isRestricted(lockedId, "beSuspended")).toBe(true);
    expect(observe(s.engine).isRestricted(lockedId, "suspend")).toBe(true);
    // The Digimon whose sources were trashed is a separate choice and is NOT locked.
    expect(observe(s.engine).isRestricted(stackedId, "suspend")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("wingdramon"), "Jamming")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });

  it("refuses the locked Digimon's attack declaration on the opponent's own turn", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "wingdramon" },
            { card: "BT1-009", as: "spare" },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "locked" }],
          security: ["BT1-009", "BT1-009"],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wingdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("locked"), "suspend"));

    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("locked").permanentId,
        target: { kind: "player" },
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("locked").isSuspended).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("digivolves publicly from Coredramon for the printed 3 and fires the same clause", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX13-018", as: "coredramon" }],
          hand: [
            { card: CARD_ID, as: "wingdramon" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [
            { card: "BT1-014", as: "stacked", under: ["BT1-009", "BT1-010"] },
            { card: "BT1-013", as: "locked" },
          ],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true, preferInstanceIds: preferred },
    );
    const stackedId = s.perm("stacked").permanentId;
    const lockedId = s.perm("locked").permanentId;
    preferred.includes = (id: string) => (s.perm("stacked").stack.length === 2 ? id === stackedId : id === lockedId);
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("coredramon").permanentId,
        instanceId: s.inst("wingdramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("coredramon").topCard.cardId === CARD_ID && s.perm("stacked").stack.length === 0);

    // Cost 3, not the catalog EvoCost 4 — the alternate [Coredramon] route was taken.
    expect(s.state.memory).toBe(0);
    // Source-stack identity survives the transition: Coredramon is now the single source card.
    expect(s.perm("coredramon").stack.map((card) => card.cardId)).toEqual(["EX13-018"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);
    expect(observe(s.engine).isRestricted(lockedId, "suspend")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("coredramon"), "Jamming")).toBe(true);
    // The inherited +2000 DP of EX13-018 now rides under a 7000-DP Wingdramon.
    expect(s.perm("coredramon").currentDP).toBe(9000);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("falls back to the printed EvoCost for a non-Coredramon level-4 source and refuses a level-3 one", async () => {
    // REVIEW-NOTES: `useAlternateCost: true` is a preference, not a gate — with no matching
    // alternate route the engine silently charges the printed EvoCost and still returns ok.
    // The proof is therefore the memory charged (4, not 3), never `ok: false`.
    const fallback = setupEngine(
      { 0: { battleArea: [{ card: "EX13-019", as: "veedramon" }], hand: [{ card: CARD_ID, as: "wingdramon" }] } },
      { autoSelectCards: true },
    );
    fallback.state.memory = 4;
    await fallback.ready();
    expect(
      fallback.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: fallback.perm("veedramon").permanentId,
        instanceId: fallback.inst("wingdramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => fallback.perm("veedramon").topCard.cardId === CARD_ID);
    expect(fallback.state.memory).toBe(0);
    expect(fallback.perm("veedramon").stack.map((card) => card.cardId)).toEqual(["EX13-019"]);

    // A level-3 source matches neither the bracketed [Coredramon] route nor the level-4 EvoCost.
    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "monodramon" }], hand: [{ card: CARD_ID, as: "wingdramon" }] },
    });
    illegal.state.memory = 5;
    await illegal.ready();
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("monodramon").permanentId,
        instanceId: illegal.inst("wingdramon").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(illegal.perm("monodramon").topCard.cardId).toBe("BT1-009");
    expect(illegal.state.memory).toBe(5);
  });

  it("is treated as [Slayerdramon] only while in the battle area", async () => {
    const field = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "wingdramon" }] } });
    await field.ready();
    expect(observe(field.engine).grantedNames(field.perm("wingdramon"))).toContain("slayerdramon");
    expect(observe(field.engine).effectiveNames(field.perm("wingdramon"))).toEqual(
      expect.arrayContaining(["wingdramon", "slayerdramon"]),
    );
    // The level treatment is Examon-scoped, never a blanket "this is a Lv.6".
    expect(field.perm("wingdramon").topCard.cardId).toBe(CARD_ID);
    expect(getCardDefinition(CARD_ID)?.level).toBe(5);

    const breeding = setupEngine({ 0: { breeding: { card: CARD_ID, as: "egg" } } });
    await breeding.ready();
    expect(observe(breeding.engine).grantedNames(breeding.perm("egg"))).not.toContain("slayerdramon");
  });

  it("fills the [Slayerdramon] slot of Examon's Blast DNA from the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "wingdramon", under: ["EX13-018"] }],
          hand: [
            { card: "BT20-044", as: "breakdramon" },
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
    // Wingdramon answered the [Slayerdramon] material slot and its own source stack survived.
    expect(merged!.stack.map((card) => card.cardId)).toEqual(["EX13-018", CARD_ID, "BT20-044"]);
    expect(s.state.players[0]!.hand.some((card) => ["BT20-044", "BT20-045"].includes(card.cardId))).toBe(false);
  });

  it("does not offer Examon's Blast DNA while Wingdramon is only in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-044", as: "breakdramon" }],
          hand: [
            { card: CARD_ID, as: "handWingdramon" },
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
    // BT20-044 prints ＜Blocker＞, so the block window must be answered before the attack resolves.
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declineBlock" })).toEqual({ ok: true });
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

  it("lets a [Dracomon]-text host unsuspend once per turn when an attack suspends it, and resets next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST1-04", dp: 20_000, as: "host", under: [CARD_ID] }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: Array(12).fill("BT1-009"),
          security: Array(4).fill("BT1-009"),
        },
        1: {
          battleArea: [{ card: "BT1-013", dp: 1000, suspended: true, as: "prey" }],
          deck: Array(12).fill("BT1-009"),
          security: Array(4).fill("BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const hostId = s.perm("host").permanentId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    // First attack this turn: the declaration suspends the host, the inherited clause unsuspends it.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: s.perm("prey").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);

    // Second attack in the SAME turn: the once-per-turn gate is spent, so the host stays suspended.
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.perm("host").isSuspended).toBe(true);

    // A real opponent turn passes through the live turn machine, then the controller's own
    // unsuspend phase brings the host back and the gate reopens.
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("host").isSuspended).toBe(false);

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.perm("host").isSuspended).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  /** Suspend a seeded host, fire the board-wide `whenSuspended` bus, and report its final state. */
  async function suspendAndFire(host: string): Promise<boolean> {
    const s = setupEngine(
      { 0: { battleArea: [{ card: host, dp: 20_000, suspended: true, as: "host", under: [CARD_ID] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenSuspended", {
      subjectPermanentId: s.perm("host").permanentId,
      suspendedPermanentId: s.perm("host").permanentId,
    });
    await settle(() => s.state.pendingDecision === undefined);
    return s.perm("host").isSuspended;
  }

  it("offers the inherited unsuspend to hosts whose own printed text carries [Dracomon] or [Examon]", async () => {
    expect(await suspendAndFire("ST1-04")).toBe(false); // named Dracomon
    expect(await suspendAndFire("EX13-018")).toBe(false); // prints the [Dracomon]/[Examon] tokens
  });

  it("refuses the inherited unsuspend to a host with neither token in its own printed text", async () => {
    // `printedTextOnly: true` on `hostFilter` is what makes this pass: without it,
    // `permanentMatchesFilter` would also read EX13-021's own inherited text (which prints
    // "[Dracomon] or [Examon]") off the host's digivolution stack, matching every host
    // unconditionally. Comprehensive §4-23-1/§4-23-2 scope "with XX in its text" to the
    // information printed on the host's OWN card, not effects or text it merely carries.
    expect(await suspendAndFire("BT1-009")).toBe(true); // Monodramon: "dramon", not "Dracomon"
    expect(await suspendAndFire("BT1-013")).toBe(true); // Muchomon: no route at all
  });
});
