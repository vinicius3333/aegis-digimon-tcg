import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-016.js";
import "../index.js";

describe("EX5-016 Lunamon", () => {
  it("gains two memory by optionally returning an own Digimon at the start of the main phase", () => {
    const action = compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions?.[0];
    expect(action).toMatchObject({
      kind: "GainMemory",
      amount: 2,
      cost: { kind: "return", target: { filter: { controller: "mine", kind: ["Digimon"] } } },
    });
    expect(action).not.toHaveProperty("optional");
  });
  it("once per turn gains two memory by placing a traited top card at the bottom of its stack", () => {
    const action = compiled.effects?.find((entry) => entry.trigger === "Main")?.actions?.[0];
    expect(action).toMatchObject({
      kind: "GainMemory",
      amount: 2,
      cost: { kind: "place", destination: "digivolutionStack", position: "bottom", host: "self" },
    });
    expect(action).not.toHaveProperty("optional");
  });

  it("returns an own Digimon to hand and gains two memory at the start of the main phase", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX5-016", as: "lunamon" },
            { card: "BT1-009", as: "returnTarget" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("returnTarget").topCard!.instanceId);
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.StartOfYourMainPhase, s.perm("lunamon"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("returnTarget").instanceId));

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-009");
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("lunamon").permanentId),
    ).toBe(true);
  });

  it("places a traited top card under its host for two memory once per turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX5-017", as: "host", under: ["EX5-016"] }] },
    });
    s.state.memory = 0;
    await s.ready();
    const effect = JSON.parse(s.perm("host").activatableEffectsJson || "[]").find(
      (entry: { effectKey: string; description?: string }) => /Gain 2 memory/i.test(entry.description ?? ""),
    );
    expect(effect).toBeDefined();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: effect.instanceId,
        effectKey: effect.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "EX5-016");

    expect(s.state.memory).toBe(2);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["EX5-017"]);
    const remainingEffects = JSON.parse(s.perm("host").activatableEffectsJson || "[]");
    expect(remainingEffects).toHaveLength(0);
    const second = s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: effect.instanceId,
      effectKey: effect.effectKey,
    });
    expect(second).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(2);
  });

  it("does not gain inherited memory when the top card lacks Night Claw or Light Fang", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX5-016"] }] },
    });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("host"));
    await settle(() => false, 30);

    expect(s.state.memory).toBe(0);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["EX5-016"]);
  });
});
