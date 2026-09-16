import { describe, it, expect } from "vitest";
import { getCardDefinition, type PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";
import { compiled } from "./BT11-059.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { definitionMatches } from "../../engine/effects/interpreter/matching/definition.js";

async function paidToEvolveIntoBT11059(tamerCardIds: string[]) {
  const s = setupEngine({
    0: {
      battleArea: [{ card: "BT1-075", dp: 5000, as: "base" }, ...tamerCardIds.map((id) => ({ card: id, dp: 0 }))],
      hand: [{ card: "BT11-059", faceUp: false, as: "evolving" }],
    },
  });
  const p0 = s.state.players[0] as PlayerState;
  s.state.memory = 10;

  await s.engine.recomputeContinuousEffects();
  const before = s.state.memory;
  s.engine.applyIntent(0, {
    type: "digivolve",
    permanentId: s.perm("base").permanentId,
    instanceId: s.inst("evolving").instanceId,
  });
  await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === "BT11-059"));
  const evolved = p0.battleArea.some((p) => p.topCard?.cardId === "BT11-059");
  return { paid: before - s.state.memory, evolved };
}

describe("A3 BT11-059 — digivolve cost reduced per green/black Tamer (Q2092 dual=1)", () => {
  it("maps catalog facts and both executable clauses", () => {
    expect(getCardDefinition("BT11-059")).toMatchObject({
      cardId: "BT11-059",
      colors: ["Green", "Black"],
      level: 6,
      playCost: 13,
      dp: 13000,
    });
    expect(compiled.effects).toHaveLength(2);
  });

  it("scopes the cost replacement to the BT11-059 card number", () => {
    const replacement = compiled.effects[0]!.actions[0]!;
    if (replacement.kind !== "Replacement") throw new Error("BT11-059 cost action is not Replacement");
    const into = replacement.into;
    if (!into) throw new Error("BT11-059 replacement has no target filter");
    const definition = (cardId: string) => {
      const card = getCardDefinition(cardId);
      if (!card) throw new Error(`Missing card definition: ${cardId}`);
      return card;
    };
    expect(into).toEqual({ cardId: "BT11-059" });
    expect(definitionMatches(into, definition("BT11-059"))).toBe(true);
    expect(definitionMatches(into, definition("BT2-051"))).toBe(false);
    expect(definitionMatches(into, definition("P-113"))).toBe(false);
    expect(definitionMatches(into, definition("P-173"))).toBe(false);
  });

  it("0 Tamers pays the printed evoCost 5 (revert-equivalent baseline)", async () => {
    const { paid, evolved } = await paidToEvolveIntoBT11059([]);
    expect(evolved).toBe(true);
    expect(paid).toBe(5);
  });

  it("2 distinct green/black Tamers reduce the cost by 2 (5 - 2 = 3)", async () => {
    const { paid, evolved } = await paidToEvolveIntoBT11059(["BT1-088", "BT10-092"]);
    expect(evolved).toBe(true);
    expect(paid).toBe(3);
  });

  it("Q2092: one green+black DUAL-color Tamer counts as 1, reducing by exactly 1 (5 - 1 = 4)", async () => {
    const { paid, evolved } = await paidToEvolveIntoBT11059(["BT23-083"]);
    expect(evolved).toBe(true);
    expect(paid).toBe(4);
  });
});

describe("BT11-059 battle deletion trigger", () => {
  it("unsuspends only when RustTyrannomon itself deletes in battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT11-059", as: "rust", suspended: true },
          { card: "BT1-075", as: "other" },
        ],
        deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "otherVictim", suspended: true },
          { card: "BT1-009", as: "rustVictim", suspended: true },
        ],
        deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
      },
    });
    const otherVictimId = s.perm("otherVictim").permanentId;
    const rustVictimId = s.perm("rustVictim").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("other").permanentId,
        target: { kind: "permanent", permanentId: otherVictimId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === otherVictimId));
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("rust").isSuspended).toBe(true);
    await advance(s.engine).verb.unsuspend([s.perm("rust").permanentId]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("rust").permanentId,
        target: { kind: "permanent", permanentId: rustVictimId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => !s.state.players[1]!.battleArea.some((p) => p.permanentId === rustVictimId) && !s.perm("rust").isSuspended,
    );
    await settle(() => !observe(s.engine).isAttacking());
  });

  it("uses its battle-deletion trigger only once per turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-059", as: "rust" }],
        deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "firstVictim", suspended: true },
          { card: "BT1-009", as: "secondVictim", suspended: true },
          { card: "BT1-075", as: "nextTurnVictim", dp: 5000 },
        ],
        deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
      },
    });
    const firstVictimId = s.perm("firstVictim").permanentId;
    const secondVictimId = s.perm("secondVictim").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("rust").permanentId,
        target: { kind: "permanent", permanentId: firstVictimId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === firstVictimId));
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("rust").isSuspended).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("rust").permanentId,
        target: { kind: "permanent", permanentId: secondVictimId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === secondVictimId));
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("rust").isSuspended).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    const nextTurnVictimId = s.perm("nextTurnVictim").permanentId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: nextTurnVictimId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.permanentId === nextTurnVictimId && p.isSuspended));
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("rust").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("rust").permanentId,
        target: { kind: "permanent", permanentId: nextTurnVictimId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some((p) => p.permanentId === nextTurnVictimId) && !s.perm("rust").isSuspended,
    );
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });
});
