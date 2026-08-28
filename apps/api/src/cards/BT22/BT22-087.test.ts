import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-087.js";

describe("BT22-087 Torajiro Asuka", () => {
  it("gains memory only when the opponent has a Digimon", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase");
    expect(effect?.actions[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: {
        kind: "opponentHas",
        filter: { controllerDefault: "opponent", kind: ["Digimon"] },
      },
    });
  });

  it("reacts to any of your Digimon getting linked, then may app fuse", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    const trigger = effect?.actions[0] as any;
    expect(trigger).toMatchObject({
      kind: "SubTrigger",
      event: "whenLinked",
      sourceFilter: { controller: "mine", kind: ["Digimon"] },
    });
    expect(trigger.actions[0]).toMatchObject({
      kind: "CostGatedBlock",
      cost: { kind: "suspend" },
      actions: [
        { kind: "ModifyDP", amount: -2000, duration: "forTheTurn" },
        {
          kind: "AppFuse",
          source: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          into: { controllerDefault: "mine", kind: ["Digimon"] },
          from: ["hand"],
          optional: true,
        },
      ],
    });
    expect(effect).not.toHaveProperty("frequency");
  });

  it("plays itself from security without paying the cost", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Security",
        isSecurity: true,
        actions: [expect.objectContaining({ kind: "PlayWithoutCost", payCost: false })],
      }),
    );
  });

  it("gains exactly 1 memory through observable start-main resolution", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT22-087", as: "torajiro" }] },
      1: { battleArea: ["BT1-009"] },
    });
    const before = s.state.memory;
    await (
      s.engine as unknown as { fireTiming(t: EffectTiming, trigger: Record<string, never>): Promise<void> }
    ).fireTiming(EffectTiming.OnStartMainPhase, {});
    await settle(() => s.state.memory !== before);
    expect(s.state.memory).toBe(before + 1);
  });
});
