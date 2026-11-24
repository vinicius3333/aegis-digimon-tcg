import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-005.js";

describe("BT14-005", () =>
  it("inherits once-per-turn +2000 DP by returning three D-Brigade or DigiPolice cards from trash to deck top", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "ModifyDP",
          amount: 2000,
          cost: { kind: "return", target: { count: 3 }, raw: expect.stringContaining("D-Brigade") },
        },
      ],
    })));

it("returns three matching trash cards to the deck top and gains +2000 DP once", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT14-056", as: "host", under: ["BT14-005"] }],
        trash: ["BT14-056", "BT14-058", "BT14-060"],
      },
      1: { security: ["BT1-091"] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  const host = s.perm("host");
  const before = host.currentDP;
  s.state.memory = 10;
  await (s.engine as unknown as { recomputeContinuousEffects(): Promise<void> }).recomputeContinuousEffects();
  expect(
    s.engine.applyIntent(0, { type: "attack", attackerPermanentId: host.permanentId, target: { kind: "player" } }),
  ).toEqual({ ok: true });
  await settle(() => host.currentDP === before + 2000);

  expect(host.currentDP).toBe(before + 2000);
  expect(s.state.players[0]!.trash).toHaveLength(0);
  expect(s.state.players[0]!.deck.slice(0, 3).map((card) => card.cardId)).toEqual(["BT14-060", "BT14-058", "BT14-056"]);
});

it("pays from a mixed trait pool on a legal Missimon stack and leaves nonmatching trash untouched", async () => {
  const s = setupEngine(
    {
      0: {
        breeding: { card: "BT14-005", as: "missimon" },
        hand: [{ card: "BT14-056", as: "commandramon" }],
        deck: ["BT1-009"],
        trash: ["BT14-056", "BT14-058", "BT14-060", "BT14-057"],
      },
      1: { security: ["BT1-091"] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 3;

  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("missimon").permanentId,
      instanceId: s.inst("commandramon").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("missimon").topCard.cardId === "BT14-056");
  expect(s.perm("missimon").stack.map((card) => card.cardId)).toEqual(["BT14-005"]);

  s.state.phase = Phase.Breeding;
  expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("missimon").permanentId })).toEqual({
    ok: true,
  });
  await settle(() => !s.perm("missimon").inBreeding);
  s.state.phase = Phase.Main;
  const before = s.perm("missimon").currentDP;

  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("missimon").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("missimon").currentDP === before + 2000);

  expect(s.perm("missimon").currentDP).toBe(before + 2000);
  expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT14-057"]);
  assertNoLoudGap(s);
});

it("does not offer or pay the exact-three cost when only two matching cards are in trash", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT14-056", as: "host", under: ["BT14-005"] }],
        trash: ["BT14-056", "BT14-060", "BT14-057"],
      },
      1: { security: ["BT1-091"] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  const before = s.perm("host").currentDP;

  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle();

  expect(s.perm("host").currentDP).toBe(before);
  expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT14-056", "BT14-060", "BT14-057"]);
  assertNoLoudGap(s);
});

it("may decline the exact-three cost without moving trash cards or gaining DP", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT14-056", as: "host", under: ["BT14-005"] }],
        trash: ["BT14-056", "BT14-058", "BT14-060"],
      },
      1: { security: ["BT1-091"] },
    },
    { autoDeclineOptional: true, autoSelectCards: true },
  );
  const host = s.perm("host");
  const before = host.currentDP;
  const trashBefore = s.state.players[0]!.trash.map((card) => card.instanceId);

  expect(
    s.engine.applyIntent(0, { type: "attack", attackerPermanentId: host.permanentId, target: { kind: "player" } }),
  ).toEqual({ ok: true });
  await settle();

  expect(host.currentDP).toBe(before);
  expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(trashBefore);
  assertNoLoudGap(s);
});

it("resets the inherited attack trigger on the next natural turn", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT14-056", as: "host", under: ["BT14-005"] }],
        hand: ["BT1-009"],
        trash: ["BT14-056", "BT14-058", "BT14-060", "BT14-056", "BT14-058", "BT14-060"],
        deck: Array(8).fill("BT1-009"),
      },
      1: {
        hand: ["BT1-009"],
        security: ["BT1-091", "BT1-091"],
        deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 10;

  const firstTurn = s.engine.runOneTurn();
  await advance(s.engine).waitForMainPhase(0);
  const firstBefore = s.perm("host").currentDP;
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({
    ok: true,
  });
  await settle(() => s.perm("host").currentDP === firstBefore + 2000);
  expect(s.perm("host").currentDP).toBe(firstBefore + 2000);
  advance(s.engine).endMainPhaseIfOpen(0);
  await firstTurn;

  s.state.turnSeat = 1;
  s.state.memory = 3;
  await advance(s.engine).runTurn(1);
  s.state.turnSeat = 0;
  s.state.memory = 10;

  const secondTurn = s.engine.runOneTurn();
  await advance(s.engine).waitForMainPhase(0);
  const secondBefore = s.perm("host").currentDP;
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({
    ok: true,
  });
  await settle(() => s.perm("host").currentDP === secondBefore + 2000);
  expect(s.perm("host").currentDP).toBe(secondBefore + 2000);
  expect(s.state.players[0]!.trash).toHaveLength(0);
  advance(s.engine).endMainPhaseIfOpen(0);
  await secondTurn;
  assertNoLoudGap(s);
});
