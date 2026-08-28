import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT1-098.js";

describe("BT1-098 V-Nova Blast", () => {
  it("gives exactly 1 Digimon Jamming so it survives battle against a stronger Security Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-028", as: "target" },
            { card: "BT1-029", as: "other" },
          ],
          hand: [{ card: "BT1-098", as: "option" }],
          deck: ["BT1-001"],
        },
        1: { security: ["BT1-025"] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").topCard.instanceId);
    const targetId = s.perm("target").permanentId;
    s.state.memory = 2;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(targetId, "Jamming"));

    expect(observe(s.engine).hasKeyword(s.perm("other"), "Jamming")).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: targetId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea.some((entry) => entry.permanentId === targetId)).toBe(true);
    await advance(s.engine).runTurn(0);
    expect(observe(s.engine).hasKeyword(targetId, "Jamming")).toBe(false);
  });

  it("resolves without a target decision when the user controls no Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["BT1-086"],
        hand: [{ card: "BT1-098", as: "option" }],
      },
    });
    const optionId = s.inst("option").instanceId;
    s.state.memory = 2;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));

    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("adds itself from security to its owner's hand", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT1-098", as: "securityOption", faceUp: true }] } });
    const instanceId = s.inst("securityOption").instanceId;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([instanceId]);
  });
});
