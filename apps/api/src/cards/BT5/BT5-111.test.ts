import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT5-111.js";

describe("BT5-111 Omnimon X Antibody", () => {
  it("digivolves over an Omnimon in the battle area for 3 memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT5-086", as: "base" }],
        hand: [{ card: "BT5-111", as: "evolving" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT5-111");

    expect(s.state.memory).toBe(0);
  });

  it("Q1385 rejects the Omnimon shortcut in the breeding area", () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT5-086", as: "base" },
        hand: [{ card: "BT5-111", as: "evolving" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("requires the alternate shortcut's Omnimon name gate", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT5-082", as: "base" }],
        hand: [{ card: "BT5-111", as: "evolving" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("carries the battle-area-only gate on the registered shortcut requirement", () => {
    expect(runtimeCompiledCard("BT5-111")?.digivolutionRequirement).toContainEqual({
      names: ["Omnimon"],
      cost: 3,
      isAlternate: true,
      battleAreaOnly: true,
    });
  });

  it("deletes an opposing Digimon with DP at most its own when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT5-111", as: "omni" }] },
        1: {
          battleArea: [
            { card: "BT4-073", as: "target", dp: 15000 },
            { card: "BT4-073", as: "safe", dp: 15001 },
          ],
          security: ["BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("omni").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT4-073")).toBe(true);
  });

  it("trashes 2 of its sources to end an opponent's attack before the security check", async () => {
    const preferredSourceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT5-111",
              as: "omni",
              under: [
                { card: "BT5-014", as: "sourceA" },
                { card: "BT5-019", as: "sourceB" },
                { card: "BT5-086", as: "sourceC" },
              ],
            },
          ],
          security: [{ card: "BT1-009", as: "security" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferredSourceIds },
    );
    preferredSourceIds.push(s.inst("sourceA").instanceId, s.inst("sourceB").instanceId);
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.perm("omni").stack.length === 1);

    expect(s.state.players[0]?.security).toHaveLength(1);
    expect(s.state.players[0]?.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("sourceA").instanceId, s.inst("sourceB").instanceId]),
    );
    expect(s.state.players[0]?.trash.map((card) => card.instanceId)).not.toContain(s.inst("sourceC").instanceId);
    expect(s.perm("omni").stack.map((card) => card.instanceId)).toEqual([s.inst("sourceC").instanceId]);
  });

  it("may decline ending an opponent's attack while keeping its sources", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-111", as: "omni", under: ["BT5-014", "BT5-019", "BT5-086"] }],
          security: [{ card: "BT1-009", as: "security" }],
        },
        1: { battleArea: [{ card: "BT5-059", as: "attacker" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT5-111")).toBe(true);
    expect(s.perm("omni").stack).toHaveLength(3);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).not.toEqual(
      expect.arrayContaining(["BT5-014", "BT5-019", "BT5-086"]),
    );
  });

  it("does not end the attack when only one source remains", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-111", as: "omni", under: ["BT5-086"] }],
          security: [{ card: "BT1-009", as: "security" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.perm("omni").stack).toHaveLength(1);
  });
});
