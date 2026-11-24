import { EffectTiming, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-008.js";

describe("BT14-008", () =>
  it("inherits once-per-turn deletion of an opposing 3000 DP or lower Digimon when attacking", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [{ kind: "Delete", target: { filter: { controller: "opponent", dp: { op: "lte", value: 3000 } } } }],
    })));

it("deletes one opposing Digimon at 3000 DP or less when the host attacks", async () => {
  const s = setupEngine(
    {
      0: { battleArea: [{ card: "BT1-014", as: "attacker", under: ["BT14-008"] }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "low" },
          { card: "BT1-020", as: "high" },
        ],
      },
    },
    { autoSelectCards: true },
  );
  s.state.turnSeat = 0;
  s.state.memory = 10;
  const attacker = s.perm("attacker");
  const lowPermanentId = s.state.players[1]!.battleArea[0]!.permanentId;
  const highPermanentId = s.state.players[1]!.battleArea[1]!.permanentId;
  expect(
    s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attacker.permanentId, target: { kind: "player" } }),
  ).toEqual({ ok: true });
  await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === lowPermanentId));
  expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === lowPermanentId)).toBe(false);
  expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === highPermanentId)).toBe(true);
});

it("deletes exactly one 3000 DP target once from a legal Gizamon evolution stack", async () => {
  const s = setupEngine(
    {
      0: {
        breeding: { card: "BT14-001", as: "egg" },
        hand: [
          { card: "BT14-008", as: "gizamon" },
          { card: "BT1-015", as: "greymon" },
        ],
        deck: ["BT1-009", "BT1-009"],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "boundary", dp: 3000 },
          { card: "BT1-009", as: "secondBoundary", dp: 3000 },
          { card: "BT1-009", as: "overBoundary", dp: 4000 },
        ],
        security: ["BT1-009", "BT1-009"],
      },
    },
    { autoSelectCards: true },
  );
  s.state.memory = 5;
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("egg").permanentId,
      instanceId: s.inst("gizamon").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("egg").topCard.cardId === "BT14-008");
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("egg").permanentId,
      instanceId: s.inst("greymon").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("egg").topCard.cardId === "BT1-015");
  expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["BT14-001", "BT14-008"]);

  s.state.phase = Phase.Breeding;
  expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("egg").permanentId })).toEqual({
    ok: true,
  });
  await settle(() => !s.perm("egg").inBreeding);
  s.state.phase = Phase.Main;
  const boundaryId = s.perm("boundary").permanentId;
  const secondBoundaryId = s.perm("secondBoundary").permanentId;
  const overBoundaryId = s.perm("overBoundary").permanentId;
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("egg").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === boundaryId));

  expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === overBoundaryId)).toBe(true);
  await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("egg"));
  await settle();
  expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === secondBoundaryId)).toBe(true);
  assertNoLoudGap(s);
});

it("resets the inherited deletion trigger on the next natural turn", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT1-014", under: ["BT14-008"], as: "attacker" }],
        deck: Array(8).fill("BT1-009"),
      },
      1: {
        hand: ["BT1-009"],
        battleArea: [
          { card: "BT1-009", as: "first" },
          { card: "BT1-009", as: "second" },
        ],
        security: ["BT1-091", "BT1-091"],
        deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 10;

  const firstTurn = s.engine.runOneTurn();
  await advance(s.engine).waitForMainPhase(0);
  const firstId = s.perm("first").permanentId;
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({
    ok: true,
  });
  await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === firstId));
  expect(s.state.players[1]!.battleArea).toHaveLength(1);
  advance(s.engine).endMainPhaseIfOpen(0);
  await firstTurn;

  s.state.turnSeat = 1;
  s.state.memory = 3;
  await advance(s.engine).runTurn(1);
  s.state.turnSeat = 0;
  s.state.memory = 3;

  const secondTurn = s.engine.runOneTurn();
  await advance(s.engine).waitForMainPhase(0);
  const secondId = s.perm("second").permanentId;
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({
    ok: true,
  });
  await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === secondId));
  expect(s.state.players[1]!.battleArea).toHaveLength(0);
  advance(s.engine).endMainPhaseIfOpen(0);
  await secondTurn;
  assertNoLoudGap(s);
});
