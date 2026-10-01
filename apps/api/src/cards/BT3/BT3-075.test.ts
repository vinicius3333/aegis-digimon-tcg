import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT3-072.js";
import "./BT3-075.js";
import "../ST1/ST1-16.js";
import "../BT1/BT1-072.js";
import "../BT1/BT1-106.js";

describe("BT3-075 Craniamon", () => {
  it("protects own Blocker Digimon from an opponent's deletion effect", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT3-075", as: "craniamon" }] },
        1: {
          battleArea: [{ card: "ST1-03", as: "redSource" }],
          hand: [{ card: "ST1-16", as: "gaiaForce" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("craniamon").permanentId);
    s.state.turnSeat = 1;
    s.state.memory = 10;
    const craniamonId = s.perm("craniamon").permanentId;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("craniamon"), "Blocker")).toBe(true);

    expect(
      s.engine.applyIntent(1, {
        type: "playCard",
        instanceId: s.inst("gaiaForce").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "ST1-16"), 5000);

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === craniamonId)).toBe(true);
  });

  it("protects a Blocker inherited from a stack but not a non-Blocker", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT3-075", as: "craniamon" },
          { card: "BT2-083", as: "inheritedBlocker", under: ["BT3-072"] },
          { card: "BT3-071", as: "nonBlocker" },
        ],
      },
    });

    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("inheritedBlocker"), "Blocker")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("inheritedBlocker"), "beDeleted")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("nonBlocker"), "beDeleted")).toBe(false);
  });
});

describe("BT3-075 Craniamon — KB Q&A rulings", () => {
  it("stops only opponent delete effects; a Blocker still dies at 0 DP or by losing a battle (Q1096)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-075", as: "craniamon", suspended: true },
            { card: "BT1-072", as: "effectTarget" },
            { card: "BT1-072", as: "battleTarget", suspended: true },
          ],
        },
        1: {
          battleArea: [
            { card: "ST1-03", as: "redSource" },
            { card: "BT1-059", as: "attacker" },
          ],
          hand: [
            { card: "ST1-16", as: "gaiaForce" },
            { card: "BT1-106", as: "symphony" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.turnSeat = 1;
    const effectTargetId = s.perm("effectTarget").permanentId;
    const battleTargetId = s.perm("battleTarget").permanentId;
    const isOnField = (permanentId: string) =>
      s.state.players[0]!.battleArea.some((p) => p.permanentId === permanentId);
    preferred.push(s.perm("effectTarget").topCard.instanceId);
    await s.ready();

    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaiaForce").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "ST1-16"), 5000);
    expect(isOnField(effectTargetId)).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(3);

    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("symphony").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !isOnField(effectTargetId), 5000);
    expect(isOnField(effectTargetId)).toBe(false);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: battleTargetId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !isOnField(battleTargetId), 5000);
    expect(isOnField(battleTargetId)).toBe(false);
    expect(isOnField(s.perm("craniamon").permanentId)).toBe(true);
  });
});
