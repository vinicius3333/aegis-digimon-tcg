import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type SetupEngineOptions } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT3-019.js";

describe("BT3-019 RagnaLoardmon", () => {
  it("places a Legend-Arms card under itself, gains 3 memory, and has its keywords", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-004", as: "base" }],
          hand: [
            { card: "BT3-019", as: "evolving" },
            { card: "BT3-016", as: "material" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const materialId = s.inst("material").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").stack.some((c) => c.instanceId === materialId));
    await settle();
    await s.engine.recomputeContinuousEffects();
    expect(s.state.memory).toBe(3);
    expect(s.perm("base").stack.some((c) => c.instanceId === materialId)).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("base"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Reboot")).toBe(true);
  });

  it("does not gain memory when the optional placement is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-004", as: "base" }],
          hand: [
            { card: "BT3-019", as: "evolving" },
            { card: "BT3-016", as: "material" },
          ],
        },
      },
      { autoAcceptOptional: false },
    );
    s.state.memory = 3;
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
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack).toHaveLength(1);
  });
});

describe("BT3-019 RagnaLoardmon — KB Q&A rulings", () => {
  function digivolveIntoRagnaLoardmon(options: SetupEngineOptions) {
    return setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-004", as: "base", under: [{ card: "BT1-038", as: "lowerSource" }] }],
          hand: [
            { card: "BT3-019", as: "evolving" },
            { card: "BT3-072", as: "material" },
          ],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
        },
        1: { deck: ["BT1-010", "BT1-010", "BT1-010"] },
      },
      options,
    );
  }

  it("lets the player decline placing [Durandamon] or [BryweLudramon] from hand (Q1058)", async () => {
    const s = digivolveIntoRagnaLoardmon({ autoAcceptOptional: false });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(decision.seat).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("material").instanceId)).toBe(true);
    expect(s.perm("base").stack.some((card) => card.instanceId === s.inst("material").instanceId)).toBe(false);
    expect(s.state.memory).toBe(0);
  });

  it("places the chosen card directly under RagnaLoardmon, on top of its digivolution cards (Q1059)", async () => {
    const s = digivolveIntoRagnaLoardmon({ autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 3;
    const baseCardId = s.perm("base").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").stack.some((card) => card.instanceId === s.inst("material").instanceId));
    await settle();

    expect(s.perm("base").topCard.instanceId).toBe(s.inst("evolving").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([
      s.inst("lowerSource").instanceId,
      baseCardId,
      s.inst("material").instanceId,
    ]);
    expect(s.state.memory).toBe(3);
  });

  async function crossToOpponentSideAndResolve(options: SetupEngineOptions) {
    const s = digivolveIntoRagnaLoardmon(options);
    s.state.memory = 1;
    let turnEnded = false;
    const turn = s.engine.runOneTurn().then(() => {
      turnEnded = true;
    });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(1);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    return { s, turn, isTurnEnded: () => turnEnded };
  }

  it("keeps the turn going when the 3 memory gain brings the gauge back to your side (Q1060)", async () => {
    const accepted = await crossToOpponentSideAndResolve({ autoAcceptOptional: true, autoSelectCards: true });
    await settle(() => accepted.s.perm("base").topCard.cardId === "BT3-019" && accepted.s.state.memory === 1);
    await settle();

    expect(accepted.isTurnEnded()).toBe(false);
    expect(accepted.s.state.phase).toBe(Phase.Main);
    expect(accepted.s.state.turnSeat).toBe(0);
    expect(accepted.s.state.memory).toBe(1);
    advance(accepted.s.engine).endMainPhaseIfOpen(0);
    await accepted.turn;

    const declined = await crossToOpponentSideAndResolve({ autoDeclineOptional: true });
    await settle(declined.isTurnEnded);
    expect(declined.s.state.memory).toBe(-2);
    await declined.turn;
  });
});
