import { describe, it, expect } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine as setup, settle, type BoardSpec, type PermanentSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT22-092.js";
import "../index.js";
import { CARD_OF_LEVEL, digivolveOnto } from "./sameLevel.testSupport.js";

const JIMMY = "BT22-092";
const FLAME_DIGIMON = "BT22-010";

it("registers exclusive compiled IR for play and digivolve reactivation", () => {
  const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn");
  expect(effect?.actions).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ kind: "SubTrigger", event: "whenPlayed", sourceFilter: expect.any(Object) }),
      expect.objectContaining({
        kind: "SubTrigger",
        event: "whenOneOfYoursDigivolves",
        sourceFilter: expect.any(Object),
      }),
    ]),
  );
  const whenPlayed = effect?.actions.find((action) => action.kind === "SubTrigger" && action.event === "whenPlayed");
  if (whenPlayed?.kind !== "SubTrigger") throw new Error("missing whenPlayed watcher");
  expect(whenPlayed.actions[0]).toMatchObject({
    kind: "ReactivateEffect",
    fromTrigger: "Main",
    targetSource: "triggerSubject",
    cost: {
      kind: "suspend",
      optional: true,
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
    },
    optional: true,
    abortOnDecline: true,
  });
});

describe("BT22-092 [Start of Your Turn] set memory to 3 when at 2 or less", () => {
  it("sets memory to 3 when it starts at 2 or less", async () => {
    const s = setup({ 0: { battleArea: [{ card: JIMMY, dp: 0, as: "jimmy" }] } });
    s.state.memory = 1;

    await (
      s.engine as unknown as {
        fireTiming(t: EffectTiming, trigger?: Record<string, unknown>): Promise<void>;
      }
    ).fireTiming(EffectTiming.OnStartTurn, {});
    await settle(() => false, 60);

    expect(s.state.memory).toBe(3);
  });

  it("does NOT change memory when it starts above 2", async () => {
    const s = setup({ 0: { battleArea: [{ card: JIMMY, dp: 0, as: "jimmy" }] } });
    s.state.memory = 5;

    await (
      s.engine as unknown as {
        fireTiming(t: EffectTiming, trigger?: Record<string, unknown>): Promise<void>;
      }
    ).fireTiming(EffectTiming.OnStartTurn, {});
    await settle(() => false, 60);

    expect(s.state.memory).toBe(5);
  });

  it("does NOT fire on the opponent's turn start", async () => {
    const s = setup({ 0: { battleArea: [{ card: JIMMY, dp: 0, as: "jimmy" }] } });
    s.state.turnSeat = 1;
    s.state.memory = -1;

    await (
      s.engine as unknown as {
        fireTiming(t: EffectTiming, trigger?: Record<string, unknown>): Promise<void>;
      }
    ).fireTiming(EffectTiming.OnStartTurn, {});
    await settle(() => false, 60);

    expect(s.state.memory).toBe(-1);
  });
});

describe("BT22-092 [Your Turn] Flame/CS Digimon enters -> suspend Jimmy, reactivate its [Main]", () => {
  it("reactivates the real played Flame Digimon Main effect, then gains 1 memory", async () => {
    const s = setup(
      { 0: { battleArea: [{ card: JIMMY, as: "jimmy" }], hand: [{ card: FLAME_DIGIMON, as: "flame" }] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoDeclineOptional: true },
    );
    await s.ready();
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("flame").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("jimmy").isSuspended, 400);

    expect(s.state.memory).toBe(4);
    expect(s.perm("jimmy").isSuspended).toBe(true);
    expect(s.perm("flame").topCard?.cardId).toBe(FLAME_DIGIMON);
  });

  it("reactivates the real Flame Digimon Main effect after a public digivolve", async () => {
    const s = setup(
      {
        0: {
          battleArea: [
            { card: JIMMY, as: "jimmy" },
            { card: "BT22-069", as: "base" },
          ],
          hand: [{ card: FLAME_DIGIMON, as: "flame" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoDeclineOptional: true },
    );
    await s.ready();
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("flame").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("jimmy").isSuspended, 400);

    expect(s.state.memory).toBe(7);
    expect(s.perm("jimmy").isSuspended).toBe(true);
    expect(s.perm("base").topCard?.cardId).toBe(FLAME_DIGIMON);
  });
});

describe("BT22-092 [Security]", () => {
  it("plays itself from security without paying the cost", async () => {
    const s = setup({ 0: { security: [{ card: JIMMY, as: "jimmy", faceUp: true }] } });

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("jimmy"));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("jimmy").instanceId)).toBe(true);
  });
});

describe("BT22-092 Jimmy KEN — KB Q&A rulings", () => {
  function jimmyBoard(base: PermanentSpec, digivolveInto: string): BoardSpec {
    return {
      0: {
        battleArea: [{ card: JIMMY, as: "jimmy" }, base],
        hand: [{ card: digivolveInto, as: "digivolveInto" }],
        deck: ["BT1-010", "BT1-011", "BT1-012"],
      },
      1: { security: ["BT1-009", "BT1-009", "BT1-009"] },
    };
  }

  async function digivolveWithJimmy(board: BoardSpec, memory: number) {
    const s = setup(board, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = memory;
    await s.ready();
    expect(digivolveOnto(s, "base", "digivolveInto")).toEqual({ ok: true });
    await settle(() => s.perm("jimmy").isSuspended);
    await settle(() => s.state.pendingDecision === undefined);
    await advance(s.engine).finishAttack();
    return s;
  }

  it("activates a [Main] effect the digivolved Digimon has only as an inherited effect (Q4961)", async () => {
    const s = await digivolveWithJimmy(jimmyBoard({ card: "BT22-069", as: "base" }, "BT22-072"), 5);

    expect(s.perm("base").topCard.cardId).toBe("BT22-069");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT22-072"]);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.memory).toBe(5 - 3 + 1);
  });

  it("uses up the [Once Per Turn] of the [Main] effect it activated (Q4963)", async () => {
    const s = await digivolveWithJimmy(jimmyBoard({ card: CARD_OF_LEVEL[4], as: "base" }, "BT22-074"), 10);
    expect(s.state.memory).toBe(10 - 4 - 3 + 1);
    expect(s.events.filter((event) => event.kind === "attackDeclared")).toHaveLength(1);

    const skullMeramonMain = observe(s.engine)
      .activatableEffects(s.perm("base"))
      .filter((entry) => entry.effectKey.startsWith("BT22-074/"));
    expect(skullMeramonMain).toEqual([]);
  });
});
