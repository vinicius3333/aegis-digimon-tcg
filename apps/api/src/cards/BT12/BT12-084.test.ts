import { describe, expect, it } from "vitest";
import { digiXrosRequirementFor, EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-084.js";

describe("BT12-084 compiled IR module", () => {
  it("registers every printed timing through compiled IR", async () => {
    const module = getEffectModule("BT12-084");
    expect(module?.cardId).toBe("BT12-084");
    const source = {
      instanceId: "source-084",
      cardId: "BT12-084",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source).length).toBeGreaterThan(0);
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source).length).toBeGreaterThan(0);
    expect(module!.effectsForTiming(EffectTiming.None, source).length).toBeGreaterThan(0);
    expect(digiXrosRequirementFor("BT12-084")).toEqual([
      { materials: [{ names: ["Mervamon"] }, { names: ["Sparrowmon"] }], count: 3 },
    ]);
    const { runtimeCompiledCard } = await import("../../engine/effects/interpreter/compiledCards.js");
    const compiled = runtimeCompiledCard("BT12-084")!;
    expect(JSON.stringify(compiled.effects)).not.toContain('"kind":"Modal"');
    expect(JSON.stringify(compiled.effects)).toContain('"kind":"ConditionalBranch"');
    expect(JSON.stringify(compiled.effects)).toContain('"kind":"triggerDeletedIsYourOther"');
  });
});

it("uses both named DigiXros materials through the public play intent", async () => {
  const s = setupEngine(
    {
      0: {
        hand: [
          { card: "BT12-084", as: "jet" },
          { card: "BT11-086", as: "mervamon" },
          { card: "BT10-060", as: "sparrowmon" },
        ],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 10;
  await s.ready();

  expect(
    s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("jet").instanceId,
      digiXros: {
        materialInstanceIds: [s.inst("mervamon").instanceId, s.inst("sparrowmon").instanceId],
      },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT12-084"));
  expect(s.state.memory).toBe(3);
  // Stack storage is bottom-to-top; the printed requirement order is therefore visible
  // top-to-bottom as Mervamon, then Sparrowmon.
  expect(s.perm("jet").stack.map(({ cardId }) => cardId)).toEqual(["BT10-060", "BT11-086"]);
});

it("applies both Blocker and return restriction when Sparrowmon is in its stack", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT12-084", as: "jet", under: ["BT10-060"] },
          { card: "BT1-009", as: "ally" },
        ],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("jet"));
  expect(observe(s.engine).hasKeyword(s.perm("ally"), "Blocker")).toBe(true);
  expect(observe(s.engine).isRestricted(s.perm("ally"), "beReturned")).toBe(true);
});

it("places a hand Xros Heart Digimon under JetMervamon itself", async () => {
  const s = setupEngine(
    {
      0: {
        hand: [{ card: "BT10-060", as: "handSparrow" }],
        battleArea: [
          { card: "BT1-009", as: "ally" },
          { card: "BT12-084", as: "jet", under: ["BT10-060"] },
        ],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();

  await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("jet"));

  expect(s.perm("jet").stack.map(({ cardId }) => cardId)).toContain("BT10-060");
  expect(s.perm("ally").stack.map(({ cardId }) => cardId)).not.toContain("BT10-060");
});

it("places an under-Tamer Xros Heart Digimon under JetMervamon itself", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT12-094", as: "tamer", under: ["BT10-060"] },
          { card: "BT12-084", as: "jet" },
          { card: "BT1-009", as: "ally" },
        ],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();

  await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("jet"));

  expect(s.perm("jet").stack.map(({ cardId }) => cardId)).toContain("BT10-060");
  expect(s.perm("tamer").stack.map(({ cardId }) => cardId)).not.toContain("BT10-060");
  expect(observe(s.engine).hasKeyword(s.perm("ally"), "Blocker")).toBe(true);
});

it("keeps the Sparrowmon follow-up when the optional placement has no candidate", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT12-084", as: "jet", under: ["BT10-060"] },
          { card: "BT1-009", as: "ally" },
        ],
      },
    },
    { autoDeclineOptional: true },
  );
  await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("jet"));
  expect(observe(s.engine).hasKeyword(s.perm("ally"), "Blocker")).toBe(true);
});

it("does not grant the follow-up without Sparrowmon in the stack", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT12-084", as: "jet" },
          { card: "BT1-009", as: "ally" },
        ],
      },
    },
    { autoDeclineOptional: true },
  );
  await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("jet"));
  expect(observe(s.engine).hasKeyword(s.perm("ally"), "Blocker")).toBe(false);
  expect(observe(s.engine).isRestricted(s.perm("ally"), "beReturned")).toBe(false);
});

it("keeps the protection after resolution against hand and deck returns", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT12-084", as: "jet", under: ["BT10-060"] },
          { card: "BT1-009", as: "ally" },
        ],
        deck: ["BT1-010"],
      },
      1: { deck: ["BT1-001"] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("jet"));
  const allyId = s.perm("ally").topCard!.instanceId;
  const allyPermanentId = s.perm("ally").permanentId;
  await advance(s.engine).verb.returnToHand([allyId]);
  await advance(s.engine).verb.returnToDeck([allyId], { toTop: false });
  expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === allyPermanentId)).toBe(true);

  s.state.turnSeat = 1;
  const opponentTurn = s.engine.runOneTurn();
  await advance(s.engine).waitForMainPhase(1);
  expect(observe(s.engine).hasKeyword(s.perm("ally"), "Blocker")).toBe(true);
  expect(observe(s.engine).isRestricted(s.perm("ally"), "beReturned")).toBe(true);
  advance(s.engine).endMainPhaseIfOpen(1);
  await opponentTurn;
  expect(observe(s.engine).hasKeyword(s.perm("ally"), "Blocker")).toBe(false);
  expect(observe(s.engine).isRestricted(s.perm("ally"), "beReturned")).toBe(false);
  await advance(s.engine).verb.returnToHand([allyId]);
  expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === allyPermanentId)).toBe(false);
});

it("unsuspends only for another own Digimon and only once per turn", async () => {
  const s = setupEngine({
    0: {
      battleArea: [
        { card: "BT12-084", as: "jet", suspended: true },
        { card: "BT1-009", as: "ownFirst", dp: 3000 },
        { card: "BT1-009", as: "ownSecond", dp: 3000 },
      ],
    },
    1: {
      battleArea: [
        { card: "BT1-009", as: "opponentFirst", dp: 3000, suspended: true },
        { card: "BT1-009", as: "opponentSecond", dp: 3000, suspended: true },
      ],
    },
  });
  await s.ready();
  const jetId = s.perm("jet").permanentId;
  const ownFirstId = s.perm("ownFirst").permanentId;
  const ownSecondId = s.perm("ownSecond").permanentId;
  const opponentFirstId = s.perm("opponentFirst").permanentId;
  const opponentSecondId = s.perm("opponentSecond").permanentId;

  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: ownFirstId,
      target: { kind: "permanent", permanentId: opponentFirstId },
    }),
  ).toEqual({ ok: true });
  await settle(
    () =>
      !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === ownFirstId) &&
      !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === opponentFirstId) &&
      !s.perm("jet").isSuspended,
  );
  expect(s.events.filter((event) => event.kind === "combatResolved")).toHaveLength(1);
  expect(s.events.find((event) => event.kind === "combatResolved")).toMatchObject({
    deletedPermanentIds: expect.arrayContaining([ownFirstId, opponentFirstId]),
  });
  expect(s.perm("jet").isSuspended).toBe(false);

  await advance(s.engine).verb.suspend([jetId]);
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: ownSecondId,
      target: { kind: "permanent", permanentId: opponentSecondId },
    }),
  ).toEqual({ ok: true });
  await settle(
    () =>
      !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === ownSecondId) &&
      !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === opponentSecondId),
  );
  expect(s.perm("jet").isSuspended).toBe(true);
});

it("does not unsuspend when only an opponent Digimon is deleted in battle", async () => {
  const s = setupEngine({
    0: {
      battleArea: [
        { card: "BT12-084", as: "jet", suspended: true },
        { card: "BT1-009", as: "attacker", dp: 5000 },
      ],
    },
    1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 3000, suspended: true }] },
  });
  await s.ready();
  const attackerId = s.perm("attacker").permanentId;
  const opponentId = s.perm("opponent").permanentId;

  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: attackerId,
      target: { kind: "permanent", permanentId: opponentId },
    }),
  ).toEqual({ ok: true });
  await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === opponentId));
  expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === attackerId)).toBe(true);
  expect(s.perm("jet").isSuspended).toBe(true);
});
