import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-034.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-034", () => {
  it("has Training", () =>
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords).toContainEqual({
      keyword: "Training",
      raw: "＜Training＞",
    }));
  it("inherits Piercing", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Piercing",
      raw: "＜Piercing＞",
    }));
  it("has the alternate zero-cost DM level 2 evolution requirement", () =>
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["DM"], cost: 0, isAlternate: true }]));

  it("digivolves publicly from a level 2 DM Digimon without spending memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-003", as: "host" }], hand: [{ card: "EX9-034", as: "evo" }] },
    });
    s.state.memory = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evo").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("host").topCard.cardId).toBe("EX9-034");
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(["EX9-003"]);
    expect(s.state.memory).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("activates Training by suspending and placing the deck top face-down underneath", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX9-034", as: "source", under: ["EX9-004"] }], deck: ["BT1-009"] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    const source = s.perm("source");
    const [entry] = observe(s.engine).activatableEffects(source) as Array<{ effectKey: string; instanceId: string }>;
    expect(entry?.instanceId).toBe(source.topCard.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: entry!.instanceId,
        effectKey: entry!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(source.isSuspended).toBe(true);
    expect(source.stack.map(({ cardId }) => cardId)).toEqual(["BT1-009", "EX9-004"]);
    expect(source.stack[0]?.faceUp).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it.each([true, false])("checks security after battle only with inherited Piercing: %s", async (inherited) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-071", as: "host", under: inherited ? ["EX9-034"] : [] }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }], security: ["BT1-012"] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    const host = s.perm("host");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: host.permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === host.permanentId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(inherited ? 0 : 1);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-012")).toBe(inherited);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
