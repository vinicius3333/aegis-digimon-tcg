import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT2-050.js";

describe("BT2-050 Argomon", () => {
  it("may suspend one of its Digimon to reduce its digivolution cost by 3", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-046", as: "base" },
            { card: "BT2-043", as: "payer" },
          ],
          hand: [{ card: "BT2-050", as: "evolving" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("payer").topCard!.instanceId);
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("payer").isSuspended && s.perm("base").topCard?.cardId === "BT2-050" && s.state.memory === 3,
    );

    expect(s.state.memory).toBe(3);
    expect(s.perm("payer").isSuspended).toBe(true);
  });

  it("may decline Digisorption and pay the full digivolution cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-046", as: "base" },
            { card: "BT2-043", as: "payer" },
          ],
          hand: [{ card: "BT2-050", as: "evolving" }],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: false },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT2-050" && s.state.memory === 0);

    expect(s.state.memory).toBe(0);
    expect(s.perm("payer").isSuspended).toBe(false);
  });

  it("checks 1 additional security for each other suspended Digimon during its turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-050", as: "argomon" },
          { card: "BT1-010", suspended: true, as: "first" },
          { card: "BT1-011", suspended: true, as: "second" },
          { card: "BT1-085", suspended: true, as: "tamer" },
        ],
      },
      1: {
        battleArea: [{ card: "BT2-043", suspended: true, as: "opponentDigimon" }],
        security: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
      },
    });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).keywordAmount(s.perm("argomon"), "SecurityAttack")).toBe(2);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("argomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("does not gain Security Attack outside its controller's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-050", as: "argomon" },
          { card: "BT1-010", suspended: true },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).keywordAmount(s.perm("argomon"), "SecurityAttack")).toBe(0);
  });
});
