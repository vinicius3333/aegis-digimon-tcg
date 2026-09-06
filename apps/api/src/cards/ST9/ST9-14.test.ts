import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST9-14.js";

describe("ST9-14 Megadeath", () => {
  it("suspends an opponent Digimon then returns a suspended Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: ["ST9-02", "ST9-07"], hand: [{ card: "ST9-14", as: "option" }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "first" },
          { card: "BT1-010", as: "second", suspended: true },
          { card: "BT1-011", as: "unsuspended" },
        ],
      },
    });
    s.state.memory = 5;
    const firstPermanentId = s.perm("first").permanentId;
    const secondInstanceId = s.perm("second").topCard.instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const suspendDecision = s.decisions.at(-1)!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: suspendDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [firstPermanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets" && s.decisions.length >= 2);
    const returnDecision = s.decisions.at(-1)!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: returnDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("unsuspended").permanentId] },
      }),
    ).toMatchObject({ ok: false });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: returnDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("second").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((c) => c.instanceId === secondInstanceId));
    expect(s.state.players[1]!.battleArea.find((p) => p.permanentId === firstPermanentId)?.isSuspended).toBe(true);
    expect(s.state.players[1]!.hand.some((c) => c.instanceId === secondInstanceId)).toBe(true);
  });

  it("activates its Main effect when revealed in Security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "ST9-14", as: "securityOption" }] },
        1: {
          battleArea: [{ card: "BT1-010", as: "second", suspended: true }],
        },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    const returnedInstanceId = s.inst("second").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === returnedInstanceId));
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === returnedInstanceId)).toBe(true);
  });
});
