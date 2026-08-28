import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT22-010.js";

describe("BT22-010 Meramon", () => {
  it("gates Raid, Piercing, and the optional attack behind the 2-memory Main cost", () => {
    const main = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(main).toMatchObject({ frequency: "OncePerTurn" });
    expect(main?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Raid" },
      duration: "forTheTurn",
      cost: { kind: "payMemory", memory: 2 },
      abortOnDecline: true,
    });
    expect(main?.actions[1]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Piercing" },
      duration: "forTheTurn",
    });
    expect(main?.actions[2]).toMatchObject({
      kind: "Attack",
      target: { filter: { isSelfRef: true }, isSelf: true },
      optional: true,
    });

    const inherited = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(inherited).toMatchObject({
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }],
    });
  });

  it("pays exactly 2 through public Main activation and grants Raid and Piercing", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT22-010", as: "meramon" }] } }, { autoAcceptOptional: true });
    await s.ready();
    const source = (
      s.engine as unknown as { cardSourceOf(card: object): Parameters<typeof effectsOf>[1] }
    ).cardSourceOf(s.perm("meramon").topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith("BT22-010/"),
    )!.effectKey;
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: source.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasPierce(s.perm("meramon")));

    expect(s.state.memory).toBe(3);
    expect(observe(s.engine).hasKeyword(s.perm("meramon"), "Raid")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("meramon"))).toBe(true);
  });

  it("gives the evolved host +2000 DP during its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT22-011", under: ["BT22-010"], as: "host" }] } });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(9000);
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(7000);
  });
});
