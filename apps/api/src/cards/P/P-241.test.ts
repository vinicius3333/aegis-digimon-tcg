import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-241.js";

describe("P-241 Yujin Ozora", () => {
  it("sets memory to three at the start of turn when memory is two or less", () => {
    expect(runtimeCompiledCard("P-241")!.effects).toContainEqual(
      expect.objectContaining({
        trigger: "StartOfYourTurn",
        actions: [
          { kind: "SetMemory", value: 3, condition: expect.objectContaining({ kind: "memoryAtMost", value: 2 }) },
        ],
      }),
    );
  });

  it("handles linking in one trigger: grants Appmon Vortex and DP, then permits App Fuse", () => {
    expect(runtimeCompiledCard("P-241")!.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        actions: [
          expect.objectContaining({
            kind: "SubTrigger",
            event: "whenLinked",
            sourceFilter: { controller: "mine", kind: ["Digimon"] },
            actions: [
              expect.objectContaining({
                kind: "GainKeyword",
                duration: "forTheTurn",
                cost: expect.objectContaining({ kind: "suspend" }),
              }),
              expect.objectContaining({ kind: "ModifyDP", amount: 3000, duration: "forTheTurn" }),
              expect.objectContaining({ kind: "AppFuse", optional: true }),
            ],
          }),
        ],
      }),
    );
  });

  it("grants the Leviathan trait by Rule and plays from Security", () => {
    const effects = runtimeCompiledCard("P-241")!.effects;
    expect(effects).toContainEqual(
      expect.objectContaining({
        trigger: "Rule",
        actions: [expect.objectContaining({ kind: "GrantStatic", grant: "trait", tokens: ["Leviathan"] })],
      }),
    );
    expect(effects).toContainEqual(
      expect.objectContaining({
        trigger: "Security",
        isSecurity: true,
        actions: [expect.objectContaining({ kind: "PlayWithoutCost" })],
      }),
    );
  });
});
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("P-241 engine behavior", () => {
  it("plays itself without cost from Security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "P-241", as: "yujin" }] } });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("yujin"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("yujin").instanceId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("yujin").instanceId)).toBe(true);
  });
});
