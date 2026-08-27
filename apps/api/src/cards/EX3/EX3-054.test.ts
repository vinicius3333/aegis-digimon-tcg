import { getCardDefinition, Phase, type DecisionResponse } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX3-046.js";
import "./EX3-049.js";
import "./EX3-051.js";
import "./EX3-054.js";

interface DecisionPayload {
  candidateInstanceIds?: string[];
  min?: number;
  max?: number;
  timing?: string;
  effectText?: string;
  orderDestination?: string;
}

function payload(s: EngineSetup): DecisionPayload {
  return JSON.parse(s.state.pendingDecision!.payloadJson) as DecisionPayload;
}

function respond(s: EngineSetup, response: DecisionResponse): void {
  expect(
    s.engine.applyIntent(s.state.pendingDecision!.seat, {
      type: "respondDecision",
      decisionId: s.state.pendingDecision!.decisionId,
      response,
    }),
  ).toEqual({ ok: true });
}

async function waitForDecision(s: EngineSetup, kind: string): Promise<void> {
  await settle(() => s.state.pendingDecision?.kind === kind);
  expect(s.state.pendingDecision?.kind).toBe(kind);
}

describe("EX3-054 Darkdramon", () => {
  it("digivolves for its printed cost when zero optional returns are chosen", async () => {
    expect(getCardDefinition("EX3-054")).toMatchObject({
      cardId: "EX3-054",
      nameEn: "Darkdramon",
      colors: ["Black"],
      level: 6,
      playCost: 13,
      dp: 12000,
      evoCosts: [{ color: "Black", level: 5, memoryCost: 5 }],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Cyborg", "D-Brigade"],
      rarity: "SR",
    });
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-051", as: "base" }],
          hand: [{ card: "EX3-054", as: "darkdramon" }],
          trash: [{ card: "EX3-046", as: "dBrigade" }],
          deck: ["BT1-001"],
        },
      },
      { autoOrderCards: false },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("darkdramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await waitForDecision(s, "selectCards");
    expect(s.decisions.at(-1)!.req.sourceCardId).toBe("EX3-054");
    respond(s, { kind: "selectCards", instanceIds: [] });
    await settle(() => s.perm("base").topCard.cardId === "EX3-054" && s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("dBrigade").instanceId);
  });

  it("Q3423 returns and orders up to 5 D-Brigade cards, reduces by the actual count, and cannot cancel afterward", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-051", as: "base" }],
          hand: [{ card: "EX3-054", as: "darkdramon" }],
          trash: [
            { card: "EX3-046", as: "first" },
            { card: "EX3-049", as: "second" },
            { card: "EX3-051", as: "third" },
            { card: "EX3-046", as: "fourth" },
            { card: "EX3-049", as: "fifth" },
            { card: "EX3-051", as: "sixth" },
            { card: "BT1-010", as: "nonDBrigade" },
          ],
        },
      },
      { autoOrderCards: false },
    );
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("darkdramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await waitForDecision(s, "selectCards");
    expect(payload(s)).toMatchObject({ min: 0, max: 5, timing: "Static" });
    expect(payload(s).candidateInstanceIds).toHaveLength(6);
    expect(payload(s).candidateInstanceIds).not.toContain(s.inst("nonDBrigade").instanceId);
    const chosen = ["first", "second", "third", "fourth", "fifth"].map((alias) => s.inst(alias).instanceId);
    respond(s, { kind: "selectCards", instanceIds: chosen });
    await waitForDecision(s, "orderCards");
    expect(payload(s)).toMatchObject({ orderDestination: "deckTop" });
    const order = [
      s.inst("third").instanceId,
      s.inst("first").instanceId,
      s.inst("fifth").instanceId,
      s.inst("second").instanceId,
      s.inst("fourth").instanceId,
    ];
    respond(s, { kind: "orderCards", order });
    await settle(() => s.perm("base").topCard.cardId === "EX3-054" && s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(order[0]);
    expect(s.state.players[0]!.deck.slice(0, 4).map(({ instanceId }) => instanceId)).toEqual(order.slice(1));
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("sixth").instanceId, s.inst("nonDBrigade").instanceId]),
    );
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-054").map(({ req }) => req.kind)).toEqual([
      "selectCards",
      "orderCards",
    ]);
  });

  it("reduces by only the 2 cards actually returned and rejects an unaffordable declaration before moving cards", async () => {
    const partial = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-051", as: "base" }],
          hand: [{ card: "EX3-054", as: "darkdramon" }],
          trash: [
            { card: "EX3-046", as: "one" },
            { card: "EX3-049", as: "two" },
            { card: "EX3-051", as: "three" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoOrderCards: false },
    );
    partial.state.memory = 3;
    await partial.ready();
    expect(
      partial.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: partial.perm("base").permanentId,
        instanceId: partial.inst("darkdramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await waitForDecision(partial, "optional");
    respond(partial, { kind: "optional", accept: true });
    await waitForDecision(partial, "selectCards");
    respond(partial, {
      kind: "selectCards",
      instanceIds: [partial.inst("one").instanceId, partial.inst("two").instanceId],
    });
    await waitForDecision(partial, "orderCards");
    respond(partial, {
      kind: "orderCards",
      order: [partial.inst("one").instanceId, partial.inst("two").instanceId],
    });
    await settle(() => partial.perm("base").topCard.cardId === "EX3-054");
    expect(partial.state.memory).toBe(0);
    expect(partial.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(
      partial.inst("three").instanceId,
    );

    const insufficient = setupEngine({
      0: {
        battleArea: [{ card: "EX3-051", as: "base" }],
        hand: [{ card: "EX3-054", as: "darkdramon" }],
        trash: ["EX3-046", "EX3-049", "EX3-051", "EX3-046"],
      },
    });
    insufficient.state.memory = -10;
    await insufficient.ready();
    expect(
      insufficient.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: insufficient.perm("base").permanentId,
        instanceId: insufficient.inst("darkdramon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "insufficient-memory" });
    expect(insufficient.state.players[0]!.trash).toHaveLength(4);
    expect(insufficient.state.pendingDecision).toBeUndefined();
  });

  it("the in-hand reducer applies only when digivolving into that Darkdramon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-049", as: "base" }],
        hand: [
          { card: "EX3-051", as: "tankdramon" },
          { card: "EX3-054", as: "darkdramon" },
        ],
        trash: ["EX3-046", "EX3-049", "EX3-051", "EX3-046", "EX3-049"],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = -8;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("tankdramon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "insufficient-memory" });
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.trash).toHaveLength(5);
  });

  it("on your turn, another played D-Brigade deletes only a Digimon within its play cost and unsuspends Darkdramon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-054", suspended: true, as: "darkdramon" }],
        hand: [{ card: "EX3-046", as: "commandramon" }],
      },
      1: {
        battleArea: [
          { card: "BT1-010", as: "eligible" },
          { card: "BT1-010", as: "alsoEligible" },
          { card: "EX3-048", as: "tooExpensive" },
        ],
      },
    });
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("commandramon").instanceId })).toEqual({
      ok: true,
    });
    await waitForDecision(s, "chooseTargets");
    expect(s.decisions.at(-1)!.req).toMatchObject({ sourceCardId: "EX3-054", kind: "chooseTargets" });
    expect(payload(s).candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("eligible").permanentId, s.perm("alsoEligible").permanentId]),
    );
    expect(payload(s).effectText).toContain("play another Digimon with [D-Brigade]");
    const eligibleId = s.perm("eligible").permanentId;
    respond(s, { kind: "chooseTargets", instanceIds: [eligibleId] });
    await settle(() => s.state.pendingDecision === undefined && !s.perm("darkdramon").isSuspended);

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(eligibleId);
    expect(s.state.players[1]!.battleArea).toContain(s.perm("tooExpensive"));
    expect(s.perm("darkdramon").isSuspended).toBe(false);
  });

  it("unsuspends even when there is no legal deletion target, but triggers only once per turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-054", suspended: true, as: "darkdramon" }],
        hand: [
          { card: "EX3-046", as: "first" },
          { card: "EX3-046", as: "second" },
          { card: "EX3-046", as: "third" },
        ],
        deck: ["BT1-001", "BT1-002"],
      },
      1: { battleArea: [{ card: "EX3-048", as: "tooExpensive" }], deck: ["BT1-003", "BT1-004"] },
    });
    s.state.memory = 6;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settle(() => !s.perm("darkdramon").isSuspended && s.state.pendingDecision === undefined);
    expect(s.perm("darkdramon").isSuspended).toBe(false);

    s.perm("darkdramon").isSuspended = true;
    s.state.phase = Phase.Main;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.perm("darkdramon").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea).toContain(s.perm("tooExpensive"));

    await advance(s.engine).runTurn(0);
    s.perm("darkdramon").isSuspended = true;
    s.state.phase = Phase.Main;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("third").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("darkdramon").isSuspended);
    expect(s.perm("darkdramon").isSuspended).toBe(false);
  });

  it("does not trigger for a non-D-Brigade play or during the opponent's turn", async () => {
    const nonTrait = setupEngine({
      0: {
        battleArea: [{ card: "EX3-054", suspended: true, as: "darkdramon" }],
        hand: [{ card: "BT1-010", as: "unrelated" }],
      },
    });
    nonTrait.state.memory = 3;
    await nonTrait.ready();
    expect(
      nonTrait.engine.applyIntent(0, { type: "playCard", instanceId: nonTrait.inst("unrelated").instanceId }),
    ).toEqual({ ok: true });
    await settle();
    expect(nonTrait.perm("darkdramon").isSuspended).toBe(true);

    const opponentTurn = setupEngine({
      0: { battleArea: [{ card: "EX3-054", suspended: true, as: "darkdramon" }] },
      1: { hand: [{ card: "EX3-046", as: "opponentCommandramon" }] },
    });
    opponentTurn.state.turnSeat = 1;
    opponentTurn.state.memory = 3;
    await opponentTurn.ready();
    expect(
      opponentTurn.engine.applyIntent(1, {
        type: "playCard",
        instanceId: opponentTurn.inst("opponentCommandramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(opponentTurn.perm("darkdramon").isSuspended).toBe(true);
  });

  it("D-Brigade family: Tankdramon's inherited attack plays Commandramon, which triggers Darkdramon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-054", suspended: true, as: "darkdramon" },
            { card: "EX3-049", under: ["EX3-051"], as: "tankHost" },
            { card: "EX3-049", as: "attacker" },
          ],
          deck: [
            { card: "EX3-046", as: "commandramon" },
            { card: "BT1-010", as: "filler" },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "deleteTarget" }],
          security: ["BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnCount = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.perm("darkdramon").isSuspended &&
        s.state.players[1]!.battleArea.length === 0 &&
        !observe(s.engine).isAttacking(),
      1_000,
    );

    expect(s.perm("darkdramon").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-046")).toBe(true);
  });
});
