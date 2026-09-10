import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { matchingAlternateDigivolutionRequirement } from "../../engine/cards/cardData.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-101.js";
import "./index.js";
import "../EX11/EX11-035.js";
import "../BT1/BT1-085.js";

describe("BT20-101 Zephagamon", () => {
  it("matches the catalog contract, alternate route, keywords, and Q&A scopes", () => {
    expect(getCardDefinition("BT20-101")).toMatchObject({
      cardId: "BT20-101",
      nameEn: "Zephagamon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 8,
      dp: 13000,
      evoCosts: [{ color: "Green", level: 5, memoryCost: 5 }],
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Magic Knight", "Vortex Warriors", "LIBERATOR", "Bird Dragon"],
      isAce: true,
      overflowMemory: 4,
      maxCountInDeck: 4,
    });
    const printed = getCardDefinition("BT20-101")!;
    expect(printed.effectText!.replaceAll("\u00a0", " ")).toContain(
      "[On Play] [When Digivolving] You may suspend 1 Digimon. Then, for every 2 suspended Digimon, you may return 1 of your opponent's suspended Digimon to the bottom of the deck.",
    );
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    const vortexBase = getCardDefinition("EX11-035");
    if (vortexBase === undefined) throw new Error("catalog entry missing for EX11-035");
    expect(matchingAlternateDigivolutionRequirement("BT20-101", vortexBase)).toMatchObject({
      level: 6,
      traits: ["Vortex Warriors"],
      basePlayCostMin: 10,
      cost: 1,
    });
    expect(matchingAlternateDigivolutionRequirement("BT20-101", "BT20-010")).toBeUndefined();
  });

  it("requires a play-cost-10-or-higher level-6 Vortex Warriors base for its cost-1 route", () => {
    expect(compiled.digivolutionRequirement).toContainEqual({
      level: 6,
      traits: ["Vortex Warriors"],
      basePlayCostMin: 10,
      cost: 1,
      isAlternate: true,
    });
  });

  it("watches any Digimon suspension and unsuspends once per turn", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controllerDefault: "any", kind: ["Digimon"] },
          actions: [{ kind: "Unsuspend", target: { isSelf: true }, optional: true }],
        },
      ],
    });
  });

  it("scales the bottom-deck return by every two suspended Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "Suspend", optional: true },
          {
            kind: "Return",
            to: "deckBottom",
            scaling: {
              per: 2,
              unit: "cards",
              filter: { controllerDefault: "any", suspended: true, kind: ["Digimon"] },
            },
          },
        ],
      });
    }
  });

  it("on play suspends one Digimon, then returns one opposing suspended Digimon per pair", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT20-101", as: "zephagamon" }],
          battleArea: [{ card: "BT1-010", as: "ownTarget" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "firstOpponent", suspended: true },
            { card: "BT1-010", as: "secondOpponent", suspended: true },
          ],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("ownTarget").instanceId);
    s.state.memory = 8;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("zephagamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.perm("ownTarget").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    const returnedOpponent = ["firstOpponent", "secondOpponent"].find(
      (alias) =>
        !s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst(alias).instanceId),
    );
    expect(returnedOpponent).toBeDefined();
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toContain(s.inst(returnedOpponent!).instanceId);
    expect(s.state.players[1]!.deck).toHaveLength(2);
  });

  it("unsuspends itself when either player's Digimon suspends, only once per turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-101", as: "zephagamon" }],
          hand: [{ card: "BT20-101", as: "source" }],
          security: ["BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "firstOpponent" },
            { card: "BT1-010", as: "secondOpponent" },
          ],
          deck: ["BT1-010"],
          security: ["BT1-010", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("zephagamon").topCard.instanceId);
    s.state.memory = 8;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.perm("zephagamon").isSuspended &&
        s.state.pendingDecision === undefined &&
        s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT20-101"),
    );
    expect(s.perm("zephagamon").isSuspended).toBe(false);
    expect(s.decisions.some(({ req }) => req.sourceCardId === "BT20-101" && req.kind === "optional")).toBe(true);
    expect(
      s.decisions.some(
        ({ req }) =>
          req.sourceCardId === "BT20-101" &&
          req.kind === "chooseTargets" &&
          req.options?.candidateInstanceIds?.includes(s.perm("zephagamon").permanentId),
      ),
    ).toBe(true);
    expect(s.events).toContainEqual(expect.objectContaining({ kind: "effectResolved", sourceCardId: "BT20-101" }));

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("zephagamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    // The once-per-turn unsuspend was already spent by the source's public On Play suspension,
    // so Zephagamon's own attack leaves it suspended.
    expect(s.perm("zephagamon").isSuspended).toBe(true);
  });

  it("public attacks trigger an own-turn unsuspend once and an opponent-turn reset", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-101", as: "zepha" }],
          hand: ["BT1-010"],
          deck: ["BT1-010", "BT1-010"],
          security: ["BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "opponent", dp: 1000 }],
          hand: ["BT1-010"],
          deck: ["BT1-010", "BT1-010"],
          security: ["BT1-010", "BT1-010", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    for (const expectedSuspended of [false, true]) {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("zepha").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking());
      expect(observe(s.engine).isAttacking()).toBe(false);
      expect(s.perm("zepha").isSuspended).toBe(expectedSuspended);
    }
    expect(s.state.players[1]!.security).toHaveLength(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    const opponentId = s.perm("opponent").topCard.instanceId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("opponent").permanentId,
        target: { kind: "permanent", permanentId: s.perm("zepha").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.perm("zepha").isSuspended).toBe(false);
    expect(s.state.players[1]!.trash.some((c) => c.instanceId === opponentId)).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("may refuse its unsuspend after publicly attacking", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT20-101", as: "zepha" }] }, 1: { security: ["BT1-010", "BT1-010"] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("zepha").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.perm("zepha").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it.each([0, 1, 2])(
    "returns exactly one opposing suspended Digimon only at the two-card boundary (%s)",
    async (suspendedCount) => {
      const s = setupEngine(
        {
          0: { hand: [{ card: "BT20-101", as: "zephagamon" }] },
          1: {
            battleArea: Array.from({ length: suspendedCount }, (_, index) => ({
              card: "BT1-010",
              as: `target${index}`,
              suspended: true,
            })),
            deck: ["BT20-010"],
          },
        },
        { autoAcceptOptional: false, autoDeclineOptional: false, autoSelectCards: true },
      );
      s.state.memory = 8;
      await s.ready();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("zephagamon").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.pendingDecision?.kind === "optional");
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: s.state.pendingDecision!.decisionId,
          response: { kind: "optional", accept: false },
        }),
      ).toEqual({ ok: true });
      if (suspendedCount === 2) {
        await settle(() => s.state.pendingDecision?.kind === "optional");
      }
      const secondResponse =
        s.state.pendingDecision === undefined
          ? { ok: true as const }
          : s.engine.applyIntent(0, {
              type: "respondDecision",
              decisionId: s.state.pendingDecision.decisionId,
              response: { kind: "optional", accept: true },
            });
      expect(secondResponse).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision === undefined);
      expect(s.state.players[1]!.battleArea).toHaveLength(suspendedCount === 2 ? 1 : suspendedCount);
      expect(s.state.players[1]!.deck).toHaveLength(suspendedCount === 2 ? 2 : 1);
    },
  );

  it("uses the printed cost-1 Vortex Warriors alternate evolution", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-035", as: "vortexMega" },
            { card: "BT1-010", as: "ownTarget" },
          ],
          hand: [{ card: "BT20-101", as: "zephagamon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "firstOpponent", suspended: true },
            { card: "BT1-010", as: "secondOpponent", suspended: true },
          ],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("ownTarget").topCard.instanceId);
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("vortexMega").permanentId,
        instanceId: s.inst("zephagamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("vortexMega").topCard.cardId === "BT20-101" && s.state.pendingDecision === undefined);
    expect(s.perm("vortexMega").stack.map((card) => card.cardId)).toEqual(["EX11-035"]);
    expect(s.state.memory).toBe(0);
    expect(s.perm("ownTarget").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.deck).toHaveLength(2);
  });

  it("publicly Blast Digivolves in the counter window and uses Blocker to redirect the attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-035", as: "base" },
            { card: "BT1-085", as: "redTamer" },
          ],
          hand: [{ card: "BT20-101", as: "zephagamon" }, "BT1-010"],
          security: [{ card: "BT1-010", as: "security" }],
          deck: ["BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT20-071", dp: 7000, as: "attacker" }],
          security: ["BT1-010"],
          deck: ["BT1-010", "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
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
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.findLast((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const choice = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("zephagamon").instanceId);
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
        s.perm("base").topCard.cardId === "BT20-101" && s.events.some((event) => event.kind === "blockWindowOpened"),
    );
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("base").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.perm("base").topCard.cardId).toBe("BT20-101");
    expect(s.events.some((event) => event.kind === "blocked")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("publicly uses Piercing to check security after deleting an opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-101", as: "zephagamon" }], hand: ["BT1-010"], deck: ["BT1-010"] },
        1: {
          battleArea: [{ card: "BT1-010", dp: 3000, suspended: true, as: "target" }],
          security: [{ card: "BT1-010", as: "security" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("zephagamon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("naturally attacks an opponent Digimon with Vortex at the real end of its turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-101", as: "zephagamon" }], hand: ["BT1-010"], deck: ["BT1-010"] },
        1: {
          battleArea: [{ card: "BT1-010", dp: 3000, as: "target" }],
          hand: ["BT1-010"],
          deck: ["BT1-010"],
          security: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(-3);
    expect(s.perm("zephagamon").isSuspended).toBe(false);
  });
});
