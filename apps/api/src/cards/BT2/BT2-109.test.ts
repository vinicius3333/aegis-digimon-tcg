import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-109.js";

describe("BT2-109 Heat Viper", () => {
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

  it("may decline the delete-own cost and leaves every Digimon in play", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-067", as: "own" }], hand: [{ card: "BT2-109", as: "option" }] },
      1: { battleArea: [{ card: "BT2-043", as: "opponent" }] },
    });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("adds itself to its owner's hand from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT2-109", as: "securityOption", faceUp: true }] } });
    const instanceId = s.inst("securityOption").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === instanceId)).toBe(true);
  });
});
