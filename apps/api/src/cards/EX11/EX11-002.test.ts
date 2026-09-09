import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX11-002.js";
import "../index.js";

describe("EX11-002 inherited unsuspended-attack permission", () => {
  it("compiles the inherited clause with exact Ice-Snow and opponent-stack filters", () => {
    const compiled = runtimeCompiledCard("EX11-002")!;
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        actions: [
          expect.objectContaining({
            kind: "GrantCanAttackUnsuspended",
            target: expect.objectContaining({
              isSelf: true,
              filter: { isSelfRef: true, nameOrTrait: [{ tokens: ["Ice-Snow"], match: "trait" }] },
            }),
            condition: expect.objectContaining({
              kind: "opponentHasNone",
              filter: { controllerDefault: "opponent", kind: ["Digimon"], digivolutionCards: "hasAny" },
            }),
          }),
        ],
      }),
    );
  });

  it("allows the host Digimon to attack an unsuspended opponent Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX11-014", as: "host", under: ["EX11-002"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    });
    await s.ready();
    await settle(() => s.perm("host").attackablePermanentIds.includes(s.perm("target").permanentId), 400);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    assertNoLoudGap(s);
  });

  it("does not grant the attack when any opposing Digimon has digivolution cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX11-014", as: "host", under: ["EX11-002"] }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "target" },
          { card: "BT1-009", as: "stacked", under: ["BT1-001"] },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).canAttackUnsuspended(s.perm("host"))).toBe(false);
    expect(s.perm("host").attackablePermanentIds).not.toContain(s.perm("target").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    assertNoLoudGap(s);
  });

  it("does not grant the inherited permission to a non-Ice-Snow host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX11-007", as: "host", under: ["EX11-002"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    });
    await s.ready();

    expect(observe(s.engine).canAttackUnsuspended(s.perm("host"))).toBe(false);
    expect(s.perm("host").attackablePermanentIds).not.toContain(s.perm("target").permanentId);
    assertNoLoudGap(s);
  });

  it("treats having no opposing Digimon as satisfying Q6044", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX11-014", as: "host", under: ["EX11-002"] }] },
    });
    await s.ready();

    expect(observe(s.engine).canAttackUnsuspended(s.perm("host"))).toBe(true);
    assertNoLoudGap(s);
  });

  it("applies only on the inherited source controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX11-014", as: "host", under: ["EX11-002"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).canAttackUnsuspended(s.perm("host"))).toBe(false);

    s.state.turnSeat = 0;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).canAttackUnsuspended(s.perm("host"))).toBe(true);
    expect(s.perm("host").attackablePermanentIds).toContain(s.perm("target").permanentId);
    assertNoLoudGap(s);
  });

  it("recalculates the permission after a legal opponent evolution", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX11-014", as: "host", under: ["EX11-002"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "target" }], hand: [{ card: "BT1-014", as: "evolution" }] },
    });
    await s.ready();
    expect(observe(s.engine).canAttackUnsuspended(s.perm("host"))).toBe(true);
    expect(s.perm("host").attackablePermanentIds).toContain(s.perm("target").permanentId);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("target").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard.cardId === "BT1-014");

    s.state.turnSeat = 0;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).canAttackUnsuspended(s.perm("host"))).toBe(false);
    expect(s.perm("host").attackablePermanentIds).not.toContain(s.perm("target").permanentId);
    expect(s.perm("target").stack.map((card) => card.cardId)).toEqual(["BT1-009"]);
    assertNoLoudGap(s);
  });
});
