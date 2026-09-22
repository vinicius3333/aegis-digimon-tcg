import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-109.js";
import { compiled } from "./BT2-109.js";

describe("BT2-109 Heat Viper", () => {
  it("encodes the optional deletion cost as a decline-capable selection", () => {
    expect(compiled.effects[0]?.actions?.[0]).toMatchObject({ optional: true, abortOnDecline: true });
  });
  it("deletes one own battle-area Digimon to delete up to two opposing level 4 or lower Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-067", as: "cost" }],
          breeding: { card: "BT2-068", as: "breeding" },
          hand: [{ card: "BT2-109", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT2-043", as: "levelThree" },
            { card: "BT2-044", as: "levelFour" },
            { card: "BT2-046", as: "levelFive" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.perm("breeding").topCard.cardId).toBe("BT2-068");
    expect(s.state.players[1]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["BT2-046"]);
  });

  it("may decline from the delete-own selection without a separate optional prompt", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-067", as: "own" }], hand: [{ card: "BT2-109", as: "option" }] },
      1: { battleArea: [{ card: "BT2-043", as: "opponent" }] },
    });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision !== undefined);
    const decision = s.state.pendingDecision!;
    expect(decision.kind).toBe("chooseTargets");
    const request = s.decisions.findLast(({ req }) => req.decisionId === decision.decisionId)?.req;
    expect(request?.options).toMatchObject({ min: 0, max: 1 });
    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("may choose no opposing target after the delete-own cost is paid", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-067", as: "own" }], hand: [{ card: "BT2-109", as: "option" }] },
      1: {
        battleArea: [
          { card: "BT2-043", as: "firstOpponent" },
          { card: "BT2-044", as: "secondOpponent" },
        ],
      },
    });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });

    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const costDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: costDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("own").permanentId] },
      }),
    ).toEqual({ ok: true });

    await settle(
      () =>
        s.state.pendingDecision?.kind === "chooseTargets" &&
        s.state.pendingDecision.decisionId !== costDecision.decisionId,
    );
    const targetDecision = s.state.pendingDecision!;
    const targetRequest = s.decisions.findLast(({ req }) => req.decisionId === targetDecision.decisionId)?.req;
    expect(targetRequest?.options).toMatchObject({ min: 0, max: 2 });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: targetDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [] },
      }),
    ).toMatchObject({ ok: true });
  });

  it("adds itself to its owner's hand from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT2-109", as: "securityOption", faceUp: true }] } });
    const instanceId = s.inst("securityOption").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === instanceId)).toBe(true);
  });
});
