import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-006.js";

describe("EX10-006 Agumon", () => {
  it("models the zero-cost Koromon evolution and the optional Virus Greymon return", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Koromon"], cost: 0, isAlternate: true }]);

    expect(compiled.effects?.find((effect) => effect.trigger === "StartOfYourMainPhase")).toMatchObject({
      actions: [
        {
          kind: "Return",
          optional: true,
          to: "hand",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                { tokens: ["Virus"], match: "trait" },
                { tokens: ["Greymon"], match: "name" },
              ],
            },
            count: 1,
          },
        },
      ],
    });
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
  });

  it("returns only a Digimon that is both Virus attribute and Greymon-named", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-006", as: "agumon" }],
          trash: [
            { card: "BT10-019", as: "virusGreymon" },
            { card: "BT1-015", as: "vaccineGreymon" },
            { card: "EX10-006", as: "virusNonGreymon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("virusGreymon").instanceId);

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("agumon"));
    await settle(() => s.state.players[0]!.hand.length === 1);

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT10-019"]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-015", "EX10-006"]);
  });

  it("leaves a matching trash card in place when the optional return is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-006", as: "agumon" }],
          trash: [{ card: "BT10-019", as: "virusGreymon" }],
        },
      },
      { autoDeclineOptional: true },
    );

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("agumon"));
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional"));

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT10-019"]);
  });

  it("digivolves from Koromon for 0 and grants the inherited host exactly +1000 DP", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX10-002", as: "koromon" }],
        hand: [{ card: "EX10-006", as: "agumon" }],
      },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("koromon").permanentId,
        instanceId: s.inst("agumon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("koromon").topCard.cardId === "EX10-006");
    expect(s.state.memory).toBe(0);

    const inherited = setupEngine({
      0: { battleArea: [{ card: "EX10-007", as: "greymon", under: ["EX10-006"] }] },
    });
    const printedDp = inherited.perm("greymon").currentDP;
    await inherited.engine.recomputeContinuousEffects();

    expect(inherited.perm("greymon").currentDP).toBe(printedDp + 1000);
  });
});
