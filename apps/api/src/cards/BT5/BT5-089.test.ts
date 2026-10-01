import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-089.js";
import "./BT5-058.js";
import "../BT4/BT4-057.js";
import "../BT19/BT19-059.js";
import "../EX1/EX1-035.js";

describe("BT5-089 Izzy Izumi & Mimi Tachikawa", () => {
  it("gains 2 memory at the start of your turn when the opponent has a suspended Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-089", as: "tamer" }] },
      1: { battleArea: [{ card: "BT1-010", suspended: true }] },
    });
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("tamer"));

    expect(s.state.memory).toBe(2);
  });

  it("suspends to digivolve an attacking green level 5 into a revealed green level 6", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-089", as: "tamer" },
            { card: "BT5-052", as: "attacker" },
          ],
          deck: [{ card: "BT5-055", as: "level6" }, "BT1-010", "BT1-011", { card: "BT1-012", as: "draw" }],
        },
        1: { security: ["BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").topCard.instanceId === s.inst("level6").instanceId);

    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.perm("attacker").topCard.instanceId).toBe(s.inst("level6").instanceId);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.hand[0]?.instanceId).toBe(s.inst("draw").instanceId);
  });

  it("reveals all three card identities while choosing the attack-time level 6", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-089", as: "tamer" },
            { card: "BT5-052", as: "attacker" },
          ],
          deck: [
            { card: "BT5-055", as: "levelSix" },
            { card: "BT1-010", as: "otherOne" },
            { card: "BT1-011", as: "otherTwo" },
            { card: "BT1-012", as: "draw" },
          ],
        },
        1: { security: ["BT1-012"] },
      },
      { autoAcceptOptional: true, autoOrderCards: false },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const decision = s.decisions.at(-1)!.req;
    expect(decision.sourceCardId).toBe("BT5-089");
    expect(decision.options?.candidateInstanceIds).toEqual([s.inst("levelSix").instanceId]);
    expect(decision.options?.visibleCards).toEqual([
      { instanceId: s.inst("levelSix").instanceId, cardId: "BT5-055" },
      { instanceId: s.inst("otherOne").instanceId, cardId: "BT1-010" },
      { instanceId: s.inst("otherTwo").instanceId, cardId: "BT1-011" },
    ]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: {
          kind: "selectCards",
          instanceIds: [s.inst("levelSix").instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");

    const ordering = s.decisions.at(-1)!.req;
    const bottomOrder = [s.inst("otherTwo").instanceId, s.inst("otherOne").instanceId];
    expect(ordering.options?.visibleCards).toEqual([
      { instanceId: s.inst("otherOne").instanceId, cardId: "BT1-010" },
      { instanceId: s.inst("otherTwo").instanceId, cardId: "BT1-011" },
    ]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: ordering.decisionId,
        response: { kind: "orderCards", order: bottomOrder },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.perm("attacker").topCard.instanceId === s.inst("levelSix").instanceId &&
        s.state.players[0]!.deck.length === 2,
    );

    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(bottomOrder);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("draw").instanceId);
  });

  it("Q1363 orders the remaining cards before the level 6 When Digivolving effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-089", as: "tamer" },
            { card: "BT5-052", as: "attacker" },
          ],
          deck: [
            { card: "BT5-058", as: "argomon" },
            { card: "BT1-010", as: "otherOne" },
            { card: "BT1-011", as: "otherTwo" },
            { card: "BT1-012", as: "draw" },
          ],
        },
        1: {
          battleArea: [{ card: "BT4-097", as: "opponentTamer" }],
          security: ["BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoOrderCards: false, autoSelectCards: false },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const selection = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: selection.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("argomon").instanceId] },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    expect(s.perm("opponentTamer").isSuspended).toBe(false);
    const ordering = s.state.pendingDecision!;
    const order = [s.inst("otherTwo").instanceId, s.inst("otherOne").instanceId];
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: ordering.decisionId,
        response: { kind: "orderCards", order },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.perm("opponentTamer").isSuspended);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(order);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("draw").instanceId);
    expect(s.perm("attacker").topCard.cardId).toBe("BT5-058");
  });

  it("may decline before revealing cards, leaving the Tamer and deck unchanged", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-089", as: "tamer" },
            { card: "BT5-052", as: "attacker" },
          ],
          deck: ["BT5-055", "BT1-010", "BT1-011"],
        },
      },
      { autoDeclineOptional: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended);

    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });

  it("reveals as many cards as available when fewer than three remain", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-089", as: "tamer" },
            { card: "BT5-052", as: "attacker" },
          ],
          deck: [
            { card: "BT5-055", as: "level6" },
            { card: "BT1-010", as: "other" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").topCard.instanceId === s.inst("level6").instanceId);

    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.deck[0]?.instanceId).toBe(s.inst("other").instanceId);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("does not trigger when a non-level-5 green Digimon attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-089", as: "tamer" },
            { card: "BT5-051", as: "attacker" },
          ],
          deck: ["BT5-055", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended);

    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });

  it("plays itself from security without paying its cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT5-089", as: "security", faceUp: true }] } });

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("security").instanceId)).toBe(
      true,
    );
  });
});

const FILLER = ["BT1-009", "BT1-012", "BT1-013", "BT1-014", "BT1-009", "BT1-012"];

async function attackWithAttacker(s: ReturnType<typeof setupEngine>): Promise<void> {
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
}

function respond(s: ReturnType<typeof setupEngine>, response: Record<string, unknown>) {
  const decision = s.state.pendingDecision!;
  return s.engine.applyIntent(0, {
    type: "respondDecision",
    decisionId: decision.decisionId,
    response: response as never,
  });
}

function deckIds(s: ReturnType<typeof setupEngine>): string[] {
  return s.state.players[0]!.deck.map((card) => card.instanceId);
}

async function memoryAtOpponentStartOfTurn(rebootDigimonAttacks: boolean) {
  const s = setupEngine({
    0: {
      battleArea: [{ card: "BT1-014", as: "rebootHost", under: ["BT19-059"] }],
      deck: FILLER,
      security: ["BT1-009"],
    },
    1: {
      battleArea: [{ card: "BT5-089", as: "tamer" }],
      deck: FILLER,
      security: ["BT1-009", "BT1-009", "BT1-009"],
    },
  });
  await s.ready();
  const loop = s.engine.startTurnLoop();
  await advance(s.engine).waitForMainPhase(0);

  const attack = rebootDigimonAttacks
    ? s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("rebootHost").permanentId,
        target: { kind: "player" },
      })
    : { ok: true };
  await settle(() => !rebootDigimonAttacks || s.state.players[1]!.security.length === 2);

  advance(s.engine).endMainPhaseIfOpen(0);
  await advance(s.engine).waitForMainPhase(1);
  const rebootHostId = s.perm("rebootHost").permanentId;
  const eventKinds = s.events.map((event) => {
    if (event.kind === "memoryChanged" && "reason" in event && event.reason === "gainMemory") return "gainMemory";
    if (event.kind === "cardsMoved" && "instanceIds" in event && event.instanceIds.includes(rebootHostId)) {
      return "rebootUnsuspend";
    }
    return event.kind;
  });
  const result = {
    attack,
    turnSeat: s.state.turnSeat,
    memory: s.state.memory,
    rebootHostSuspended: s.perm("rebootHost").isSuspended,
    gainIndex: eventKinds.indexOf("gainMemory"),
    unsuspendIndex: eventKinds.indexOf("rebootUnsuspend"),
  };
  expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
  await loop;
  return result;
}

describe("BT5-089 Izzy Izumi & Mimi Tachikawa — KB Q&A rulings", () => {
  it("gains 2 memory at Start of Your Turn before the opponent's <Reboot> Digimon unsuspends (Q1360)", async () => {
    const rebooted = await memoryAtOpponentStartOfTurn(true);
    const control = await memoryAtOpponentStartOfTurn(false);

    expect(rebooted.attack).toEqual({ ok: true });
    expect(rebooted.turnSeat).toBe(1);
    expect(rebooted.rebootHostSuspended).toBe(false);
    expect(control.rebootHostSuspended).toBe(false);
    expect(rebooted.memory - control.memory).toBe(2);
    expect(rebooted.gainIndex).toBeGreaterThanOrEqual(0);
    expect(rebooted.gainIndex).toBeLessThan(rebooted.unsuspendIndex);
    expect(control.gainIndex).toBe(-1);
  });

  it("may reveal and then not digivolve, returning all revealed cards to the deck bottom in any order (Q1361)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-089", as: "tamer" },
            { card: "BT5-052", as: "attacker" },
          ],
          deck: [
            { card: "BT5-055", as: "levelSix" },
            { card: "BT1-010", as: "otherOne" },
            { card: "BT1-011", as: "otherTwo" },
            { card: "BT1-012", as: "unrevealed" },
          ],
        },
        1: { security: ["BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: false, autoOrderCards: false },
    );

    await attackWithAttacker(s);
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    expect(s.decisions.at(-1)!.req.options?.candidateInstanceIds).toEqual([s.inst("levelSix").instanceId]);
    expect(respond(s, { kind: "selectCards", instanceIds: [] })).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    const order = [s.inst("otherTwo").instanceId, s.inst("levelSix").instanceId, s.inst("otherOne").instanceId];
    expect(respond(s, { kind: "orderCards", order })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && deckIds(s).length === 4);

    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.perm("attacker").topCard.cardId).toBe("BT5-052");
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(deckIds(s)).toEqual([s.inst("unrevealed").instanceId, ...order]);
  });

  it("performs the digivolution bonus draw from the unrevealed deck before the remaining cards go to the bottom (Q1362)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-089", as: "tamer" },
            { card: "BT5-052", as: "attacker" },
          ],
          deck: [
            { card: "BT5-055", as: "levelSix" },
            { card: "BT1-010", as: "otherOne" },
            { card: "BT1-011", as: "otherTwo" },
            { card: "BT1-012", as: "unrevealed" },
          ],
        },
        1: { security: ["BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: false },
    );

    await attackWithAttacker(s);
    await settle(() => s.state.pendingDecision?.kind === "orderCards");

    expect(s.perm("attacker").topCard.instanceId).toBe(s.inst("levelSix").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("unrevealed").instanceId]);
    const order = [s.inst("otherOne").instanceId, s.inst("otherTwo").instanceId];
    expect(respond(s, { kind: "orderCards", order })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && deckIds(s).length === 2);
    expect(deckIds(s)).toEqual(order);

    const noUnrevealedCard = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-089", as: "tamer" },
            { card: "BT5-052", as: "attacker" },
          ],
          deck: [{ card: "BT5-055", as: "levelSix" }, "BT1-010", "BT1-011"],
        },
        1: { security: ["BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await attackWithAttacker(noUnrevealedCard);
    await settle(
      () =>
        noUnrevealedCard.perm("attacker").topCard.instanceId === noUnrevealedCard.inst("levelSix").instanceId &&
        noUnrevealedCard.state.players[0]!.deck.length === 2,
    );
    expect(noUnrevealedCard.state.players[0]!.hand).toHaveLength(0);
  });

  it("can activate with 2 or fewer cards in deck and reveals as many as possible (Q1364)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-089", as: "tamer" },
            { card: "BT5-052", as: "attacker" },
          ],
          deck: [
            { card: "BT1-010", as: "other" },
            { card: "BT5-055", as: "levelSix" },
          ],
        },
        1: { security: ["BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: false },
    );

    await attackWithAttacker(s);
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.decisions.at(-1)!.req.options?.visibleCards).toEqual([
      { instanceId: s.inst("other").instanceId, cardId: "BT1-010" },
      { instanceId: s.inst("levelSix").instanceId, cardId: "BT5-055" },
    ]);
    expect(respond(s, { kind: "selectCards", instanceIds: [s.inst("levelSix").instanceId] })).toEqual({ ok: true });
    await settle(() => s.perm("attacker").topCard.instanceId === s.inst("levelSix").instanceId);

    expect(deckIds(s)).toEqual([s.inst("other").instanceId]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("resolves two copies one at a time with 3 cards each instead of revealing 6 together (Q1365)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-089", as: "firstTamer" },
            { card: "BT5-089", as: "secondTamer" },
            { card: "BT5-052", as: "attacker" },
          ],
          deck: [
            { card: "BT5-055", as: "firstLevelSix" },
            { card: "BT1-010", as: "fillerOne" },
            { card: "BT1-011", as: "fillerTwo" },
            { card: "BT5-055", as: "secondLevelSix" },
            { card: "BT1-013", as: "fillerThree" },
            { card: "BT1-014", as: "fillerFour" },
            { card: "BT1-012", as: "unrevealed" },
          ],
        },
        1: { security: ["BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: false },
    );

    await attackWithAttacker(s);
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const first = s.decisions.at(-1)!.req;
    expect(first.options?.visibleCards?.map((card) => card.instanceId)).toEqual([
      s.inst("firstLevelSix").instanceId,
      s.inst("fillerOne").instanceId,
      s.inst("fillerTwo").instanceId,
    ]);
    expect(first.options?.candidateInstanceIds).toEqual([s.inst("firstLevelSix").instanceId]);
    expect([s.perm("firstTamer").isSuspended, s.perm("secondTamer").isSuspended].filter(Boolean)).toHaveLength(1);
    expect(respond(s, { kind: "selectCards", instanceIds: [] })).toEqual({ ok: true });

    await settle(
      () => s.state.pendingDecision?.kind === "selectCards" && s.state.pendingDecision.decisionId !== first.decisionId,
    );
    const second = s.decisions.at(-1)!.req;
    expect(second.options?.visibleCards?.map((card) => card.instanceId)).toEqual([
      s.inst("secondLevelSix").instanceId,
      s.inst("fillerThree").instanceId,
      s.inst("fillerFour").instanceId,
    ]);
    expect(respond(s, { kind: "selectCards", instanceIds: [s.inst("secondLevelSix").instanceId] })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("attacker").topCard.instanceId === s.inst("secondLevelSix").instanceId);

    expect(s.perm("firstTamer").isSuspended).toBe(true);
    expect(s.perm("secondTamer").isSuspended).toBe(true);
  });

  it("lets the player order it against the attacker's [When Attacking]; digivolving first loses that effect (Q1366)", async () => {
    async function memoryGainedWhenResolvingFirst(firstSource: string) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT5-089", as: "tamer" },
              { card: "BT4-057", as: "attacker" },
            ],
            deck: [{ card: "BT5-055", as: "levelSix" }, "BT1-010", "BT1-011", "BT1-012"],
          },
          1: { security: ["BT1-012"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferTriggerKeys: [firstSource] },
      );
      s.state.memory = 3;
      await attackWithAttacker(s);
      await settle(
        () =>
          s.state.pendingDecision === undefined &&
          s.perm("attacker").topCard.instanceId === s.inst("levelSix").instanceId &&
          s.state.players[0]!.deck.length === 2,
      );
      const triggerOrder = s.decisions.find((decision) => decision.req.kind === "orderTriggers")?.req;
      expect(triggerOrder?.options?.triggerCardIds).toEqual(expect.arrayContaining(["BT5-089", "BT4-057"]));
      return s.state.memory - 3;
    }

    expect(await memoryGainedWhenResolvingFirst("BT5-089")).toBe(0);
    expect(await memoryGainedWhenResolvingFirst("BT4-057")).toBe(1);
  });

  it("does not trigger when a non-level-5 green Digimon digivolves into a green level 5 after attacking (Q1367)", async () => {
    async function attackFrom(attackerCardId: string) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT5-089", as: "tamer" },
              { card: attackerCardId, as: "attacker" },
            ],
            hand: [{ card: "EX1-040", as: "levelFive" }],
            deck: [{ card: "BT5-055", as: "levelSix" }, "BT1-010", "BT1-011", "BT1-012"],
          },
          1: { security: ["BT1-012", "BT1-012"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 5;
      await attackWithAttacker(s);
      await settle(() => s.state.pendingDecision === undefined && s.state.players[1]!.security.length === 1);
      return s;
    }

    const digivolvedAfterAttack = await attackFrom("EX1-035");
    expect(digivolvedAfterAttack.perm("attacker").topCard.instanceId).toBe(
      digivolvedAfterAttack.inst("levelFive").instanceId,
    );
    expect(digivolvedAfterAttack.perm("tamer").isSuspended).toBe(false);
    expect(digivolvedAfterAttack.decisions.some((decision) => decision.req.sourceCardId === "BT5-089")).toBe(false);
    expect(digivolvedAfterAttack.state.players[0]!.deck.map((card) => card.cardId)).toEqual([
      "BT1-010",
      "BT1-011",
      "BT1-012",
    ]);

    const levelFiveAttacker = await attackFrom("BT5-052");
    expect(levelFiveAttacker.perm("tamer").isSuspended).toBe(true);
    expect(levelFiveAttacker.perm("attacker").topCard.instanceId).toBe(levelFiveAttacker.inst("levelSix").instanceId);
  });
});
