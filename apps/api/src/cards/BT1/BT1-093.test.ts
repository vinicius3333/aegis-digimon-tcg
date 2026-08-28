import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT1-093.js";

describe("BT1-093 Great Tornado", () => {
  it("gives the same Digimon +2000 DP and Security Attack +1", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-010", as: "chosen" },
            { card: "BT1-011", as: "other" },
          ],
          hand: [{ card: "BT1-093", as: "option" }],
          deck: ["BT1-001"],
        },
        1: { security: ["BT1-009", "BT1-012"] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chosen").topCard.instanceId);
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("chosen"), "SecurityAttack"));

    expect(s.perm("chosen").currentDP).toBe(4000);
    expect(s.perm("other").currentDP).toBe(1000);
    expect(observe(s.engine).hasKeyword(s.perm("other"), "SecurityAttack")).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("chosen").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());

    await advance(s.engine).runTurn(0);

    expect(s.perm("chosen").currentDP).toBe(2000);
    expect(observe(s.engine).hasKeyword(s.perm("chosen"), "SecurityAttack")).toBe(false);
  });

  it("resolves without a target decision when the user controls no Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["BT1-085"],
        hand: [{ card: "BT1-093", as: "option" }],
      },
    });
    const optionId = s.inst("option").instanceId;
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));

    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("adds itself from security to its owner's hand", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT1-093", as: "securityOption", faceUp: true }] } });
    const instanceId = s.inst("securityOption").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === instanceId)).toBe(true);
  });
});
