import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT15-009.js";

describe("BT15-009", () => {
  it("once per turn pays 2 memory to delete an opposing Digimon at or below this source's DP", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Main", frequency: "OncePerTurn" });
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "Delete",
      target: { count: 1, filter: { dp: { op: "lte", relativeToSource: true } } },
      cost: { kind: "payMemory", memory: 2 },
    });
  });

  it("pays exactly 2 memory and deletes one opposing Digimon at the source's current-DP boundary", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT15-009", as: "meramon", dp: 4000, under: ["BT1-009"] }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "equal", dp: 4000 },
            { card: "BT1-009", as: "above", dp: 5000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const [effect] = observe(s.engine).activatableEffects(s.perm("meramon")) as { effectKey: string }[];
    const equalId = s.perm("equal").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("meramon").topCard.instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === equalId));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("above").permanentId,
    ]);
    expect(observe(s.engine).activatableEffects(s.perm("meramon"))).toHaveLength(0);
  });

  it("does not pay or delete but still spends the activated once-per-turn effect when no target exists", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT15-009", as: "meramon", dp: 4000, under: ["BT1-009"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "above", dp: 5000 }] },
    });
    s.state.memory = 3;
    await s.ready();

    const [effect] = observe(s.engine).activatableEffects(s.perm("meramon")) as { effectKey: string }[];
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("meramon").topCard.instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.memory).toBe(3);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(observe(s.engine).activatableEffects(s.perm("meramon"))).toHaveLength(0);
  });
});
