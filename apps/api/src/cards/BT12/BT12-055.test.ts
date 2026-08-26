import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-055.js";

describe("BT12-055 Dinobeemon", () => {
  it("does not apply the DNA-only effects during a non-DNA digivolution window", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-055", as: "dino" }] },
        1: { battleArea: [{ card: "BT12-043", as: "target", dp: 15000 }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    const before = s.perm("dino").currentDP;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("dino"));
    expect(s.perm("dino").currentDP).toBe(before);
    expect(s.perm("target").isSuspended).toBe(false);
  });

  it("still may attack an opponent's Digimon when the digivolution was not DNA", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-055", as: "dino" }] },
        1: { battleArea: [{ card: "BT12-043", as: "target", dp: 15000, suspended: true }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    const dinoId = s.inst("dino").instanceId;
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("dino"), {
      isDnaDigivolve: false,
    });
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(dinoId);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("ends without attacking when no opposing Digimon exists", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT12-055", as: "dino" }] }, 1: { security: ["BT1-009"] } },
      { autoAcceptOptional: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("dino"), {
      isDnaDigivolve: false,
    });
    expect(observe(s.engine).hasAttackedThisTurn(s.perm("dino"))).toBe(false);
  });

  it("DNA digivolves from blue and green level 4s, suspends an opponent, and gains 3000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            // Neutral legal DNA materials make the assertion independent of
            // ExVeemon and Stingmon's own DNA-memory replacement effects.
            { card: "BT1-032", as: "blue" },
            { card: "BT1-069", as: "green" },
          ],
          hand: [{ card: "BT12-055", as: "dino" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT12-043", as: "target", dp: 15000 }] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("blue").permanentId, s.perm("green").permanentId],
        instanceId: s.inst("dino").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea[0]?.topCard.cardId === "BT12-055");
    expect(s.state.memory).toBe(0);
    expect(s.perm("dino").currentDP).toBe(11000);
    expect(s.perm("dino").stack.map(({ cardId }) => cardId)).toEqual(["BT1-032", "BT1-069"]);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it.each([
    ["Imperialdramon name", "BT12-030"],
    ["Free trait", "BT12-022"],
  ])("trashes top security once for a battle deletion by a %s Digimon", async (_case, hostCard) => {
    const s = setupEngine({
      0: { battleArea: [{ card: hostCard, as: "host", under: ["BT12-055"] }] },
      1: {
        battleArea: [{ card: "BT1-009", as: "target", dp: 1000, suspended: true }],
        security: [
          { card: "BT1-009", as: "top" },
          { card: "BT1-010", as: "bottom" },
        ],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    await advance(s.engine).fireForPermanent(EffectTiming.OnBattleDeleteOpponent, s.perm("host"), {
      attackerPermanentId: s.perm("host").permanentId,
    });
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("bottom").instanceId]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("target").instanceId,
      s.inst("top").instanceId,
    ]);
  });

  it("does not arm the inherited watcher for a plain host or on the opponent's turn", async () => {
    const plain = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "host", under: ["BT12-055"] }] },
      1: { security: ["BT1-009"] },
    });
    await plain.ready();
    await advance(plain.engine).fireForPermanent(EffectTiming.OnBattleDeleteOpponent, plain.perm("host"), {
      attackerPermanentId: plain.perm("host").permanentId,
    });
    expect(plain.state.players[1]!.security).toHaveLength(1);

    const offTurn = setupEngine({
      0: { battleArea: [{ card: "BT12-022", as: "host", under: ["BT12-055"] }] },
      1: { security: ["BT1-009"] },
    });
    offTurn.state.turnSeat = 1;
    await offTurn.ready();
    await advance(offTurn.engine).fireForPermanent(EffectTiming.OnBattleDeleteOpponent, offTurn.perm("host"), {
      attackerPermanentId: offTurn.perm("host").permanentId,
    });
    expect(offTurn.state.players[1]!.security).toHaveLength(1);
  });
});
