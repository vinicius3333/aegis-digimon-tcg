import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT9-029.js";
import "./BT9-054.js";

interface ActivatableEntry {
  instanceId: string;
  effectKey: string;
}

function projectedEffect(instance: { activatableEffectsJson: string }): ActivatableEntry {
  const entries = JSON.parse(instance.activatableEffectsJson) as ActivatableEntry[];
  expect(entries).toHaveLength(1);
  return entries[0]!;
}

describe("BT9 Justimon support — mixed [Hand][Main] activations", () => {
  it("places Suijinmon and Fujinmon under the same Justimon for 1 memory each", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT9-029", as: "suijin" },
            { card: "BT9-054", as: "fujin" },
          ],
          battleArea: [{ card: "EX2-038", as: "justimon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    const suijin = s.inst("suijin");
    const fujin = s.inst("fujin");
    const suijinEffect = projectedEffect(suijin);
    const fujinEffect = projectedEffect(fujin);

    expect(s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: suijin.instanceId,
      effectKey: suijinEffect.effectKey,
    })).toEqual({ ok: true });
    await settle(() =>
      s.perm("justimon").stack.some((card) => card.instanceId === suijin.instanceId) &&
      suijin.activatableEffectsJson === "",
    );

    expect(s.state.memory).toBe(1);
    expect(suijin.activatableEffectsJson).toBe("");
    expect(s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: fujin.instanceId,
      effectKey: fujinEffect.effectKey,
    })).toEqual({ ok: true });
    await settle(() =>
      s.perm("justimon").stack.some((card) => card.instanceId === fujin.instanceId) &&
      fujin.activatableEffectsJson === "",
    );

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.perm("justimon").stack.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT9-029", "BT9-054"]),
    );
    expect(fujin.activatableEffectsJson).toBe("");
  });

  it("does not project either action without a Justimon or Raidenmon host", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT9-029", as: "suijin" },
          { card: "BT9-054", as: "fujin" },
        ],
        battleArea: ["BT1-025"],
      },
    });
    s.state.memory = 2;
    await s.ready();

    expect(s.inst("suijin").activatableEffectsJson).toBe("");
    expect(s.inst("fujin").activatableEffectsJson).toBe("");
  });
});
