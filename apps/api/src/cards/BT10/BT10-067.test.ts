import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../EX2/EX2-038.js";
import "./BT10-067.js";

describe("BT10-067 Justimon: Critical Arm", () => {
  it("returns a different Justimon source to delete exactly one play-cost-9-or-less Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-038", as: "base" }],
          hand: [{ card: "BT10-067", as: "evolving" }],
        },
        1: {
          battleArea: [
            { card: "BT10-026", as: "costNine" },
            { card: "BT1-080", as: "costTen" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("costNine").permanentId);
    const baseId = s.perm("base").topCard.instanceId;
    const costNineId = s.perm("costNine").permanentId;
    const costTenId = s.perm("costTen").permanentId;
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === costNineId));

    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === baseId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === costTenId)).toBe(true);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("cannot pay the digivolution effect with another Critical Arm source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-067", as: "base" }],
          hand: [{ card: "BT10-067", as: "evolving" }],
        },
        1: { battleArea: [{ card: "BT10-026", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT10-067"));

    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toContain("BT10-067");
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === targetId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("does not offer its attack-time arm swap without a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-067", as: "criticalArm" }],
          hand: [{ card: "EX2-038", as: "blitzArm" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: false, autoSelectCards: false },
    );
    const blitzArmId = s.inst("blitzArm").instanceId;
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("criticalArm").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.perm("criticalArm").topCard.cardId).toBe("BT10-067");
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === blitzArmId)).toBe(true);
    expect(s.state.memory).toBe(2);
    assertNoLoudGap(s);
  });
});
