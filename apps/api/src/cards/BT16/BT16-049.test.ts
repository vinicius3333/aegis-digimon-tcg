import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-049.js";
import "../index.js";

describe("BT16-049", () => {
  it("gains memory when your Free or yellow Digimon is played or digivolves", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        { kind: "SubTrigger", event: "whenPlayed" },
        { kind: "SubTrigger", event: "whenOneOfYoursDigivolves" },
      ],
    });
    expect(compiled.effects?.[0]?.actions?.[0]).toMatchObject({
      actions: [{ kind: "GainMemory", amount: 1, condition: { kind: "anyOf" } }],
    });
  });

  it("gives itself inherited permanent DP", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }],
    });
  });

  it("gains memory when another Free Digimon is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-049", as: "armadillo" }],
          hand: [{ card: "BT16-032", as: "sheepmon" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sheepmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 1);

    expect(s.state.memory).toBe(1);
  });

  it("applies the inherited DP bonus to the live stack", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT16-032", as: "host", dp: 5000, under: ["BT16-049"] }] } });
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("host").currentDP).toBe(6000);
  });
});
