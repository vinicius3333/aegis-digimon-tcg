import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-041.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-041", () => {
  it("has Fortitude and reduces Ver.5 digivolution by one per digivolution card", () => {
    expect(
      compiled.effects?.find((entry) => entry.keywords?.some((keyword) => keyword.keyword === "Fortitude"))?.keywords,
    ).toContainEqual({ keyword: "Fortitude", raw: "＜Fortitude＞" });
    expect(compiled.effects?.find((entry) => entry.trigger === "Static" && entry.actions.length > 0)).toMatchObject({
      actions: [{ actions: [{ mode: "reduceCost", amount: 1, scaling: { unit: "digivolutionCards", per: 1 } }] }],
    });
  });
  it("suspends and may return the lowest-DP suspended opponent Digimon by trashing its bottom face-down card", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")).toMatchObject({
      actions: [
        { kind: "Suspend" },
        {
          kind: "Return",
          to: "hand",
          cost: { kind: "trash" },
          target: { filter: { suspended: true, superlative: "lowestDP" } },
        },
      ],
    }));
  it("inherits security trash when an opponent Digimon is deleted in battle", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent" }],
        },
      ],
    }));

  it("suspends and returns the lowest-DP opponent by trashing this bottom face-down card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX9-041",
              as: "source",
              under: [
                { card: "BT1-009", faceUp: false },
                { card: "BT1-010", faceUp: true },
              ],
            },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low", dp: 2000 },
            { card: "BT1-010", as: "high", dp: 5000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.state.players[1]!.hand.some((card) => card.cardId === "BT1-009"));
    expect(s.perm("source").stack).toHaveLength(1);
    expect(s.perm("source").stack[0]!.faceUp).toBe(true);
    expect(s.state.players[1]!.hand.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT1-010")).toBe(true);
  });

  it("does not trash security when another allied Digimon deletes in battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "host", dp: 10000, under: ["EX9-041"] },
          { card: "BT1-009", as: "ally", dp: 10000 },
        ],
      },
      1: {
        battleArea: [{ card: "BT1-010", as: "target", dp: 1000, suspended: true }],
        security: [{ card: "BT1-011" }, { card: "BT1-012" }],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ally").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.security).toHaveLength(2);
  });
});
