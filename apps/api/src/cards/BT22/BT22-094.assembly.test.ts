import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition, Zone, type Seat } from "@aegis/shared";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";

// Match 12f8cbdb: s0-22, s0-24, s0-7, s0-45, respectively.
const materials = ["BT22-013", "BT22-026", "BT22-017", "EX4-038"];

async function board(seat: Seat, yuugos = 2) {
  const s = setupEngine(
    {
      [seat]: {
        battleArea: Array.from({ length: yuugos }, (_, i) => ({ card: "BT22-094", as: `yuugo${i}` })),
        hand: [
          { card: "EX13-016", as: "omnimon" },
          { card: "BT22-079", as: "eater" },
        ],
        trash: materials.map((card, i) => ({ card, as: `material${i}` })),
        deck: Array(10).fill("BT1-009"),
      },
    },
    { autoSelectCards: true },
  );
  s.state.turnSeat = seat;
  s.state.memory = 10;
  await s.ready();
  await s.engine.recomputeContinuousEffects();
  return s;
}

function play(s: EngineSetup, seat: Seat, assembly = true) {
  return s.engine.applyIntent(seat, {
    type: "playCard",
    instanceId: s.inst("omnimon").instanceId,
    ...(assembly
      ? { assembly: { materialInstanceIds: materials.map((_, i) => s.inst(`material${i}`).instanceId) } }
      : {}),
  });
}

async function answerYuugos(s: EngineSetup, seat: Seat, answers: boolean[]) {
  for (const accept of answers) {
    await settle(
      () =>
        s.state.pendingDecision?.kind === "optional" ||
        s.events.some((e) => e.kind === "cardPlayed" && e.cardId === "EX13-016"),
    );
    const decision = s.state.pendingDecision;
    expect(
      s.decisions.find(({ req }) => req.decisionId === decision?.decisionId)?.req.sourceCardId,
      "Yuugo must be offered before placing Omnimon",
    ).toBe("BT22-094");
    expect(s.state.players[seat]!.hand.some((c) => c.cardId === "EX13-016")).toBe(true);
    expect(
      s.engine.applyIntent(seat, {
        type: "respondDecision",
        decisionId: decision!.decisionId,
        response: { kind: "optional", accept },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.decisionId !== decision!.decisionId);
  }
}

async function resolved(s: EngineSetup) {
  await settle(
    () =>
      s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === "EX13-016") &&
      s.state.pendingDecision === undefined,
  );
}

describe.each([0, 1] as const)("#5341 Yuugo with EX13-016, seat %s", (seat) => {
  it.each([
    [true, [true, true], 4],
    [true, [true, false], 6],
    [true, [false, false], 8],
    [false, [true, true], 11],
    [false, [true, false], 13],
    [false, [false, false], 15],
  ] as const)("Assembly %s, choices %j costs %s", async (assembly, answers, cost) => {
    const s = await board(seat);
    expect(play(s, seat, assembly)).toEqual({ ok: true });
    await answerYuugos(s, seat, [...answers]);
    await resolved(s);
    expect(s.state.memory).toBe(10 - cost);
    const accepted = answers.filter(Boolean).length;
    expect(s.state.players[seat]!.battleArea.filter((p) => p.topCard.cardId === "BT22-094")).toHaveLength(2 - accepted);
    expect(s.state.players[seat]!.deck.filter((c) => c.cardId === "BT22-094")).toHaveLength(accepted);
    const omni = s.state.players[seat]!.battleArea.find((p) => p.topCard.cardId === "EX13-016")!;
    expect(omni.stack.map((c) => c.cardId)).toEqual(assembly ? ["BT22-017", "EX4-038", "BT22-026", "BT22-013"] : []);
    const payment = s.events.findIndex((e) => e.kind === "memoryChanged" && e.reason === "payCost");
    const onPlay = s.events.findIndex((e) => e.kind === "effectTriggered" && e.sourceCardId === "EX13-016");
    expect(payment).toBeGreaterThanOrEqual(0);
    expect(onPlay).toBeGreaterThan(payment);
  });

  it("rejects incomplete Assembly before consuming Yuugo", async () => {
    const s = await board(seat);
    expect(
      s.engine.applyIntent(seat, {
        type: "playCard",
        instanceId: s.inst("omnimon").instanceId,
        assembly: { materialInstanceIds: materials.slice(0, 3).map((_, i) => s.inst(`material${i}`).instanceId) },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });
    expect(s.state.memory).toBe(10);
    expect(s.decisions).toHaveLength(0);
    expect(s.state.players[seat]!.battleArea).toHaveLength(2);
  });

  it("floors reductions exceeding the printed cost at zero", async () => {
    const s = await board(seat);
    expect(s.engine.applyIntent(seat, { type: "playCard", instanceId: s.inst("eater").instanceId })).toEqual({
      ok: true,
    });
    await answerYuugos(s, seat, [true, true]);
    await settle(
      () =>
        s.state.players[seat]!.battleArea.some((p) => p.topCard.cardId === "BT22-079") &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.memory).toBe(10);
    expect(s.state.players[seat]!.battleArea.filter((p) => p.topCard.cardId === "BT22-094")).toHaveLength(0);
  });

  it("four Yuugos reach the zero-cost floor with Assembly", async () => {
    const s = await board(seat, 4);
    expect(play(s, seat)).toEqual({ ok: true });
    await answerYuugos(s, seat, [true, true, true, true]);
    await resolved(s);
    expect(s.state.memory).toBe(10);
    expect(s.state.players[seat]!.deck.filter((c) => c.cardId === "BT22-094")).toHaveLength(4);
  });

  it("offers the old and newly played Yuugo after declining during Hudie Delay", async () => {
    const s = await board(seat, 1);
    s.putOnBoard(seat, { card: "BT23-100", as: "cafe" });
    s.give(seat, Zone.Hand, { card: "BT22-094", as: "newYuugo" });
    await s.engine.recomputeContinuousEffects();
    expect(
      s.engine.applyIntent(seat, {
        type: "activateEffect",
        sourceInstanceId: s.inst("cafe").instanceId,
        effectKey: `BT23-100/ir-${EffectTiming.OnDeclaration}-0`,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(seat, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "BT22-094"));
    await answerYuugos(s, seat, [false]);
    await settle(
      () =>
        s.state.players[seat]!.battleArea.filter((p) => p.topCard.cardId === "BT22-094").length === 2 &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.memory).toBe(10);
    expect(play(s, seat)).toEqual({ ok: true });
    await answerYuugos(s, seat, [true, true]);
    await resolved(s);
    expect(s.state.memory).toBe(6);
  });

  it("does not reduce or offer Yuugo for an opponent-turn security effect play", async () => {
    const opponent: Seat = seat === 0 ? 1 : 0;
    const s = setupEngine(
      {
        [seat]: {
          battleArea: ["BT22-094", "BT22-094"],
          security: ["BT23-100"],
          hand: ["BT22-008"],
          deck: Array(10).fill("BT1-009"),
        },
        [opponent]: { battleArea: [{ card: "BT1-020", as: "attacker" }], deck: Array(10).fill("BT1-009") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = opponent;
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(opponent, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[seat]!.battleArea.some((p) => p.topCard.cardId === "BT22-008") &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.players[seat]!.battleArea.filter((p) => p.topCard.cardId === "BT22-094")).toHaveLength(2);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "BT22-094")).toHaveLength(0);
    expect(s.state.memory).toBe(4);
  });

  it("does not offer a Yuugo already returned for a prior play", async () => {
    const s = await board(seat);
    expect(s.engine.applyIntent(seat, { type: "playCard", instanceId: s.inst("eater").instanceId })).toEqual({
      ok: true,
    });
    await answerYuugos(s, seat, [true, false]);
    await settle(
      () =>
        s.state.players[seat]!.battleArea.some((p) => p.topCard.cardId === "BT22-079") &&
        s.state.pendingDecision === undefined,
    );
    const memory = s.state.memory;
    expect(play(s, seat)).toEqual({ ok: true });
    await answerYuugos(s, seat, [true]);
    await resolved(s);
    expect(s.state.memory).toBe(memory - 6);
    expect(s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === "BT22-094")).toHaveLength(3);
  });
});

it.each([
  ["BT22-078", ["BT11-084", "BT15-009", "BT15-015", "BT15-069", "BT18-030"], 4],
  ["EX13-023", ["BT11-029", "BT11-027", "BT11-023"], 5],
] as const)("#5341 sweep: Yuugo also reduces Assembly of %s", async (card, recipe, expectedCost) => {
  const s = setupEngine(
    {
      0: {
        battleArea: ["BT22-094"],
        hand: [{ card, as: "assembly" }],
        trash: [...recipe],
        deck: Array(10).fill("BT1-009"),
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 10;
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("assembly").instanceId,
      assembly: { materialInstanceIds: s.state.players[0]!.trash.map((c) => c.instanceId) },
    }),
  ).toEqual({ ok: true });
  await settle(
    () =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === card) && s.state.pendingDecision === undefined,
  );
  expect(s.state.memory).toBe(10 - expectedCost);
  expect(s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === "BT22-094")).toHaveLength(1);
});

it("#5341 catalog qualifies the exact historical material names and Omnimon CS trait", () => {
  expect(materials.map((id) => getCardDefinition(id)!.nameEn)).toEqual([
    "WarGreymon",
    "MetalGarurumon",
    "Gabumon",
    "Agumon",
  ]);
  expect(getCardDefinition("EX13-016")!.types).toContain("CS");
});
