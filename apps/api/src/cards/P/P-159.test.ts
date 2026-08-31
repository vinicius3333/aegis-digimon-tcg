import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-159.js";
import "../BT19/BT19-062.js";

describe("P-159 Rook Device", () => {
  it("encodes the effect-trash trigger and Main grants with shared target", () => {
    const compiled = runtimeCompiledCard("P-159")!;
    const reaction = compiled.effects.find((effect) => effect.trigger === "AllTurns")!;
    expect(reaction.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenTrashedByEffect",
      sourceFilter: { isSelfRef: true },
      actions: [
        { kind: "GainKeyword", keyword: { keyword: "Reboot" }, duration: "untilOpponentTurnEnd" },
        {
          kind: "GainKeyword",
          keyword: { keyword: "Blocker" },
          duration: "untilOpponentTurnEnd",
          target: expect.objectContaining({ sameTarget: true }),
        },
        {
          kind: "ModifyDP",
          amount: 2000,
          duration: "untilOpponentTurnEnd",
          target: expect.objectContaining({ sameTarget: true }),
        },
      ],
    });
    const main = compiled.effects.find((effect) => effect.trigger === "Main")!;
    expect(main.actions).toHaveLength(4);
    expect(main.actions[3]).toEqual({ kind: "PlaceInBattleAreaSelf" });
  });

  it("encodes color waiver and Security De-Digivolve 2 with hand return", () => {
    const compiled = runtimeCompiledCard("P-159")!;
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [{ kind: "WaiveColorRequirement", condition: { kind: "youHaveNone" } }],
    });
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Security",
          isSecurity: true,
          actions: [expect.objectContaining({ kind: "DeDigivolve", amount: 2 }), { kind: "AddToHandSelf" }],
        }),
      ]),
    );
  });

  it("de-digivolves two cards from an opposing Digimon and returns itself from security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "P-159", as: "rook" }] },
        1: { battleArea: [{ card: "AD1-004", as: "target", under: ["AD1-001", "BT1-020"] }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("rook"));
    await settle();
    expect(s.perm("target").topCard.cardId).toBe("AD1-001");
    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["AD1-004", "BT1-020"]),
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("rook").instanceId)).toBe(true);
  });

  it("runs Main by granting Reboot, Blocker, and +2000 DP before placing itself", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "P-159", as: "rook" }], battleArea: [{ card: "BT1-009", as: "host" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    const rookId = s.inst("rook").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rook").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === rookId));
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
    expect(s.perm("host").currentDP).toBe(5000);
  });

  it("reacts when this Device is trashed by an effect, buffing a Digimon for the turn window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-159", as: "rook" },
            { card: "BT19-062", as: "attacker" },
          ],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.perm("rook").placedByEffect = true;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("rook").instanceId));
    expect(observe(s.engine).hasKeyword(s.perm("attacker"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("attacker"), "Blocker")).toBe(true);
    expect(s.perm("attacker").currentDP).toBe(s.perm("attacker").baseDP + 2000);
  });
});
