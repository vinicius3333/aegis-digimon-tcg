import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./ST1-13.js";

describe("ST1-13 Shadow Wing", () => {
  it("registers both exact option clauses as complete IR", () => {
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        { trigger: "Main", actions: [{ kind: "ModifyDP", amount: 3000, duration: "forTheTurn" }] },
        {
          trigger: "Security",
          isSecurity: true,
          actions: [{ kind: "GainKeyword", duration: "untilYourTurnEnd", playerWide: true }],
        },
      ],
    });
  });

  it("gives one of your Digimon +3000 DP", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST1-03", as: "target" }], hand: [{ card: "ST1-13", as: "option" }] },
    });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 5000);
    expect(s.perm("target").currentDP).toBe(5000);
  });

  it("gives all of your Digimon Security Attack +1 from security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST1-03", as: "target" }],
        security: [{ card: "ST1-13", as: "securityOption", faceUp: true }],
      },
    });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(1);
  });

  it("also grants Security Attack +1 to Digimon played after security activation, then expires next turn (Q607)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST1-03", as: "existing" }],
        trash: [{ card: "ST1-06", as: "laterDigimon" }],
        security: [{ card: "ST1-13", as: "securityOption", faceUp: true }],
        deck: ["BT1-001", "BT1-002"],
      },
      1: { deck: ["BT1-001", "BT1-002"] },
    });
    s.state.turnSeat = 1;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    await advance(s.engine).verb.playInstances([s.inst("laterDigimon").instanceId]);
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("laterDigimon").instanceId),
    );

    const later = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("laterDigimon").instanceId,
    )!;
    expect(observe(s.engine).keywordAmount(s.perm("existing"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).keywordAmount(later, "SecurityAttack")).toBe(1);

    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(0);

    expect(observe(s.engine).keywordAmount(s.perm("existing"), "SecurityAttack")).toBe(0);
    expect(observe(s.engine).keywordAmount(later, "SecurityAttack")).toBe(0);
  });
});
