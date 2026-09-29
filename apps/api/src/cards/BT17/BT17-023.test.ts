import { describe, expect, it } from "vitest";
import { EffectTiming, effectiveStaticNames, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { matchingAlternateDigivolutionRequirement } from "../../engine/cards/cardData.js";
import { drainMicrotasks, type EngineSetup, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT13/BT13-007.js";
import "../BT4/BT4-016.js";
import "../BT4/BT4-030.js";
import "../BT16/BT16-085.js";
import "../BT18/BT18-088.js";
import { compiled } from "./BT17-023.js";
import "./index.js";

describe("BT17-023", () => {
  it("matches the catalog printed text, evolution costs and requirement", () => {
    expect(getCardDefinition("BT17-023")).toMatchObject({
      cardId: "BT17-023",
      nameEn: "KendoGarurumon",
      colors: ["Blue", "Yellow"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 6,
      dp: 6000,
      forms: ["Hybrid"],
      types: ["Cyborg"],
      evoCosts: [
        { color: "Blue", level: 3, memoryCost: 3 },
        { color: "Yellow", level: 3, memoryCost: 3 },
      ],
      inheritedEffectText: "[When Attacking] If you have 7 or fewer cards in your hand, ＜Draw 1＞.",
    });
    const printed = getCardDefinition("BT17-023")!.effectText!;
    expect(printed).toContain("[Digivolve][Koji Minamoto]: Cost 2");
    expect(printed).toContain("[Digivolve][Lobomon]: Cost 1");
    expect(printed).toContain(
      "You may digivolve this card from your hand onto one of your yellow Tamers as if that card is a level 3 yellow Digimon.",
    );
    expect(printed).toContain("[When Attacking] ＜Draw 1＞");
    expect(printed).toContain(
      "[When Attacking] This Digimon may digivolve into a Digimon card with the [Hybrid] trait in the hand with the digivolution cost reduced by 1.",
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("compiles four effects in printed order with exact IR", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      actions: [{ kind: "Digivolve", asLevel: 3, payCost: true, target: { count: 1, filter: { kind: ["Tamer"] } } }],
    });
    expect(compiled.effects?.[0]?.actions?.[0]).not.toHaveProperty("optional");
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenAttacking",
      keywords: [{ keyword: "Draw", amount: 1 }],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Digivolve",
          from: ["hand"],
          costDelta: -1,
          optional: true,
          into: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Hybrid"], match: "trait" }] },
        },
      ],
    });
    const attackingDigivolve = compiled.effects?.[2]?.actions?.[0] as unknown as Record<string, unknown>;
    expect(attackingDigivolve).not.toHaveProperty("ignoreRequirements");
    expect(attackingDigivolve).not.toHaveProperty("ignoreDigivolutionRequirement");
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      actions: [{ kind: "Draw", amount: 1, condition: { kind: "zoneCount", zone: "hand", op: "lte", value: 7 } }],
    });
  });

  it("declares the named routes as exact names (coordinator route-name decision)", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { namesExact: ["Koji Minamoto"], cost: 2, isAlternate: true, baseIsTamer: true },
      { namesExact: ["Lobomon"], cost: 1, isAlternate: true },
    ]);
    expect(effectiveStaticNames(getCardDefinition("BT18-088")!)).toContain("Koji Minamoto");
  });

  it("selects the correct alternate route per base, and refuses an illegal source", () => {
    expect(matchingAlternateDigivolutionRequirement("BT17-023", "BT17-083")).toMatchObject({
      cost: 2,
      baseIsTamer: true,
    });
    expect(matchingAlternateDigivolutionRequirement("BT17-023", "BT18-088")).toMatchObject({ cost: 2 });
    expect(matchingAlternateDigivolutionRequirement("BT17-023", "BT17-022")).toMatchObject({ cost: 1 });
    expect(matchingAlternateDigivolutionRequirement("BT17-023", "BT1-087")).toMatchObject({
      cost: 3,
      baseIsTamer: true,
    });
    expect(matchingAlternateDigivolutionRequirement("BT17-023", "BT1-086")).toBeUndefined();
  });

  it("digivolves onto a yellow Tamer, taking the bonus draw and stacking the Tamer (Q2765, Q2767)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-086", as: "blueTamer" },
          { card: "BT1-087", as: "yellowTamer" },
        ],
        hand: [{ card: "BT17-023", as: "kendo" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 3;
    const deckBefore = s.state.players[0]!.deck.length;
    const tamerId = s.inst("yellowTamer").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueTamer").permanentId,
        instanceId: s.inst("kendo").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("yellowTamer").permanentId,
        instanceId: s.inst("kendo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("yellowTamer").topCard?.cardId === "BT17-023");

    expect(s.state.memory).toBe(0);
    expect(deckBefore - s.state.players[0]!.deck.length).toBe(1);
    expect(s.perm("yellowTamer").stack.map((card) => card.instanceId)).toEqual([tamerId]);
  });

  it("digivolves through the printed [Lobomon]: Cost 1 route with a bonus draw and stacked source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT17-022", as: "lobomon" }],
        hand: [{ card: "BT17-023", as: "kendo" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 1;
    const deckBefore = s.state.players[0]!.deck.length;
    const lobomonId = s.inst("lobomon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lobomon").permanentId,
        instanceId: s.inst("kendo").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("lobomon").topCard?.cardId === "BT17-023");

    expect(s.state.memory).toBe(0);
    expect(deckBefore - s.state.players[0]!.deck.length).toBe(1);
    expect(s.perm("lobomon").stack.map((card) => card.instanceId)).toEqual([lobomonId]);
  });

  it("draws from its ＜Draw 1＞ [When Attacking] on a public attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-023", as: "kendo" }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-012", as: "dummy", suspended: true }] },
      },
      { autoDeclineOptional: true },
    );
    const handBefore = s.state.players[0]!.hand.length;
    const deckBefore = s.state.players[0]!.deck.length;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("kendo").permanentId,
        target: { kind: "permanent", permanentId: s.perm("dummy").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === handBefore + 1);

    expect(s.state.players[0]!.hand).toHaveLength(handBefore + 1);
    expect(deckBefore - s.state.players[0]!.deck.length).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q2769: digivolving with the 2nd [When Attacking] first loses the 1st one", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-023", as: "kendo" }],
          hand: [{ card: "BT4-030", as: "beowolfmon" }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
    );
    const deckBefore = s.state.players[0]!.deck.length;

    const attacking = advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("kendo"));
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const orderDecision = s.state.pendingDecision!;
    const keys = s.decisions.find(({ req }) => req.decisionId === orderDecision.decisionId)!.req.options?.triggerKeys;
    expect(keys).toHaveLength(2);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: orderDecision.decisionId,
        response: { kind: "orderTriggers", order: [keys![1]!] },
      }),
    ).toEqual({ ok: true });
    await attacking;

    expect(s.perm("kendo").topCard.cardId).toBe("BT4-030");
    expect(deckBefore - s.state.players[0]!.deck.length).toBe(1);
  });

  it("Q6567: a host with this card beneath it draws from the inherited [When Attacking] at 7 or fewer cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-014", as: "host", under: ["BT17-023"] }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-012", as: "dummy", suspended: true }] },
      },
      { autoDeclineOptional: true },
    );
    const handBefore = s.state.players[0]!.hand.length;
    const deckBefore = s.state.players[0]!.deck.length;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("dummy").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === handBefore + 1);

    expect(s.state.players[0]!.hand).toHaveLength(handBefore + 1);
    expect(deckBefore - s.state.players[0]!.deck.length).toBe(1);
  });

  it("does not draw the inherited [When Attacking] with 8 cards in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-014", as: "host", under: ["BT17-023"] }],
          hand: Array.from({ length: 8 }, () => ({ card: "BT1-009" })),
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-012", as: "dummy", suspended: true }] },
      },
      { autoDeclineOptional: true },
    );
    const handBefore = s.state.players[0]!.hand.length;
    const deckBefore = s.state.players[0]!.deck.length;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("dummy").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);

    expect(s.state.players[0]!.hand).toHaveLength(handBefore);
    expect(s.state.players[0]!.deck.length).toBe(deckBefore);
  });
});

describe("BT17-023 KendoGarurumon — KB Q&A rulings", () => {
  function attackWithKendo(hybridInHand: string) {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-023", as: "kendo" }],
          hand: [{ card: hybridInHand, as: "hybrid" }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-012", as: "dummy", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("kendo").permanentId,
        target: { kind: "permanent", permanentId: s.perm("dummy").permanentId },
      }),
    ).toEqual({ ok: true });
    return s;
  }

  async function digivolveKendoOnto(
    baseCard: string,
    opts: { useAlternateCost?: boolean; withDigivolveLock?: boolean } = {},
  ) {
    const s = setupEngine(
      {
        0: {
          ...(opts.withDigivolveLock ? { breeding: { card: "BT13-007", as: "digivolveLock" } } : {}),
          battleArea: [
            { card: baseCard, as: "base" },
            { card: "BT16-085", as: "watcher" },
          ],
          hand: [{ card: "BT17-023", as: "kendo" }],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("kendo").instanceId,
      ...(opts.useAlternateCost ? { useAlternateCost: true } : {}),
    });
    return { s, result };
  }

  it("does not delete the AncientGarurumon slid into after the end-of-turn timing already passed (Q2762)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-023", as: "kendo", under: ["BT18-088"] }],
          hand: [
            { card: "BT17-022", as: "lobomon" },
            { card: "BT17-028", as: "ancient" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: { security: ["BT1-010", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 5;
    await s.ready();

    await advance(s.engine).runTurn(0);
    await settle();

    expect(s.state.players[1]!.security).toHaveLength(1);
    const ancientHost = s.state.players[0]!.battleArea.find(
      (perm) => perm.topCard.instanceId === s.inst("ancient").instanceId,
    );
    expect(ancientHost?.stack.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("kendo").instanceId, s.inst("lobomon").instanceId]),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("ancient").instanceId);
  });

  it("treats a yellow Tamer as a digivolving Digimon, so 'when one of your Digimon digivolves' triggers and 'your Digimon can't digivolve' blocks it (Q2763)", async () => {
    const digimonBase = await digivolveKendoOnto("BT1-028");
    expect(digimonBase.result).toEqual({ ok: true });
    await settle(() => digimonBase.s.perm("watcher").isSuspended);
    expect(digimonBase.s.state.memory).toBe(1);

    const tamerBase = await digivolveKendoOnto("BT1-087");
    expect(tamerBase.result).toEqual({ ok: true });
    await settle(() => tamerBase.s.perm("base").topCard.cardId === "BT17-023");
    await drainMicrotasks();
    expect(tamerBase.s.perm("watcher").isSuspended).toBe(true);
    expect(tamerBase.s.state.memory).toBe(1);

    const lockedDigimonBase = await digivolveKendoOnto("BT1-028", { withDigivolveLock: true });
    expect(lockedDigimonBase.result).toMatchObject({ ok: false });

    const lockedTamerBase = await digivolveKendoOnto("BT1-087", { withDigivolveLock: true });
    expect(lockedTamerBase.result).toMatchObject({ ok: false });
    expect(lockedTamerBase.s.perm("base").topCard.cardId).toBe("BT1-087");
    expect(lockedTamerBase.s.state.memory).toBe(3);
  });

  it("treats a yellow [Koji Minamoto] digivolving through the Cost 2 route as a Digimon, so 'when one of your Digimon digivolves' triggers (Q2764)", async () => {
    const { s, result } = await digivolveKendoOnto("BT18-088", { useAlternateCost: true });
    expect(result).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT17-023");
    await drainMicrotasks();

    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT18-088"]);
    expect(s.perm("watcher").isSuspended).toBe(true);
    expect(s.state.memory).toBe(3 - 2 + 1);
  });

  it("cannot attack the turn it digivolves from a Tamer played this turn (Q2766)", async () => {
    function layBoard(tamerZone: "hand" | "battleArea") {
      const tamer = { card: "BT18-088", as: "tamer" };
      const kendo = { card: "BT17-023", as: "kendo" };
      const s = setupEngine({
        0: {
          ...(tamerZone === "hand" ? { hand: [tamer, kendo] } : { battleArea: [tamer], hand: [kendo] }),
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-012", as: "dummy", suspended: true }] },
      });
      s.state.memory = 10;
      return s;
    }
    async function digivolveThenAttack(s: EngineSetup) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("tamer").permanentId,
          instanceId: s.inst("kendo").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("tamer").topCard.cardId === "BT17-023");
      return s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("tamer").permanentId,
        target: { kind: "permanent", permanentId: s.perm("dummy").permanentId },
      });
    }

    const fresh = layBoard("hand");
    await fresh.ready();
    expect(fresh.engine.applyIntent(0, { type: "playCard", instanceId: fresh.inst("tamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => fresh.state.players[0]!.battleArea.length === 1);
    expect((await digivolveThenAttack(fresh)).ok).toBe(false);
    expect(fresh.perm("tamer").isSuspended).toBe(false);

    const established = layBoard("battleArea");
    await established.ready();
    expect(await digivolveThenAttack(established)).toEqual({ ok: true });
  });

  it("cannot use the 2nd [When Attacking] to digivolve into a [Hybrid] card that does not meet its requirements (Q2768)", async () => {
    const blocked = attackWithKendo("BT4-016");
    await settle(() => blocked.state.players[0]!.deck.length === 2);
    await settle();

    expect(blocked.perm("kendo").topCard.cardId).toBe("BT17-023");
    expect(blocked.state.players[0]!.hand.map((card) => card.instanceId)).toContain(blocked.inst("hybrid").instanceId);
    expect(
      blocked.decisions.some(({ req }) =>
        req.options?.candidateInstanceIds?.includes(blocked.inst("hybrid").instanceId),
      ),
    ).toBe(false);

    const allowed = attackWithKendo("BT4-030");
    await settle(() => allowed.perm("kendo").topCard.cardId === "BT4-030");

    expect(allowed.perm("kendo").topCard.cardId).toBe("BT4-030");
  });

  it("cannot decline a declared digivolution onto a yellow Tamer, and cannot declare it without one (Q4660)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-086", as: "blueTamer" },
            { card: "BT1-087", as: "yellowTamer" },
          ],
          hand: [{ card: "BT17-023", as: "kendo" }],
          deck: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueTamer").permanentId,
        instanceId: s.inst("kendo").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("kendo").instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("yellowTamer").permanentId,
        instanceId: s.inst("kendo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("yellowTamer").topCard.cardId === "BT17-023");

    expect(s.perm("yellowTamer").topCard.instanceId).toBe(s.inst("kendo").instanceId);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toEqual([]);
  });

  it("does not gain the [Security] effect of a Tamer card in its digivolution cards (Q6566)", async () => {
    async function revealSecurityDuringOpponentAttack(securityCard: string) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: "BT17-023", as: "kendo", under: [{ card: "BT18-088", as: "sourceTamer" }] }],
          security: [{ card: securityCard, as: "revealed" }],
        },
        1: { battleArea: [{ card: "BT1-060", as: "attacker" }] },
      });
      s.state.turnSeat = 1;
      await s.ready();
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.security.length === 0);
      await settle();
      return s;
    }
    const battleAreaTopCards = (s: EngineSetup) =>
      s.state.players[0]!.battleArea.map((perm) => perm.topCard.instanceId);

    const tamerRevealed = await revealSecurityDuringOpponentAttack("BT18-088");
    expect(battleAreaTopCards(tamerRevealed)).toContain(tamerRevealed.inst("revealed").instanceId);

    const digimonRevealed = await revealSecurityDuringOpponentAttack("BT1-010");
    expect(battleAreaTopCards(digimonRevealed)).toEqual([digimonRevealed.inst("kendo").instanceId]);
    expect(digimonRevealed.perm("kendo").stack.map((card) => card.instanceId)).toEqual([
      digimonRevealed.inst("sourceTamer").instanceId,
    ]);
  });
});
