import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT23-094.js";

describe("BT23-094 Nanomachine Break", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-094")).toMatchObject({
      cardId: "BT23-094",
      nameEn: "Nanomachine Break",
      colors: ["Yellow"],
      kinds: ["Option"],
      playCost: 5,
      types: ["CS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(
      (compiled.effects.find((effect) => effect.trigger === "Static") as any).actions[0].condition.filter.zone,
    ).toEqual(["battleArea", "breeding"]);
  });

  it("waives the yellow color requirement from an off-color CS Digimon in breeding", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT22-008", as: "csInBreeding" },
        hand: [{ card: "BT23-094", as: "option" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    });
    s.state.memory = 5;
    const optionId = s.inst("option").instanceId;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
  });

  it("pays intrinsic Delay and applies both restrictions to the same opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-094", as: "option" },
            { card: "BT23-006", as: "attacker" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }], security: 2 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.perm("option").topCard!.instanceId;
    s.perm("option").placedByEffect = true;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
    expect(observe(s.engine).timingEffectDisabled(s.perm("target"), "whenDigivolving")).toBe(true);
    expect(observe(s.engine).timingEffectDisabled(s.perm("target"), "whenAttacking")).toBe(true);
  });

  it("does not pay Delay when a non-CS Digimon attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-094", as: "option" },
            { card: "BT1-009", as: "attacker" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }], security: 2 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.perm("option").topCard!.instanceId;
    s.perm("option").placedByEffect = true;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(0);
  });

  it("binds one target for Main/Security and keeps both effects inside Delay", () => {
    for (const trigger of ["Main", "Security"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger) as any;
      expect(effect.actions[0]).toMatchObject({
        kind: "GainKeyword",
        keyword: { keyword: "SecurityAttack", amount: -1 },
      });
      expect(effect.actions[1]).toMatchObject({
        kind: "DisableTimingEffect",
        target: { fromSelectionRef: effect.actions[0].target.bindAs },
        timings: ["whenDigivolving", "whenAttacking"],
      });
      expect(effect.actions[2]).toMatchObject({ kind: "PlaceInBattleAreaSelf" });
    }
    const turn = compiled.effects.find((entry) => entry.trigger === "YourTurn") as any;
    expect(turn.keywords).toEqual([{ keyword: "Delay", raw: "＜Delay＞" }]);
    expect(turn.actions[0].actions).toHaveLength(2);
  });
});
