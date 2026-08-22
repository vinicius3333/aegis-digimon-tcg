import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX11-008.js";

describe("EX11-008 Elizamon", () => {
  it("grants Raid and DP on entry while inheriting the opponent-security memory trigger", () => {
    const compiled = runtimeCompiledCard("EX11-008")!;
    for (const trigger of ["WhenMoving", "OnPlay"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger)!;
      expect(effect.actions).toEqual([
        expect.objectContaining({ kind: "GainKeyword", keyword: { keyword: "Raid", raw: "＜Raid＞" }, duration: "forTheTurn" }),
        expect.objectContaining({ kind: "ModifyDP", amount: 3000, duration: "forTheTurn" }),
      ]);
    }
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          expect.objectContaining({
            kind: "SubTrigger",
            event: "whenSecurityRemoved",
            seat: "opponent",
            actions: [{ kind: "GainMemory", amount: 1 }],
          }),
        ],
      }),
    );
  });

  it("plays through the real engine and buffs one eligible Reptile/Dragonkin", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-007", as: "ally", dp: 1000 }],
          hand: [{ card: "EX11-008", as: "elizamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const ally = s.perm("ally");
    const initialDP = ally.currentDP;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("elizamon").instanceId })).toEqual({ ok: true });
    await settle(() => ally.currentDP === initialDP + 3000, 600);

    expect(ally.currentDP).toBe(initialDP + 3000);
    expect(observe(s.engine).hasKeyword(ally, "Raid")).toBe(true);
  });
});
