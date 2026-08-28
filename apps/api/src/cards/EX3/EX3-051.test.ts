import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX3-051.js";

interface DecisionPayload {
  candidateInstanceIds?: string[];
  visibleInstanceIds?: string[];
  visibleCards?: { instanceId: string; cardId: string }[];
  min?: number;
  max?: number;
  timing?: string;
  effectText?: string;
}

function payload(decision: { payloadJson: string }): DecisionPayload {
  return JSON.parse(decision.payloadJson) as DecisionPayload;
}

async function answerSelection({
  s,
  instanceIds,
}: {
  s: ReturnType<typeof setupEngine>;
  instanceIds: string[];
}): Promise<void> {
  await settle(() => s.state.pendingDecision?.kind === "selectCards");
  const decision = s.state.pendingDecision!;
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: decision.decisionId,
      response: { kind: "selectCards", instanceIds },
    }),
  ).toEqual({ ok: true });
}

describe("EX3-051 Tankdramon", () => {
  it("has the official metadata and digivolves from a black level 4 for 3", async () => {
    expect(getCardDefinition("EX3-051")).toMatchObject({
      cardId: "EX3-051",
      nameEn: "Tankdramon",
      colors: ["Black"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Black", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Machine", "D-Brigade"],
      rarity: "R",
    });
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-049", as: "base" }],
        hand: [{ card: "EX3-051", as: "tankdramon" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("tankdramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX3-051");

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").topCard.cardId).toBe("EX3-051");
  });

  it("When Digivolving exposes all 3 cards, permits only a cost-5 D-Brigade, plays it free, and trashes the rest", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-049", as: "base" }],
        hand: [{ card: "EX3-051", as: "tankdramon" }],
        deck: [
          { card: "BT1-001", as: "digivolutionDraw" },
          { card: "EX3-049", as: "eligibleCostFive" },
          { card: "EX3-051", as: "tooExpensive" },
          { card: "EX3-065", as: "notDigimon" },
        ],
      },
    });
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("tankdramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const decision = s.state.pendingDecision!;
    const options = payload(decision);
    expect(s.decisions.at(-1)!.req.sourceCardId).toBe("EX3-051");
    expect(options).toMatchObject({
      candidateInstanceIds: [s.inst("eligibleCostFive").instanceId],
      visibleInstanceIds: expect.arrayContaining([
        s.inst("eligibleCostFive").instanceId,
        s.inst("tooExpensive").instanceId,
        s.inst("notDigimon").instanceId,
      ]),
      visibleCards: expect.arrayContaining([
        { instanceId: s.inst("eligibleCostFive").instanceId, cardId: "EX3-049" },
        { instanceId: s.inst("tooExpensive").instanceId, cardId: "EX3-051" },
        { instanceId: s.inst("notDigimon").instanceId, cardId: "EX3-065" },
      ]),
      min: 0,
      max: 1,
      timing: "WhenDigivolving",
    });
    expect(options.effectText).toContain("play cost of 5 or less");

    await answerSelection({ s, instanceIds: [s.inst("eligibleCostFive").instanceId] });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.trash.length === 2);

    expect(s.state.memory).toBe(3);
    expect(
      s.state.players[0]!.battleArea.some(
        ({ topCard }) => topCard.instanceId === s.inst("eligibleCostFive").instanceId,
      ),
    ).toBe(true);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("tooExpensive").instanceId, s.inst("notDigimon").instanceId]),
    );
  });

  it("When Digivolving may decline the eligible play and trashes all 3 revealed cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-049", as: "base" }],
        hand: [{ card: "EX3-051", as: "tankdramon" }],
        deck: [
          { card: "BT1-001", as: "digivolutionDraw" },
          { card: "EX3-046", as: "eligible" },
          { card: "BT1-010", as: "firstFiller" },
          { card: "BT1-011", as: "secondFiller" },
        ],
      },
    });
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("tankdramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await answerSelection({ s, instanceIds: [] });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.trash.length === 3);

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("eligible").instanceId,
        s.inst("firstFiller").instanceId,
        s.inst("secondFiller").instanceId,
      ]),
    );
  });

  it("When Digivolving reveals and trashes fewer than 3 cards when the deck is short", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-049", as: "base" }],
        hand: [{ card: "EX3-051", as: "tankdramon" }],
        deck: [
          { card: "BT1-001", as: "digivolutionDraw" },
          { card: "BT1-010", as: "onlyRevealedCard" },
        ],
      },
    });
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("tankdramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("onlyRevealedCard").instanceId),
    );

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("D-Brigade family: an allied D-Brigade attack reveals 2, plays the chosen Commandramon, and trashes the other card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-054", under: ["EX3-051"], as: "inheritedHost" },
          { card: "EX3-049", as: "attacker" },
        ],
        deck: [
          { card: "EX3-046", as: "commandramon" },
          { card: "BT1-010", as: "filler" },
        ],
      },
      1: { security: ["BT1-001"] },
    });
    s.state.turnCount = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const decision = s.state.pendingDecision!;
    expect(s.decisions.at(-1)!.req.sourceCardId).toBe("EX3-051");
    expect(payload(decision)).toMatchObject({
      candidateInstanceIds: [s.inst("commandramon").instanceId],
      visibleInstanceIds: expect.arrayContaining([s.inst("commandramon").instanceId, s.inst("filler").instanceId]),
      min: 0,
      max: 1,
      timing: "YourTurn",
    });
    expect(payload(decision).effectText).toContain("When one of your Digimon with [D-Brigade]");

    await answerSelection({ s, instanceIds: [s.inst("commandramon").instanceId] });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("filler").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("commandramon").instanceId),
    ).toBe(true);
  });

  it("Q3419 trashes a revealed Commandramon when the inherited optional play is declined", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-054", under: ["EX3-051"], as: "host" },
          { card: "EX3-049", as: "attacker" },
        ],
        deck: [
          { card: "BT4-063", as: "declinedCommandramon" },
          { card: "BT1-010", as: "filler" },
        ],
      },
      1: { security: ["BT1-001"] },
    });
    s.state.turnCount = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await answerSelection({ s, instanceIds: [] });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.trash.length === 2);

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(
      s.inst("declinedCommandramon").instanceId,
    );
  });

  it("the inherited watcher is once per turn across attacks by two D-Brigade Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-054", under: ["EX3-051"], as: "host" },
            { card: "EX3-049", as: "firstAttacker" },
            { card: "EX3-046", as: "secondAttacker" },
          ],
          deck: [
            { card: "EX3-046", as: "firstCommandramon" },
            { card: "BT1-010", as: "firstFiller" },
            { card: "BT4-063", as: "secondCommandramon" },
            { card: "BT1-011", as: "secondFiller" },
          ],
        },
        1: { security: ["BT1-001", "BT1-002"] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("firstCommandramon").instanceId);
    s.state.turnCount = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("firstAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.deck.length === 2 &&
        s.state.pendingDecision === undefined &&
        s.state.phase === "Main" &&
        s.state.players[1]!.security.length === 1 &&
        !observe(s.engine).isAttacking(),
    );
    await settle(() => s.events.filter(({ kind }) => kind === "combatResolved").length === 1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("secondAttacker").isSuspended && s.state.players[1]!.security.length === 0);

    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("secondCommandramon").instanceId,
      s.inst("secondFiller").instanceId,
    ]);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-051" && req.kind === "selectCards")).toHaveLength(
      1,
    );
  });

  it("ignores attacks by non-D-Brigade Digimon and attacks during the opponent's turn", async () => {
    const ownTurn = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-054", under: ["EX3-051"], as: "host" },
          { card: "BT1-028", as: "unrelated" },
        ],
        deck: ["EX3-046", "BT1-010"],
      },
      1: { security: ["BT1-001"] },
    });
    ownTurn.state.turnCount = 1;
    await ownTurn.ready();

    expect(
      ownTurn.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: ownTurn.perm("unrelated").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => ownTurn.perm("unrelated").isSuspended);
    expect(ownTurn.state.players[0]!.deck).toHaveLength(2);

    const opponentTurn = setupEngine({
      0: {
        battleArea: [{ card: "EX3-054", under: ["EX3-051"], as: "host" }],
        deck: ["EX3-046", "BT1-010"],
        security: ["BT1-001"],
      },
      1: { battleArea: [{ card: "EX3-049", as: "opponentAttacker" }] },
    });
    opponentTurn.state.turnSeat = 1;
    opponentTurn.state.turnCount = 1;
    await opponentTurn.ready();

    expect(
      opponentTurn.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: opponentTurn.perm("opponentAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => opponentTurn.perm("opponentAttacker").isSuspended);
    expect(opponentTurn.state.players[0]!.deck).toHaveLength(2);
  });
});
