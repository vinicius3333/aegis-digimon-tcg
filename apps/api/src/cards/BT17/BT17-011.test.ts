import { describe, expect, it } from "vitest";
import { matchingAlternateDigivolutionRequirement } from "../../engine/cards/cardData.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-011.js";

describe("BT17-011", () => {
  it("can digivolve onto a red Tamer as level 3", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      actions: [
        { kind: "Digivolve", asLevel: 3, from: "hand", onto: { filter: { kind: ["Tamer"], colors: ["Red"] } } },
      ],
    });
  });

  it("requires a Takuya Kanbara Tamer for the named alternate route", () => {
    expect(matchingAlternateDigivolutionRequirement("BT17-011", "BT12-088")).toMatchObject({
      cost: 2,
      baseIsTamer: true,
    });
    expect(matchingAlternateDigivolutionRequirement("BT17-011", "BT1-086")).toBeUndefined();
  });

  it("digivolves into AncientGreymon for 3 and deletes itself if successful", () => {
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({
      kind: "Digivolve",
      from: ["hand"],
      costOverride: 3,
      ignoreRequirements: true,
      optional: true,
      condition: { kind: "anyOf" },
    });
    expect(compiled.effects?.[1]?.actions?.[1]).toMatchObject({
      kind: "DelayedDelete",
      condition: { kind: "ifThisEffectDigivolved" },
    });
  });

  it("has inherited permanent DP", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }],
    });
  });

  it("digivolves from a red Tamer for its level-3 red cost and retains the Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-088", as: "takuya" }],
        hand: [{ card: "BT17-011", as: "agunimon" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("takuya").permanentId,
        instanceId: s.inst("agunimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard?.cardId === "BT17-011");

    expect(s.state.memory).toBe(8);
    expect(s.perm("takuya").stack.map(({ cardId }) => cardId)).toContain("BT12-088");
  });

  it("can evolve from BurningGreymon into AncientGreymon and deletes that stack at turn end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-012", as: "burning" }],
          hand: [
            { card: "BT17-011", as: "agunimon" },
            { card: "BT17-017", as: "ancient" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const burningPermanentId = s.perm("burning").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: burningPermanentId,
        instanceId: s.inst("agunimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.permanentId === burningPermanentId && permanent.topCard?.cardId === "BT17-017",
      ),
    );
    expect(s.state.memory).toBe(6);

    await advance(s.engine).runTurn(0);
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === burningPermanentId)).toBe(false);
  });
});
