import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-007.js";

describe("EX10-007 Greymon", () => {
  it("proves both shared On Play/When Digivolving target scopes and inherited DP", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, names: ["Agumon"], cost: 2, isAlternate: true }]);

    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "ModifyDP",
            amount: 3000,
            duration: "untilOpponentTurnEnd",
            target: { filter: { kind: ["Digimon"] }, count: 1 },
          },
        ],
      });
    }

    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "ModifyDP",
          amount: 1000,
          duration: "permanent",
          target: { filter: { isSelfRef: true }, isSelf: true },
        },
      ],
    });
    expect(compiled.effects?.find((effect) => effect.trigger === "Static")?.keywords).toEqual([
      { keyword: "Raid", raw: "＜Raid＞" },
    ]);
  });

  it("Q5012 lets On Play give an opposing Digimon +3000 DP through the end of that opponent's turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX10-007", as: "greymon" },
            { card: "BT1-009", as: "ally" },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("opponent").permanentId);
    const opponentBaseDp = s.perm("opponent").currentDP;
    const allyBaseDp = s.perm("ally").currentDP;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("greymon"));
    await settle(() => s.perm("opponent").currentDP === opponentBaseDp + 3000);

    expect(s.perm("opponent").currentDP).toBe(opponentBaseDp + 3000);
    expect(s.perm("ally").currentDP).toBe(allyBaseDp);

    s.state.turnSeat = 1;
    advance(s.engine).ledgers.continuous.sweep(s.state, "ownerTurnEnd", 1);
    advance(s.engine).ledgers.modifiers.sweep(s.state, "ownerTurnEnd", 1);
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("opponent").currentDP).toBe(opponentBaseDp);
  });

  it("digivolves from an Agumon for 2 and applies the When Digivolving buff to the chosen ally", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX10-006", as: "agumon", under: ["EX10-002"] },
            { card: "BT1-009", as: "ally" },
          ],
          hand: [{ card: "EX10-007", as: "greymon" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("ally").permanentId);
    s.state.memory = 2;
    const allyBaseDp = s.perm("ally").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("agumon").permanentId,
        instanceId: s.inst("greymon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("agumon").topCard.cardId === "EX10-007" && s.perm("ally").currentDP === allyBaseDp + 3000,
    );

    expect(s.state.memory).toBe(0);
    expect(s.perm("ally").currentDP).toBe(allyBaseDp + 3000);
  });

  it("exposes Raid and gives an evolved host exactly +1000 inherited DP", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX10-008", as: "host", under: ["EX10-007"] }] },
    });
    const baseDp = s.perm("host").currentDP;

    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Raid")).toBe(false);
    expect(s.perm("host").currentDP).toBe(baseDp + 1000);

    const standalone = setupEngine({ 0: { battleArea: [{ card: "EX10-007", as: "greymon" }] } });
    await standalone.engine.recomputeContinuousEffects();
    expect(observe(standalone.engine).hasKeyword(standalone.perm("greymon"), "Raid")).toBe(true);
  });
});
