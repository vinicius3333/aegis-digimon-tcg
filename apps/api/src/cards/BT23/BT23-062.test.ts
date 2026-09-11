import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-062.js";

const NEUTRAL_SECURITY = ["BT1-009", "BT1-010", "BT1-011"];

describe("BT23-062 Dracmon", () => {
  it("matches every catalog field and printed text", () => {
    expect(getCardDefinition("BT23-062")).toMatchObject({
      cardId: "BT23-062",
      nameEn: "Dracmon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Purple", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Virus"],
      types: ["Undead", "CS"],
      effectText:
        "[Digivolve] Lv.2 w/[CS] trait: Cost 0 \n\n[Start of Your Main Phase] By trash 1 card with the [Undead], [Dark Animal] or [CS] trait from your hand, gain 1 memory.",
      inheritedEffectText:
        "[When Attacking] [Once Per Turn] 1 of your Digimon may digivolve into a Digimon card with the [Undead] or [Dark Animal] trait in the trash.",
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("compiles the main-phase clause as a declinable trash cost that gates the memory gain", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase");
    expect(effect).toMatchObject({
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
                nameOrTrait: [{ tokens: ["Undead", "Dark Animal", "CS"], match: "trait" }],
              },
              count: 1,
            },
          },
          // CR 15-7-4: an optional processing condition is the player's choice, and 15-7-2
          // blocks the payload when it is not executed.
          optional: true,
          abortOnDecline: true,
        },
      ],
    });
    expect(effect?.isInherited).toBeUndefined();
    expect(effect?.frequency).toBeUndefined();
  });

  it("compiles the inherited clause as a once-per-turn optional trash digivolution", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Digivolve",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          from: ["trash"],
          payCost: true,
          optional: true,
          into: {
            zone: "trash",
            kind: ["Digimon"],
            controllerDefault: "mine",
            nameOrTrait: [{ tokens: ["Undead", "Dark Animal"], match: "trait" }],
          },
        },
      ],
    });
  });

  it("gains 1 memory at the start of your own main phase by trashing a matching hand card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-062", as: "dracmon" }],
          hand: [
            { card: "BT23-063", as: "matching" },
            { card: "BT1-009", as: "plain" },
          ],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
          security: NEUTRAL_SECURITY,
        },
        1: {
          deck: ["BT1-013", "BT1-014"],
          security: NEUTRAL_SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: [] },
    );
    s.state.memory = 0;
    const matchingId = s.inst("matching").instanceId;
    const plainId = s.inst("plain").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([matchingId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(plainId);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === matchingId)).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it.each([
    ["BT23-066", "Undead"],
    ["BT23-063", "Dark Animal"],
    ["BT22-008", "CS"],
  ])("accepts %s as the %s trait cost", async (cardId) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-062", as: "dracmon" }],
          hand: [{ card: cardId, as: "cost" }],
          deck: ["BT1-010", "BT1-011"],
          security: NEUTRAL_SECURITY,
        },
        1: { deck: ["BT1-013"], security: NEUTRAL_SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    const costId = s.inst("cost").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([costId]);
    expect(s.state.players[0]!.hand).toHaveLength(0);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("keeps the hand card and gains nothing when the controller declines the trash cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-062", as: "dracmon" }],
          hand: [{ card: "BT23-063", as: "matching" }],
          deck: ["BT1-010", "BT1-011"],
          security: NEUTRAL_SECURITY,
        },
        1: { deck: ["BT1-013"], security: NEUTRAL_SECURITY },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    const matchingId = s.inst("matching").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    // CR 15-7-4 / 15-7-2: declining the "By trashing ..." condition keeps the card and
    // blocks the memory gain.
    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(true);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([matchingId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not gain memory when no hand card carries a matching trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-062", as: "dracmon" }],
          hand: [{ card: "BT1-009", as: "plain" }],
          deck: ["BT1-010", "BT1-011"],
          security: NEUTRAL_SECURITY,
        },
        1: { deck: ["BT1-013"], security: NEUTRAL_SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    const plainId = s.inst("plain").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([plainId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("stays silent on the opponent's main phase and fires again on your next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-062", as: "dracmon" }],
          hand: [
            { card: "BT23-063", as: "firstCost" },
            { card: "BT23-066", as: "secondCost" },
          ],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
          security: NEUTRAL_SECURITY,
        },
        1: {
          hand: [{ card: "BT1-009", as: "opponentNeutral" }],
          deck: ["BT1-013", "BT1-014"],
          security: NEUTRAL_SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    const firstCostId = s.inst("firstCost").instanceId;
    const secondCostId = s.inst("secondCost").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([firstCostId]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    // The opponent's main phase must not spend Dracmon's controller's remaining cost card.
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(secondCostId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([firstCostId]);

    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([firstCostId, secondCostId]);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === secondCostId)).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // The alternate route's printed cost (0) equals the printed purple Lv.2 route's cost, so
  // memory cannot tell the two apart. The discriminator is colour legality: BT23-003 Motimon
  // is Black, so only the [CS] clause makes it a legal source. Both `useAlternateCost`
  // branches are pinned because the route is a legality clause, not a cost reduction.
  it.each([true, false])(
    "digivolves from a level 2 CS source of another colour for 0 (useAlternateCost=%s)",
    async (useAlternateCost) => {
      expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["CS"], cost: 0, isAlternate: true }]);
      const s = setupEngine(
        {
          0: {
            breeding: { card: "BT23-003", as: "base" },
            hand: [{ card: "BT23-062", as: "dracmon" }],
            deck: ["BT1-010", "BT1-011"],
          },
        },
        { autoSelectCards: true },
      );
      s.state.memory = 3;
      const baseCardId = s.perm("base").topCard!.instanceId;
      const dracmonId = s.inst("dracmon").instanceId;
      const drawnId = s.state.players[0]!.deck[0]!.instanceId;

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: dracmonId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard?.instanceId === dracmonId);

      expect(s.state.memory).toBe(3);
      expect(s.perm("base").topCard!.instanceId).toBe(dracmonId);
      expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseCardId]);
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([drawnId]);
    },
  );

  it.each([true, false])(
    "refuses a level 2 source that is neither purple nor CS (useAlternateCost=%s)",
    async (useAlternateCost) => {
      const s = setupEngine(
        {
          0: {
            breeding: { card: "BT1-005", as: "base" },
            hand: [{ card: "BT23-062", as: "dracmon" }],
            deck: ["BT1-010", "BT1-011"],
          },
        },
        { autoSelectCards: true },
      );
      s.state.memory = 3;
      const baseCardId = s.perm("base").topCard!.instanceId;

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("dracmon").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: false, reason: "invalid-evolution" });
      await settle(() => s.state.pendingDecision === undefined);

      expect(s.perm("base").topCard!.instanceId).toBe(baseCardId);
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("dracmon").instanceId]);
      expect(s.state.memory).toBe(3);
    },
  );

  it("digivolves a carrier into an Undead card from the trash when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-064", under: ["BT23-062"], as: "host" }],
          trash: [{ card: "BT2-075", as: "myotismon" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { security: NEUTRAL_SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const dracmonId = s.perm("host").stack[0]!.instanceId;
    const bakemonId = s.perm("host").topCard!.instanceId;
    const myotismonId = s.inst("myotismon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.instanceId === myotismonId);

    // Myotismon is Lv.5 Purple: digivolve cost 2 from the Lv.4 Bakemon top card.
    expect(s.state.memory).toBe(3);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([dracmonId, bakemonId]);
    expect(s.perm("host").topCard!.cardId).toBe("BT2-075");
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === myotismonId)).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("leaves the board untouched when the optional inherited digivolution is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-064", under: ["BT23-062"], as: "host" }],
          trash: [{ card: "BT2-075", as: "myotismon" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { security: NEUTRAL_SECURITY },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const bakemonId = s.perm("host").topCard!.instanceId;
    const myotismonId = s.inst("myotismon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isAttacking() === false);

    expect(s.state.memory).toBe(5);
    expect(s.perm("host").topCard!.instanceId).toBe(bakemonId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === myotismonId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("is once per turn and resets on your next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-064", under: ["BT23-062"], as: "host" }],
          trash: [
            { card: "BT2-075", as: "myotismon" },
            { card: "ST16-13", as: "skullMammothmon" },
          ],
          hand: [{ card: "BT1-009", as: "neutral" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
          security: NEUTRAL_SECURITY,
        },
        1: {
          hand: [{ card: "BT1-013", as: "opponentNeutral" }],
          deck: ["BT1-014", "BT1-009"],
          security: NEUTRAL_SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const myotismonId = s.inst("myotismon").instanceId;
    const skullId = s.inst("skullMammothmon").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.instanceId === myotismonId);
    expect(s.perm("host").topCard!.instanceId).toBe(myotismonId);
    const memoryAfterFirst = s.state.memory;

    // Second attack in the same turn: the effect is spent, so SkullMammothmon stays put.
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isAttacking() === false);
    expect(s.perm("host").topCard!.instanceId).toBe(myotismonId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === skullId)).toBe(true);
    expect(s.state.memory).toBe(memoryAfterFirst);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === skullId)).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);

    // Next own turn: the once-per-turn use is back.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.instanceId === skullId);
    expect(s.perm("host").topCard!.instanceId).toBe(skullId);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT23-062", "BT23-064", "BT2-075"]);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not activate the newly inherited When Attacking effect after digivolving mid-window (Q5333)", async () => {
    const s = setupEngine(
      {
        0: {
          // BT24-069 Vilemon has an inherited (and only inherited) [When Attacking] effect:
          // "trash the top card of both players' decks". Dracmon's inherited effect turns it
          // into a digivolution card mid-window, which is exactly Q5333's situation.
          battleArea: [{ card: "BT24-069", under: ["BT23-062"], as: "host" }],
          trash: [{ card: "BT2-075", as: "myotismon" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
        1: { security: NEUTRAL_SECURITY, deck: ["BT1-013", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const dracmonId = s.perm("host").stack[0]!.instanceId;
    const vilemonId = s.perm("host").topCard!.instanceId;
    const myotismonId = s.inst("myotismon").instanceId;
    const opponentDeckIds = s.state.players[1]!.deck.map((card) => card.instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.instanceId === myotismonId);
    await settle(() => observe(s.engine).isAttacking() === false);

    expect(s.perm("host").topCard!.instanceId).toBe(myotismonId);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([dracmonId, vilemonId]);
    // Vilemon only gained its [When Attacking] effect after the declaration, so it never
    // triggered: neither deck lost a card (CR 15-16-5-1, Q5333). Seat 0's deck is one shorter
    // only because the digivolution drew.
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual(opponentDeckIds);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(8);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("still resolves its own inherited effect after the top card's When Attacking digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          // Sangloupmon's own [When Attacking] and Dracmon's inherited one trigger together.
          // Dracmon stays a digivolution card throughout, so its pending effect survives the
          // first digivolution (CR 15-4-4-3 keys on the source card's own identity).
          battleArea: [{ card: "BT23-063", under: ["BT23-062"], as: "host" }],
          trash: [
            { card: "BT2-075", as: "myotismon" },
            { card: "ST16-13", as: "skullMammothmon" },
          ],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
        1: { security: NEUTRAL_SECURITY, deck: ["BT1-013", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const dracmonId = s.perm("host").stack[0]!.instanceId;
    const sangloupmonId = s.perm("host").topCard!.instanceId;
    const myotismonId = s.inst("myotismon").instanceId;
    const skullId = s.inst("skullMammothmon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isAttacking() === false);

    // Two digivolutions, in printed cost order: Myotismon for 2, then SkullMammothmon for 4.
    expect(s.perm("host").topCard!.instanceId).toBe(skullId);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([dracmonId, sangloupmonId, myotismonId]);
    expect(s.state.memory).toBe(4);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
