import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT26-034.js";
import "../index.js";
describe("BT26-034 Palmon", () => {
  it("compiles the conditional free hand digivolution", () => {
    expect(digivolutionRequirementsFor("BT26-034")).toContainEqual({
      level: 2,
      traits: ["TS"],
      cost: 0,
      isAlternate: true,
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "Digivolve",
          from: ["hand"],
          payCost: false,
          optional: true,
          condition: { kind: "memoryAtMost", value: 4 },
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "Suspend", optional: true }],
    });
  });
  it("free-digivolves a Vegetation card at four memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-034", as: "palmon", under: ["BT26-001"] }],
          hand: [{ card: "BT26-039", as: "vegetation" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("palmon"));
    expect(s.perm("palmon").topCard.cardId).toBe("BT26-039");
  });

  it("free-digivolves a TS card from the same OR trait filter", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-034", as: "palmon", under: ["BT26-001"] }],
          hand: [{ card: "BT26-038", as: "ts" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("palmon"));

    expect(s.perm("palmon").topCard.cardId).toBe("BT26-038");
  });

  it("Q7007 does not offer the free digivolution at five memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-034", as: "palmon", under: ["BT26-001"] }],
          hand: [{ card: "BT26-039", as: "vegetation" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("palmon"));

    expect(s.perm("palmon").topCard.cardId).toBe("BT26-034");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("vegetation").instanceId]);
    expect(s.state.memory).toBe(5);
  });

  it("may decline the free digivolution at four memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-034", as: "palmon", under: ["BT26-001"] }],
          hand: [{ card: "BT26-039", as: "vegetation" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 4;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("palmon"));

    expect(s.perm("palmon").topCard.cardId).toBe("BT26-034");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("vegetation").instanceId]);
    expect(s.state.memory).toBe(4);
  });

  it("inherited When Attacking suspends one opponent Digimon only once per turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-051", as: "host", under: [{ card: "BT26-034" }] }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
          security: ["BT1-001", "BT1-002", "BT1-003"],
          hand: Array.from({ length: 8 }, () => "BT1-004"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("first").permanentId, s.perm("second").permanentId);
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("first").isSuspended && !observe(s.engine).isAttacking());
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("first").isSuspended).toBe(true);
    expect(s.perm("second").isSuspended).toBe(false);
  });

  it("may decline the inherited suspension", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT11-051", as: "host", under: ["BT26-034"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("opponent").isSuspended).toBe(false);
  });
});
