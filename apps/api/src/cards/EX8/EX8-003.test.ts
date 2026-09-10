import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./index.js";
import { compiled } from "./EX8-003.js";

describe("EX8-003", () => {
  it("matches the catalog's Digi-Egg identity and inherited text", () =>
    expect(getCardDefinition("EX8-003")).toMatchObject({
      cardId: "EX8-003",
      nameEn: "Kokomon",
      colors: ["Yellow"],
      kinds: ["DigiEgg"],
      level: 2,
      forms: ["In-Training"],
      types: ["Lesser"],
      inheritedEffectText:
        "[When Attacking] [Once Per Turn] If you have another Digimon, 1 of your opponent's Digimon gets -2000 DP for the turn.",
      evoCosts: [],
    }));

  it("inherits a once-per-turn attack effect that gives an opposing Digimon -2000 DP when you have another Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "ModifyDP",
          amount: -2000,
          duration: "forTheTurn",
          target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } },
          condition: { kind: "youHave" },
        },
      ],
    }));
  it("requires a distinct friendly Digimon for the DP reduction", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      condition: {
        kind: "youHave",
        filter: { controllerDefault: "mine", excludeSelf: true, kind: ["Digimon"] },
      },
    }));

  it("reduces an opposing Digimon by 2000 DP only once per turn when another friendly Digimon exists", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-045", as: "host", under: ["EX8-003"], dp: 20_000 },
            { card: "BT1-046", as: "ally" },
          ],
        },
        1: {
          security: ["BT1-009", "BT1-009"],
          battleArea: [
            { card: "AD1-001", as: "target1", dp: 5000 },
            { card: "AD1-001", as: "target2", dp: 5000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const targets = [s.perm("target1"), s.perm("target2")];
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => targets.filter((target) => target.currentDP === 3000).length === 1);
    expect(targets.map((target) => target.currentDP).sort()).toEqual([3000, 5000]);
    await settle(() => !observe(s.engine).isAttacking());
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(targets.map((target) => target.currentDP).sort()).toEqual([3000, 5000]);
    s.state.memory = 0;
    await advance(s.engine).runTurn(0);
    expect(targets.map((target) => target.currentDP).sort()).toEqual([5000, 5000]);
  });

  it("does not reduce DP when the inherited host is the controller's only Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-045", as: "host", under: ["EX8-003"] }] },
      1: { security: ["BT1-009"], battleArea: [{ card: "AD1-001", as: "target" }] },
    });
    const target = s.perm("target");
    const before = target.currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(target.currentDP).toBe(before);
  });

  it("resets its once-per-turn use on the next own turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-045", as: "host", under: ["EX8-003"], dp: 20_000 },
          { card: "BT1-046", as: "ally" },
        ],
        deck: ["BT1-009", "BT1-009", "BT1-009"],
      },
      1: {
        battleArea: [{ card: "AD1-001", as: "target", dp: 5000 }],
        security: ["BT1-009", "BT1-009"],
        deck: ["BT1-009", "BT1-009", "BT1-009"],
      },
    });
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 3000 && !observe(s.engine).isAttacking());
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 3000 && !observe(s.engine).isAttacking());
    expect(s.perm("target").currentDP).toBe(3000);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });
});
