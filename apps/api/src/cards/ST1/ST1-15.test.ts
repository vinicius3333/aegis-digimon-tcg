import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./ST1-15.js";

describe("ST1-15 Giga Destroyer", () => {
  it("registers the up-to-two DP boundary and Security activation as complete IR", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [], effects: [
      { trigger: "Main", actions: [{ kind: "Delete", target: { count: 2, upTo: true, filter: { controller: "opponent", dp: { op: "lte", value: 4000 } } } }] },
      { trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] },
    ] });
  });

  it("deletes up to two opposing Digimon with 4000 DP or less", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["ST1-03"], hand: [{ card: "ST1-15", as: "option" }] },
        1: {
          battleArea: [
            { card: "ST1-03", under: [{ card: "ST1-01", as: "source1" }] },
            { card: "ST1-04", under: [{ card: "ST1-02", as: "source2" }] },
            "ST1-06",
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("ST1-06");
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("source1").instanceId, s.inst("source2").instanceId]),
    );
  });

  it("may decline to delete any eligible Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: ["ST1-03"], hand: [{ card: "ST1-15", as: "option" }] },
      1: { battleArea: [{ card: "ST1-04", as: "eligible" }] },
    });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "ST1-15"));

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("eligible").permanentId,
    ]);
  });

  it("activates the same deletion effect from security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "ST1-15", as: "securityOption", faceUp: true }] },
        1: { battleArea: ["ST1-03", "ST1-04"] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
