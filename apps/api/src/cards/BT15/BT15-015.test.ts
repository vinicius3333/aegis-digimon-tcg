import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT15-015.js";

describe("BT15-015", () => {
  it("once per turn pays 2 memory for Security Attack +1 and may attack", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Main",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "GainKeyword",
          keyword: { keyword: "SecurityAttack", amount: 1 },
          cost: { kind: "payMemory", memory: 2 },
        },
        { kind: "Attack", optional: true },
      ],
    });
  });

  it("pays across the memory boundary, gains Security Attack +1, and completes the optional attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT15-015", as: "skullMeramon" }] },
        1: { security: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    await s.ready();
    const [effect] = observe(s.engine).activatableEffects(s.perm("skullMeramon")) as { effectKey: string }[];

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("skullMeramon").topCard.instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.memory).toBe(-1);
    expect(s.perm("skullMeramon").isSuspended).toBe(true);
    expect(observe(s.engine).activatableEffects(s.perm("skullMeramon"))).toHaveLength(0);
  });

  it("still pays and gains the keyword while suspended, but cannot declare the attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT15-015", as: "skullMeramon", suspended: true }] },
        1: { security: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const [effect] = observe(s.engine).activatableEffects(s.perm("skullMeramon")) as { effectKey: string }[];

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("skullMeramon").topCard.instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);
    await settle();

    expect(observe(s.engine).keywordAmount(s.perm("skullMeramon"), "SecurityAttack")).toBe(1);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(observe(s.engine).activatableEffects(s.perm("skullMeramon"))).toHaveLength(0);
  });

  it("reaches SkullMeramon through its legal red level-4 evolution route", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-013", as: "base" }],
          hand: [{ card: "BT15-015", as: "skullMeramon" }],
          deck: ["BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("skullMeramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT15-015");

    expect(s.state.memory).toBe(3);
    expect(s.perm("base").stack).toHaveLength(1);
  });

  it("pays once per turn when the optional attack is declined, then reopens next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-015", as: "skullMeramon" }],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: { security: ["BT1-009", "BT1-009"], deck: ["BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 0;
    s.state.memory = 5;
    const source = s.perm("skullMeramon").topCard.instanceId;
    const effect = (observe(s.engine).activatableEffects(s.perm("skullMeramon")) as { effectKey: string }[])[0]!;
    expect(
      s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: source, effectKey: effect.effectKey }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const pending = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(3);
    expect(observe(s.engine).keywordAmount(s.perm("skullMeramon"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).activatableEffects(s.perm("skullMeramon"))).toHaveLength(0);

    s.state.memory = 5;
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const nextEffect = (observe(s.engine).activatableEffects(s.perm("skullMeramon")) as { effectKey: string }[])[0]!;
    expect(
      s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: source, effectKey: nextEffect.effectKey }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const nextPending = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: nextPending.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
  });
});
