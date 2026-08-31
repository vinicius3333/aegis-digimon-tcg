import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-238.js";

describe("P-238 Destruction Cannon", () => {
  it("requires CS, deletes an opposing level 6 or lower Digimon, and places itself", () => {
    const effects = runtimeCompiledCard("P-238")!.effects;
    expect(effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        actions: [
          expect.objectContaining({
            kind: "WaiveColorRequirement",
            condition: expect.objectContaining({ kind: "youHave" }),
          }),
        ],
      }),
    );
    expect(effects).toContainEqual(
      expect.objectContaining({
        trigger: "Main",
        actions: [
          expect.objectContaining({
            kind: "Delete",
            target: expect.objectContaining({ filter: expect.objectContaining({ controller: "opponent" }) }),
          }),
          { kind: "PlaceInBattleAreaSelf" },
        ],
      }),
    );
  });

  it("permanently grants Delay after a CS Digimon attacks", () => {
    const effects = runtimeCompiledCard("P-238")!.effects;
    expect(effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        actions: [
          expect.objectContaining({
            kind: "SubTrigger",
            event: "whenAttacking",
            sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["CS"], match: "trait" }] },
            actions: [expect.objectContaining({ kind: "GainKeyword", duration: "permanent" })],
          }),
        ],
      }),
    );
    expect(effects).toContainEqual(
      expect.objectContaining({ trigger: "Main", keywords: [{ keyword: "Delay", raw: "＜Delay＞" }] }),
    );
  });

  it("deletes and places itself from Security", () => {
    expect(runtimeCompiledCard("P-238")!.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Security",
        isSecurity: true,
        actions: [expect.objectContaining({ kind: "Delete" }), { kind: "PlaceInBattleAreaSelf" }],
      }),
    );
  });
});
describe("P-238 engine behavior", () => {
  it("deletes an opposing level-6-or-lower Digimon and places itself", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "P-238", as: "cannon" }], battleArea: [{ card: "BT22-008", as: "cs" }] },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cannon").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "P-238")).toBe(true);
  });

  it("deletes an opposing Digimon and places itself when its Security effect resolves", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "P-238", as: "cannon" }] }, 1: { battleArea: [{ card: "BT1-009", as: "victim" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("cannon"));
    await settle();
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("cannon").instanceId)).toBe(true);
  });

  it("grants Delay after a CS Digimon makes a real attack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "P-238", as: "cannon" },
          { card: "BT22-008", as: "cs" },
        ],
      },
      1: { security: ["BT1-001"] },
    });
    s.perm("cannon").placedByEffect = true;
    s.state.turnSeat = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("cs").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("cannon"), "Delay"));
    expect(observe(s.engine).hasKeyword(s.perm("cannon"), "Delay")).toBe(true);
  });
});
