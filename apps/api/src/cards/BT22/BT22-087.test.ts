import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
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
    await advance(s.engine).fireGlobal(EffectTiming.OnStartMainPhase);
    await settle(() => s.state.memory !== before);
    expect(s.state.memory).toBe(before + 1);
  });

  it("suspends from a public link and applies the temporary DP reduction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-087", as: "torajiro" },
            { card: "BT21-009", as: "host" },
          ],
          hand: [{ card: "BT22-050", as: "link" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("torajiro").isSuspended && s.perm("host").linked.length === 1, 400);

    expect(s.perm("torajiro").isSuspended).toBe(true);
    expect(s.perm("opponent").currentDP).toBe(1000);
  });
});
