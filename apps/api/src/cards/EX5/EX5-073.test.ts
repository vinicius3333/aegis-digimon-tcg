import { describe, expect, it } from "vitest";
import { dnaDigivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-073.js";

describe("EX5-073 GraceNovamon", () => {
  it("has its printed Security Attack plus one and Blocker keywords", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toEqual([
      { keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" },
      { keyword: "Blocker", raw: "＜Blocker＞" },
    ]);
  });

  it("requires the printed zero-cost Apollomon plus Dianamon DNA route", () => {
    expect(dnaDigivolutionRequirementsFor("EX5-073")).toEqual([
      {
        cost: 0,
        materials: [{ names: ["Apollomon"] }, { names: ["Dianamon"] }],
      },
    ]);
  });

  it("trashes up to eight evolution cards on DNA digivolving and deletes an opposing Digimon with no more cards than this Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([
      {
        kind: "TrashDigivolution",
        amount: 8,
        condition: { kind: "isDnaDigivolving" },
        target: { count: "any", filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "hasAny" } },
      },
      {
        kind: "Delete",
        target: {
          count: 1,
          filter: { controller: "opponent", kind: ["Digimon"], digivolutionCardsCompareToSource: "lte" },
        },
      },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions[0]).toMatchObject({
      kind: "Delete",
      target: {
        count: 1,
        filter: { controller: "opponent", kind: ["Digimon"], digivolutionCardsCompareToSource: "lte" },
      },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[1]).not.toHaveProperty(
      "condition",
    );
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions[0]).not.toHaveProperty(
      "condition",
    );
  });
  it("prevents leaving play by trashing two same-level evolution cards", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      leaveCause: "byOpponentEffect",
      actions: [
        {
              kind: "Prevent",
              optional: true,
              abortOnDecline: true,
              cost: {
                kind: "trash",
                target: { count: 2, filter: { zone: "digivolutionCards", isSelfRef: true, sameLevelPair: true } },
              },
        },
      ],
    });
  });

  it("still deletes an eligible opponent when attacking without DNA digivolving, per Q3687/Q3688", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX5-073", as: "grace", under: ["BT1-010", "BT1-011"] }] },
        1: { battleArea: [{ card: "BT1-024", as: "eligible" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const eligibleId = s.perm("eligible").permanentId;

    await advance(s.engine).fire(EffectTiming.WhenAttacking, s.perm("grace"));
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === eligibleId), 2000);

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === eligibleId)).toBe(false);
  });
});
