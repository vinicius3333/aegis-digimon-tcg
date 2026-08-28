import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./ST5-12.js";

describe("ST5-12 Machinedramon", () => {
  it("is fully represented as an up-to-two Reboot grant", () => {
    expect(runtimeCompiledCard("ST5-12")).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "WhenDigivolving",
          actions: [
            {
              kind: "GainKeyword",
              keyword: { keyword: "Reboot" },
              duration: "untilOpponentTurnEnd",
              target: { count: 2, upTo: true },
            },
          ],
        },
      ],
    });
  });

  it("gives up to 2 own Digimon Reboot when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST5-09", as: "base" },
            { card: "ST5-09", as: "other" },
          ],
          hand: [
            { card: "ST5-12", as: "evolving" },
            { card: "ST5-12", as: "otherEvolution" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        observe(s.engine).hasKeyword(s.perm("base"), "Reboot") &&
        observe(s.engine).hasKeyword(s.perm("other"), "Reboot"),
    );
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Reboot")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("other").permanentId,
        instanceId: s.inst("otherEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("other").topCard.instanceId === s.inst("otherEvolution").instanceId);
    expect(observe(s.engine).hasKeyword(s.perm("other"), "Reboot")).toBe(true);
  });
});
