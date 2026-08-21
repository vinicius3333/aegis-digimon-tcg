import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-086.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT21-086.js";

describe("BT21-086 Marcus Damon", () => {
  it("registers the three printed timing windows and a real On Play suspension effect", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.map((effect) => effect.trigger)).toEqual([
      "StartOfYourMainPhase",
      "OnPlay",
      "AllTurns",
      "Security",
    ]);
  });

  it("suspends a Marcus Damon on the field when played", async () => {
    const setup = setupEngine(
      {
        0: {
          hand: [{ card: "BT21-086", as: "newMarcus" }],
          battleArea: [{ card: "BT21-086", as: "existingMarcus" }],
          deck: ["BT1-010", "BT1-010"],
        },
        1: { deck: ["BT1-010", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      setup.engine.applyIntent(0, {
        type: "playCard",
        instanceId: setup.inst("newMarcus").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => setup.perm("existingMarcus").isSuspended, 200);

    expect(setup.perm("existingMarcus").isSuspended).toBe(true);
  });

  it("grants Piercing and +3000 DP to the same Digimon, then gives an opponent -3000 DP", async () => {
    const setup = setupEngine(
      {
        0: {
          hand: [{ card: "BT21-086", as: "newMarcus" }],
          battleArea: [
            { card: "BT21-086", as: "existingMarcus" },
            { card: "BT1-009", as: "ally" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    setup.state.memory = 10;

    expect(
      setup.engine.applyIntent(0, {
        type: "playCard",
        instanceId: setup.inst("newMarcus").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        observe(setup.engine).hasPierce(setup.perm("ally")) &&
        setup.perm("ally").currentDP === 6000 &&
        setup.perm("opponent").currentDP === 0,
    );

    expect(observe(setup.engine).hasPierce(setup.perm("ally"))).toBe(true);
    expect(setup.perm("ally").currentDP).toBe(6000);
    expect(setup.perm("opponent").currentDP).toBe(0);
  });
});
