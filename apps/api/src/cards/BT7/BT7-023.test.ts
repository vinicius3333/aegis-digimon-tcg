import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT7-023.js";

describe("BT7-023 Korikakumon", () => {
  it("publishes the blue-Tamer evolution path and one shared attack-or-block target", () => {
    const compiled = runtimeCompiledCard("BT7-023");
    const staticDigivolve = compiled?.effects
      .find((effect) => effect.trigger === "Static")
      ?.actions.find((action) => action.kind === "Digivolve");
    expect(staticDigivolve).toMatchObject({
      kind: "Digivolve",
      onto: { filter: { controller: "mine", kind: ["Tamer"], colors: ["Blue"] }, count: 1 },
      asLevel: 3,
      from: "hand",
    });

    const whenDigivolving = compiled?.effects.find((effect) => effect.trigger === "WhenDigivolving");
    expect(whenDigivolving?.actions).toHaveLength(1);
    expect(whenDigivolving?.actions[0]).toMatchObject({
      kind: "Restrict",
      restriction: "attackOrBlock",
      duration: "untilOpponentTurnEnd",
      target: { count: 1 },
    });
  });

  it("prevents a source-less opposing Digimon from attacking or blocking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT7-021", as: "base" }], hand: [{ card: "BT7-023", as: "evolving" }] },
        1: { battleArea: [{ card: "BT2-047", as: "target" }], hand: [{ card: "BT1-001", as: "laterSource" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        observe(s.engine).isRestricted(s.perm("target"), "attack") &&
        observe(s.engine).isRestricted(s.perm("target"), "block"),
    );
    expect(observe(s.engine).isRestricted(s.perm("target"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "block")).toBe(true);

    await advance(s.engine).verb.placeUnder(s.perm("target").permanentId, [s.inst("laterSource").instanceId]);

    expect(s.perm("target").stack).toHaveLength(1);
    expect(observe(s.engine).isRestricted(s.perm("target"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "block")).toBe(true);
  });
});
