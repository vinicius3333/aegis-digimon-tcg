import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-091.js";

describe("BT2-091 Volcanic Flare", () => {
  it("deletes an opposing Digimon at 4000 DP or less", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT2-009"], hand: [{ card: "BT2-091", as: "option" }] },
        1: { battleArea: [{ card: "BT2-043", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("offers only opposing Digimon at the 4000 DP boundary or lower", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-009", as: "ownEligibleDP" }],
        hand: [{ card: "BT2-091", as: "option" }],
      },
      1: {
        battleArea: [
          { card: "BT2-067", as: "belowBoundary" },
          { card: "BT2-071", as: "atBoundary" },
          { card: "BT2-045", as: "aboveBoundary" },
        ],
      },
    });
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const selection = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === selection.decisionId)!.req;

    expect(request.options!.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("belowBoundary").permanentId, s.perm("atBoundary").permanentId]),
    );
    expect(request.options!.candidateInstanceIds).not.toContain(s.perm("aboveBoundary").permanentId);
    expect(request.options!.candidateInstanceIds).not.toContain(s.perm("ownEligibleDP").permanentId);
    expect(request.options).toMatchObject({ min: 1, max: 1 });
  });

  it("does not delete an opposing Digimon above 4000 DP", async () => {
    const s = setupEngine({
      0: { battleArea: ["BT2-009"], hand: [{ card: "BT2-091", as: "option" }] },
      1: { battleArea: [{ card: "BT2-045", as: "target" }] },
    });
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.memory).toBe(0);
  });

  it("activates its Main deletion effect from security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT2-091", as: "securityOption", faceUp: true }] },
        1: { battleArea: [{ card: "BT2-043", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
