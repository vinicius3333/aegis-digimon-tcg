import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT8/BT8-059.js";
import "../EX2/EX2-038.js";
import "../EX2/EX2-062.js";
import "./BT10-067.js";

describe("BT10/EX2 Justimon Arm-swap deck gauntlet", () => {
  it("returns Blitz Arm as Critical Arm's cost, then reuses that exact card to digivolve while attacking", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-038", as: "blitzArmBase" },
            { card: "EX2-062", as: "ryo" },
          ],
          hand: [{ card: "BT10-067", as: "criticalArm" }],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
        1: {
          battleArea: [{ card: "BT2-047", as: "deleteTarget" }],
          security: ["BT1-009"],
          deck: ["BT1-010"],
        },
      },
      {
        autoAcceptOptional: true,
        autoChooseOption: true,
        preferOptionIndex: 1,
        autoOrderTriggers: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      },
    );
    const blitzArmId = s.perm("blitzArmBase").topCard.instanceId;
    const deleteTargetId = s.perm("deleteTarget").permanentId;
    preferred.push(blitzArmId);
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blitzArmBase").permanentId,
        instanceId: s.inst("criticalArm").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.hand.some(({ instanceId }) => instanceId === blitzArmId) &&
        !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === deleteTargetId) &&
        s.state.pendingDecision === undefined,
      5000,
    );
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT10-067"));

    expect(s.perm("blitzArmBase").topCard.cardId).toBe("BT10-067");
    expect(s.perm("blitzArmBase").stack).toHaveLength(0);
    expect(s.state.memory).toBe(3);

    const combatCount = s.events.filter(({ kind }) => kind === "combatResolved").length;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("blitzArmBase").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("blitzArmBase").topCard.instanceId === blitzArmId &&
        s.events.filter(({ kind }) => kind === "combatResolved").length > combatCount &&
        !observe(s.engine).isAttacking(),
      5000,
    );

    expect(s.perm("blitzArmBase").stack.map(({ cardId }) => cardId)).toEqual(["BT10-067"]);
    expect(s.perm("blitzArmBase").isSuspended).toBe(false);
    expect(s.perm("ryo").isSuspended).toBe(true);
    expect(s.perm("blitzArmBase").currentDP).toBe(12_000);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.memory).toBe(1);
    assertNoLoudGap(s);
  });

  it("keeps Critical Arm in place when Kokuwamon forbids ignoring requirements", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-038", as: "blitzArmBase" },
            { card: "EX2-062", as: "ryo" },
          ],
          hand: [{ card: "BT10-067", as: "criticalArm" }],
          deck: ["BT1-001", "BT1-002"],
        },
        1: {
          battleArea: [
            { card: "BT8-059", as: "kokuwamon" },
            { card: "BT2-047", as: "deleteTarget" },
          ],
          security: ["BT1-009"],
          deck: ["BT1-010"],
        },
      },
      {
        autoAcceptOptional: true,
        autoChooseOption: true,
        preferOptionIndex: 1,
        autoOrderTriggers: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      },
    );
    const blitzArmId = s.perm("blitzArmBase").topCard.instanceId;
    preferred.push(blitzArmId, s.perm("deleteTarget").permanentId);
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blitzArmBase").permanentId,
        instanceId: s.inst("criticalArm").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.hand.some(({ instanceId }) => instanceId === blitzArmId) &&
        s.state.pendingDecision === undefined,
    );
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT10-067"));

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("blitzArmBase").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("blitzArmBase").topCard.cardId).toBe("BT10-067");
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === blitzArmId)).toBe(true);
    expect(s.state.memory).toBe(3);
    assertNoLoudGap(s);
  });
});
