import { EffectTiming, getCardDefinition, getCompiledCard } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST2-14.js";

describe("ST2-14 Sorrow Blue", () => {
  it("matches the Main and Security restriction durations", () => {
    const definition = getCardDefinition("ST2-14")!;
    const compiled = getCompiledCard("ST2-14")!;

    expect(definition.effectText).toContain("can't attack or block");
    expect(definition.securityEffectText).toContain("can't attack or block");
    expect(compiled.effects).toEqual([
      {
        trigger: "Main",
        actions: [
          {
            kind: "Restrict",
            target: {
              filter: { controllerDefault: "opponent", kind: ["Digimon"], digivolutionCards: "hasNone" },
              count: 1,
            },
            restriction: "attackOrBlock",
            duration: "untilOpponentTurnEnd",
          },
        ],
      },
      {
        trigger: "Security",
        actions: [
          {
            kind: "Restrict",
            target: {
              filter: { controllerDefault: "opponent", kind: ["Digimon"], digivolutionCards: "hasNone" },
              count: 1,
            },
            restriction: "attackOrBlock",
            duration: "untilYourTurnEnd",
          },
        ],
        isSecurity: true,
      },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("prevents one source-less opposing Digimon from attacking or blocking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["ST2-03"],
          hand: [{ card: "ST2-14", as: "option" }],
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [{ card: "ST2-03", as: "target", suspended: true }],
          trash: [{ card: "ST2-01", as: "newSource" }],
          deck: ["BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "attack"));
    expect(observe(s.engine).isRestricted(s.perm("target"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "block")).toBe(true);

    await advance(s.engine).verb.placeUnder(s.perm("target").permanentId, [s.inst("newSource").instanceId]);
    expect(observe(s.engine).isRestricted(s.perm("target"), "attack")).toBe(true);

    await advance(s.engine).runTurn(0);
    expect(observe(s.engine).isRestricted(s.perm("target"), "attack")).toBe(true);
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).isRestricted(s.perm("target"), "attack")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("target"), "block")).toBe(false);
  });

  it("activates the same restriction from security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "ST2-14", as: "securityOption", faceUp: true }],
          deck: ["BT1-001"],
        },
        1: { battleArea: [{ card: "ST2-03", as: "target" }], deck: ["BT1-001"] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(observe(s.engine).isRestricted(s.perm("target"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "block")).toBe(true);
    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).isRestricted(s.perm("target"), "attack")).toBe(true);
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(0);
    expect(observe(s.engine).isRestricted(s.perm("target"), "attack")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("target"), "block")).toBe(false);
  });
});
