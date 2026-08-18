import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-096.js";

describe("BT8-096 Top Gun", () => {
  it("offers only opposing Digimon at 4000 DP or less without a multicolor condition", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["BT8-007"],
        hand: [{ card: "BT8-096", as: "option" }],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "exact", dp: 4_000 },
          { card: "BT1-029", as: "above", dp: 4_001 },
        ],
      },
    });
    s.state.memory = 3;
    const exactId = s.perm("exact").permanentId;
    const aboveId = s.perm("above").permanentId;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("option").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "chooseTargets"));

    const choice = s.decisions.find(({ req }) => req.kind === "chooseTargets")!.req;
    expect(choice.sourceCardId).toBe("BT8-096");
    expect(choice.options?.candidateInstanceIds).toEqual([exactId]);
    expect(choice.options?.min).toBe(1);
    expect(choice.options?.max).toBe(1);
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: choice.decisionId,
      response: { kind: "chooseTargets", instanceIds: [exactId] },
    })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === exactId));

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === aboveId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("does not combine differently colored monocolor digivolution cards for the 7000 DP cap", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-007", under: ["BT1-009", "BT1-029"] }],
        hand: [{ card: "BT8-096", as: "option" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target", dp: 5_000 }] },
    });
    s.state.memory = 3;
    const targetId = s.perm("target").permanentId;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("option").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT8-096"));

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(true);
    expect(s.decisions.filter(({ req }) => req.kind === "chooseTargets")).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("raises the cap to exactly 7000 when one digivolution card is itself multicolor", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-007", under: ["BT8-039"] }],
        hand: [{ card: "BT8-096", as: "option" }],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "exact", dp: 7_000 },
          { card: "BT1-029", as: "above", dp: 7_001 },
        ],
      },
    }, { autoSelectCards: true });
    s.state.memory = 3;
    const exactId = s.perm("exact").permanentId;
    const aboveId = s.perm("above").permanentId;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("option").instanceId,
    })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === exactId));

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === aboveId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("activates the 7000 DP Main effect from Security with a multicolor Digimon in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["BT8-015"],
        security: [{ card: "BT8-096", as: "securityOption", faceUp: true }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target", dp: 7_000 }] },
    });
    const targetId = s.perm("target").permanentId;

    const resolution = advance(s.engine).fireForInstance(
      EffectTiming.SecuritySkill,
      s.inst("securityOption"),
    );
    await settle(() => s.decisions.some(({ req }) => req.kind === "chooseTargets"));
    const choice = s.decisions.find(({ req }) => req.kind === "chooseTargets")!.req;

    expect(choice.sourceCardId).toBe("BT8-096");
    expect(choice.options?.candidateInstanceIds).toEqual([targetId]);
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: choice.decisionId,
      response: { kind: "chooseTargets", instanceIds: [targetId] },
    })).toEqual({ ok: true });
    await resolution;

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(false);
    assertNoLoudGap(s);
  });
});
