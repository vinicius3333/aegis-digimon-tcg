import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-062.js";

describe("P-062 Hiro Amanokawa", () => {
  it("suspends to give Security Attack +1 to an attacker with Gammamon in its sources", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "P-062", as: "hiro" },
          { card: "BT9-023", as: "attacker", under: ["P-059"] },
        ],
      },
      1: { security: ["BT1-001", "BT1-002"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const prompt = s.decisions.at(-1)!.req;
    expect(prompt.sourceCardId).toBe("P-062");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: prompt.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("hiro").isSuspended && s.state.players[1]!.security.length === 0);

    expect(s.perm("hiro").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === "P-062")).toHaveLength(1);
  });

  it("does not grant Security Attack when Hiro is already suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-062", as: "hiro", suspended: true },
            { card: "BT9-023", as: "attacker", under: ["P-059"] },
          ],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(0);
  });

  it("does not treat a Gammamon-form name as the exact Gammamon source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-062", as: "hiro" },
            { card: "BT10-011", as: "attacker", under: ["BT9-023"] },
          ],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("hiro").isSuspended).toBe(false);
    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(0);
  });

  it("plays itself from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "P-062", as: "hiro", faceUp: true }] } });
    const hiroId = s.inst("hiro").instanceId;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("hiro"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === hiroId)).toBe(true);
  });
});
