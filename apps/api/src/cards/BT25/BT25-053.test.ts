import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT25-053.js";

describe("BT25-053 Aegiochusmon: Green", () => {
  it("suspends an opponent Digimon and grants the <=3-security bonus", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-053", as: "source" }], security: ["BT1-001", "BT1-002", "BT1-003"] },
        1: { battleArea: [{ card: "BT25-046", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.perm("source").currentDP).toBe(13000);
  });

  it("keeps both entry timings and the inherited security-removal watcher", () => {
    const card = runtimeCompiledCard("BT25-053");
    expect(
      card?.effects.filter((effect) => effect.trigger === "OnPlay" || effect.trigger === "WhenDigivolving"),
    ).toHaveLength(2);
    expect(card?.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenSecurityRemoved" }],
    });
  });
});
