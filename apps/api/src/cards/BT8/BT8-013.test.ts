import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT8-013.js";

describe("BT8-013 BetelGammamon", () => {
  it("gains Blitz when digivolving", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "base" }], hand: [{ card: "BT8-013", as: "evolving" }] },
    });
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "Blitz"));
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blitz")).toBe(true);
  });

  it("uses Blitz to attack after the digivolution cost passes memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-008", as: "base" }],
        hand: [{ card: "BT8-013", as: "evolving" }],
      },
      1: { security: ["BT8-034"] },
    });
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(s.state.memory).toBe(-1);
    const blitzDecision = s.state.pendingDecision!;
    expect(JSON.parse(blitzDecision.payloadJson)).toMatchObject({ promptKey: "activateBlitz" });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: blitzDecision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.engine.hasAcceptedBlitzAttack(s.perm("base").permanentId));

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});
