import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT8-098.js";

describe("BT8-098 Innocence Blizzard", () => {
  it("trashes each bottom source, then offers only the resulting source-less Digimon up to 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["BT8-021"],
        hand: [{ card: "BT8-098", as: "option" }],
      },
      1: {
        battleArea: [
          { card: "BT8-023", as: "strippedOne", under: [{ card: "BT1-009", as: "bottomOne" }] },
          { card: "BT8-024", as: "alreadyBare" },
          { card: "BT8-039", as: "strippedTwo", under: [{ card: "BT1-029", as: "bottomTwo" }] },
          {
            card: "BT8-042",
            as: "stillStacked",
            under: [
              { card: "BT1-009", as: "bottomThree" },
              { card: "BT1-029", as: "remainingSource" },
            ],
          },
          { card: "BT8-046", as: "unselectedBare" },
        ],
      },
    });
    s.state.memory = 3;
    const selectedIds = [
      s.perm("strippedOne").permanentId,
      s.perm("alreadyBare").permanentId,
      s.perm("strippedTwo").permanentId,
    ];
    const stillStackedId = s.perm("stillStacked").permanentId;
    const unselectedBareId = s.perm("unselectedBare").permanentId;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("option").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "chooseTargets"));

    const choice = s.decisions.find(({ req }) => req.kind === "chooseTargets")!.req;
    expect(choice.sourceCardId).toBe("BT8-098");
    expect(choice.options?.min).toBe(0);
    expect(choice.options?.max).toBe(3);
    expect(choice.options?.candidateInstanceIds).toEqual([
      ...selectedIds,
      unselectedBareId,
    ]);
    expect(choice.options?.candidateInstanceIds).not.toContain(stillStackedId);
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: choice.decisionId,
      response: { kind: "chooseTargets", instanceIds: selectedIds },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT8-098"));

    expect(s.perm("strippedOne").stack).toHaveLength(0);
    expect(s.perm("strippedTwo").stack).toHaveLength(0);
    expect(s.perm("stillStacked").stack).toHaveLength(1);
    expect(s.perm("stillStacked").stack[0]!.instanceId).toBe(s.inst("remainingSource").instanceId);
    for (const id of selectedIds) {
      expect(observe(s.engine).isRestricted(id, "attack")).toBe(true);
      expect(observe(s.engine).isRestricted(id, "block")).toBe(true);
    }
    expect(observe(s.engine).isRestricted(unselectedBareId, "attack")).toBe(false);
    expect(observe(s.engine).isRestricted(stillStackedId, "block")).toBe(false);
    assertNoLoudGap(s);
  });

  it("activates the same source trash and restriction flow from Security", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT8-098", as: "securityOption", faceUp: true }],
      },
      1: {
        battleArea: [
          { card: "BT8-023", as: "target", under: ["BT1-009"] },
        ],
      },
    }, { autoSelectCards: true });

    await advance(s.engine).fireForInstance(
      EffectTiming.SecuritySkill,
      s.inst("securityOption"),
    );

    expect(s.perm("target").stack).toHaveLength(0);
    expect(observe(s.engine).isRestricted(s.perm("target"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "block")).toBe(true);
    expect(s.decisions.filter(({ req }) => req.kind === "chooseTargets")).toHaveLength(1);
    assertNoLoudGap(s);
  });
});
