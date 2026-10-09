import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layCardsTurnsScenario, type CardsTurnsScenarioId } from "../cardsTurnsScenarios.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { observe } from "../testkit/observe.js";
import { setupEngine, settle, type SetupEngineOptions } from "../testkit/harness.js";

async function launch(id: CardsTurnsScenarioId, options: SetupEngineOptions = {}) {
  const s = setupEngine({ 0: {}, 1: {} }, options);
  layCardsTurnsScenario(id, s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  if (id !== "arena-github-5415-egg-breeding") {
    const result = s.engine.applyIntent(0, { type: "endPhase" });
    if (!result.ok) throw new Error(result.reason);
  }
  await advance(s.engine).waitForMainPhase(0);
  const idle = () => settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
  const field = (index: number, seat: 0 | 1 = 0) =>
    s.state.players[seat]!.battleArea.find((p) => p.permanentId === `${id}-${seat}-field-${index}`)!;
  const hand = (index: number, seat: 0 | 1 = 0) => `${id}-${seat}-hand-${index}`;
  const finish = async () => {
    if (s.state.phase === Phase.Breeding) {
      const result = s.engine.applyIntent(s.state.turnSeat, { type: "endPhase" });
      if (!result.ok) throw new Error(result.reason);
      await advance(s.engine).waitForMainPhase(s.state.turnSeat);
    }
    expect(s.engine.applyIntent(s.state.turnSeat, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  };
  return { s, id, idle, field, hand, finish };
}

it("GitHub #5373: Targetmon counts as Sukamon for the full trash Assembly recipe and cost 3", async () => {
  const { s, id, hand, idle, finish } = await launch("arena-github-5373-targetmon-assembly", {
    autoDeclineOptional: true,
  });
  const ids = [0, 1, 2].map((i) => `${id}-0-trash-${i}`);
  expect(
    s.engine.applyIntent(0, { type: "playCard", instanceId: hand(0), assembly: { materialInstanceIds: ids } }),
  ).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX13-031"));
  await idle();
  const king = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "EX13-031")!;
  expect(king.stack.map((c) => c.instanceId)).toEqual(ids.toReversed());
  expect(s.state.players[0]!.trash).toHaveLength(0);
  expect(s.state.memory).toBe(7);
  await finish();
});

it.each(["BT23-027", "BT25-034"])(
  "GitHub #5376: Patamon can evolve into face-down %s, replenish security and gain inherited memory",
  async (cardId) => {
    const { s, id, field, idle, finish } = await launch("arena-github-5376-patamon-angemon", {
      autoAcceptOptional: true,
      autoSelectCards: true,
      preferInstanceIds: [
        `arena-github-5376-patamon-angemon-0-security-${cardId === "BT23-027" ? 0 : 1}`,
        "arena-github-5376-patamon-angemon-0-hand-0",
      ],
    });
    await idle();
    expect(field(0).topCard.cardId).toBe(cardId);
    expect(field(0).stack.map((c) => c.cardId)).toContain("BT14-033");
    expect(s.state.players[0]!.security.at(-1)?.instanceId).toBe(`${id}-0-hand-0`);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.memory).toBe(10); // Gain 1 is capped at the gauge's upper limit.
    expect(s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === "BT14-033" && e.isInherited)).toBe(
      true,
    );
    await finish();
  },
);

it("GitHub #5402: De-Digivolve exposes Dracomon X and both restored start-of-main effects resolve next turn", async () => {
  const config: SetupEngineOptions = { autoDeclineOptional: true, autoSelectCards: true };
  const { s, field, hand, finish } = await launch("arena-github-5402-dedigi-main", config);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(1);
  expect(s.engine.applyIntent(1, { type: "playCard", instanceId: hand(0, 1), useAs: "option" })).toEqual({
    ok: true,
  });
  await settle(() => s.state.turnSeat === 0 && s.state.phase === Phase.Breeding);
  expect(field(0).topCard.cardId).toBe("BT21-046");
  config.autoDeclineOptional = false;
  config.autoAcceptOptional = true;
  const before = s.state.memory;
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  await settle(
    () =>
      field(0).topCard.cardId === "EX13-018" &&
      !s.state.pendingDecision &&
      s.engine.mainVerbContinuationsInFlight === 0,
  );
  expect(
    s.events.some(
      (e) => e.kind === "effectResolved" && e.sourceCardId === "BT21-046" && e.timing === "OnStartMainPhase",
    ),
  ).toBe(true);
  expect(s.state.memory).toBe(before + 2);
  await finish();
});

it("GitHub #5404: live Knightmon aura grants DarkKnightmon Reboot and Blocker on the opponent's turn only", async () => {
  const { s, field, finish } = await launch("arena-github-5404-knightmon-aura", { autoDeclineOptional: true });
  expect(observe(s.engine).hasKeyword(field(1), "Reboot")).toBe(false);
  expect(
    s.engine.applyIntent(0, { type: "attack", attackerPermanentId: field(1).permanentId, target: { kind: "player" } }),
  ).toEqual({ ok: true });
  await advance(s.engine).finishAttack();
  expect(field(1).isSuspended).toBe(true);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
  expect(observe(s.engine).hasKeyword(field(1), "Reboot")).toBe(true);
  expect(observe(s.engine).hasKeyword(field(1), "Blocker")).toBe(true);
  expect(field(1).isSuspended).toBe(false);
  expect(observe(s.engine).hasKeyword(field(2), "Blocker")).toBe(false);
  expect(field(2).isSuspended).toBe(false); // Our Active phase already unsuspended it.
  await finish();
});

it("GitHub #5405: Material Save accepts SkullKnightmon source and makes it available to DarkKnightmon's On Deletion", async () => {
  const { s, field, id, finish } = await launch("arena-github-5405-material-save", {
    autoAcceptOptional: true,
    autoSelectCards: true,
    preferInstanceIds: ["arena-github-5405-material-save-0-source-0-0"],
  });
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: field(0).permanentId,
      target: { kind: "permanent", permanentId: field(0, 1).permanentId },
    }),
  ).toEqual({ ok: true });
  await advance(s.engine).finishAttack();
  const skull = `${id}-0-source-0-0`;
  expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === skull)).toBe(true);
  expect(
    s.decisions.find((d) => d.req.promptText.startsWith("＜Material Save 1＞"))?.req.options?.candidateInstanceIds,
  ).toContain(skull);
  await finish();
});

it("GitHub #5406: Craniamon's attack suspension deletes all tied lowest-play-cost Digimon", async () => {
  const { s, field, finish } = await launch("arena-github-5406-craniamon-suspend", {
    autoAcceptOptional: true,
    autoSelectCards: true,
  });
  expect(
    s.engine.applyIntent(0, { type: "attack", attackerPermanentId: field(0).permanentId, target: { kind: "player" } }),
  ).toEqual({ ok: true });
  await advance(s.engine).finishAttack();
  expect(s.state.players[1]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["BT1-084"]);
  expect(s.state.players[1]!.trash.filter((c) => c.cardId === "BT1-009")).toHaveLength(2);
  await finish();
});

it.each(["arena-github-5407-kakkinmon-opponent-end", "arena-github-5414-kakkinmon-opponent-end"] as const)(
  "GitHub #5407/#5414 %s: Kakkinmon suspends the blocker at the end of the opponent's turn and Craniamon sweeps",
  async (id) => {
    const config: SetupEngineOptions = { autoDeclineOptional: true, autoSelectCards: true };
    const { s, field, finish } = await launch(id, config);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    const before = s.state.players[0]!.hand.length;
    // Decline our end-of-turn opportunity, then accept the independent opponent-turn opportunity.
    config.autoDeclineOptional = false;
    config.autoAcceptOptional = true;
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 0 && s.state.phase === Phase.Breeding);
    expect(s.events.filter((e) => e.kind === "effectTriggered" && e.sourceCardId === "P-245")).toHaveLength(1);
    expect(s.state.players[0]!.hand.length).toBe(before + 2); // Kakkinmon draw, then turn draw.
    expect(s.state.players[1]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["BT1-084"]);
    expect(field(0)).toBeDefined();
    await finish();
  },
);

it.each(["arena-github-5413-psychemon-assembly", "arena-github-5413-psychemon-digixros"] as const)(
  "GitHub #5413: Psychemon permits material placement but prohibits the %s discount",
  async (id) => {
    const { s, hand, idle, finish } = await launch(id, { autoDeclineOptional: true });
    const assembly = id.endsWith("assembly");
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: hand(0),
        ...(assembly
          ? { assembly: { materialInstanceIds: [0, 1, 2].map((i) => `${id}-0-trash-${i}`) } }
          : { digiXros: { materialInstanceIds: [hand(1), hand(2)] } }),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    await idle();
    expect(s.state.memory).toBe(assembly ? 3 : 2);
    expect(s.state.players[0]!.battleArea[0]!.stack).toHaveLength(assembly ? 3 : 2);
    await finish();
  },
);

it("GitHub #5415: Dracomon X's printed egg evolution costs 1 without activating Bebydomon in breeding", async () => {
  const { s, hand, id, finish } = await launch("arena-github-5415-egg-breeding", { autoDeclineOptional: true });
  const egg = s.state.players[0]!.breeding!;
  expect(s.engine.applyIntent(0, { type: "digivolve", instanceId: hand(0), permanentId: egg.permanentId })).toEqual({
    ok: true,
  });
  await settle(
    () =>
      egg.topCard.cardId === "BT21-046" &&
      s.state.players[0]!.hand.some((c) => c.cardId === "BT1-009") &&
      !s.state.pendingDecision &&
      s.engine.mainVerbContinuationsInFlight === 0,
  );
  expect(s.state.memory).toBe(9);
  expect(s.events.some((e) => e.kind === "effectTriggered" && e.sourceCardId === "EX13-005")).toBe(false);
  expect(egg.stack[0]?.instanceId).toBe(`${id}-0-field-0`);
  await finish();
});

it.each([
  ["EX13-062", ["BT13-070", "BT13-068", "BT13-061"]],
  ["BT26-081", ["BT24-041"]],
] as const)(
  "GitHub #5413: a prohibited Assembly discount cannot make %s affordable (production Mervamon repro)",
  async (cardId, sources) => {
    const s = setupEngine({
      0: { hand: [{ card: cardId, as: "played" }], trash: [...sources] },
      1: { battleArea: ["BT8-071"] },
    });
    s.state.memory = 0;
    await s.ready();
    const materials = s.state.players[0]!.trash.map((c) => c.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("played").instanceId,
        assembly: { materialInstanceIds: materials },
      }),
    ).toEqual({ ok: false, reason: "insufficient-memory" });
    expect(s.state.players[0]!.hand.map((c) => c.cardId)).toEqual([cardId]);
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toEqual(materials);
    expect(s.state.memory).toBe(0);
  },
);

it("GitHub #5413: deleting Psychemon clears the authoritative prohibition and restores Assembly's discount", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT1-016", as: "attacker" }],
        hand: [{ card: "EX13-031", as: "king" }],
        trash: ["EX13-028", "EX13-028", "EX5-046"],
      },
      1: { battleArea: [{ card: "BT8-071", as: "psyche", suspended: true }] },
    },
    { autoDeclineOptional: true },
  );
  s.state.memory = 10;
  await s.ready();
  expect(s.inst("king").playCostReductionBlocked).toBe(true);
  expect(s.inst("king").projectedPlayCost).toBe(7);
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "permanent", permanentId: s.perm("psyche").permanentId },
    }),
  ).toEqual({ ok: true });
  await advance(s.engine).finishAttack();
  expect(s.state.players[1]!.battleArea).toHaveLength(0);
  expect(s.inst("king").playCostReductionBlocked).toBe(false);
  const materials = s.state.players[0]!.trash.map((c) => c.instanceId);
  expect(
    s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("king").instanceId,
      assembly: { materialInstanceIds: materials },
    }),
  ).toEqual({ ok: true });
  await settle(
    () =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX13-031") &&
      !s.state.pendingDecision &&
      s.engine.mainVerbContinuationsInFlight === 0,
  );
  expect(s.state.memory).toBe(7);
});
