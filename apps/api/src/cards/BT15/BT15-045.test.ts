import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT15-045.js";

describe("BT15-045", () => {
  it("suspends an opposing Digimon on play and when digivolving", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "Suspend" }] });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "Suspend" }] });
  });
  it("gains 1 memory once per turn when a green Tamer is played", () =>
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenPlayed", actions: [{ kind: "GainMemory", amount: 1 }] }],
    }));

  it("suspends exactly one opposing Digimon when played", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT15-045", as: "palmon" }] }, 1: { battleArea: [{ card: "BT1-009", as: "target" }] } },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("palmon").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended, 1_500);
    expect(s.perm("target").isSuspended).toBe(true);
  });
});
