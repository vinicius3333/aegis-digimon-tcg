import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT9-104.js";

describe("BT9-104 X Digivolution! — Security", () => {
  it("may reveal 3, add an X-Antibody-trait card, and trash the rest", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT9-104", as: "option", faceUp: true }], deck: [{ card: "BT9-008", as: "picked" }, "BT1-001", "BT1-002"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("picked").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(2);
  });

  it("does not reveal or move deck cards when the player declines", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT9-104", as: "option", faceUp: true }],
        deck: [
          { card: "BT9-008", as: "picked" },
          { card: "BT1-001", as: "miss1" },
          { card: "BT1-002", as: "miss2" },
        ],
      },
    });
    const deckBefore = s.state.players[0]!.deck.map(({ instanceId }) => instanceId);

    const firing = advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const prompt = s.decisions.at(-1)!.req;
    expect(prompt.sourceCardId).toBe("BT9-104");

    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: prompt.decisionId,
      response: { kind: "optional", accept: false },
    })).toEqual({ ok: true });
    await firing;

    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual(deckBefore);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === "BT9-104")).toHaveLength(1);
  });

  it("asks once to reveal, then requires one matching card when accepted", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT9-104", as: "option", faceUp: true }],
        deck: [
          { card: "BT9-008", as: "picked" },
          { card: "BT1-001", as: "miss1" },
          { card: "BT1-002", as: "miss2" },
        ],
      },
    });

    const firing = advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const prompt = s.decisions.at(-1)!.req;
    expect(prompt.sourceCardId).toBe("BT9-104");
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: prompt.decisionId,
      response: { kind: "optional", accept: true },
    })).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const selection = s.decisions.at(-1)!.req;
    expect(selection.sourceCardId).toBe("BT9-104");
    expect(selection.options).toMatchObject({
      min: 1,
      max: 1,
      candidateInstanceIds: [s.inst("picked").instanceId],
    });
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: selection.decisionId,
      response: { kind: "selectCards", instanceIds: [s.inst("picked").instanceId] },
    })).toEqual({ ok: true });
    await firing;

    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("picked").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("miss1").instanceId, s.inst("miss2").instanceId]),
    );
    expect(s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === "BT9-104")).toHaveLength(1);
  });
});
