import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-034.js";

describe("BT4-034 Regalecusmon", () => {
  it("trashes the bottom source, then draws 1 and gains 1 memory when attacking", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-034", as: "regal" }], deck: ["BT1-009", "BT1-010"] }, 1: { battleArea: [
      { card: "BT3-015", as: "target", under: [{ card: "BT1-001", as: "bottom" }, { card: "BT2-001", as: "top" }] },
      { card: "BT3-015", as: "otherTarget", under: ["BT1-001"] },
    ], security: ["BT1-010"] } });
    s.state.memory = 0;
    const deckBefore = s.state.players[0]!.deck.length;
    const bottomId = s.inst("bottom").instanceId;

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("regal").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    const decision = s.decisions.at(-1)!.req;
    expect(new Set(decision.options?.candidateInstanceIds)).toEqual(new Set([
      s.perm("target").permanentId,
      s.perm("otherTarget").permanentId,
    ]));
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: decision.decisionId,
      response: {
        kind: "chooseTargets",
        instanceIds: [s.perm("target").permanentId],
      },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === deckBefore - 1 && s.state.memory === 1);

    expect(s.state.players[1]!.trash.some((card) => card.instanceId === bottomId)).toBe(true);
    expect(s.perm("target").stack.map((card) => card.instanceId)).toEqual([s.inst("top").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(deckBefore - 1);
    expect(s.state.memory).toBe(1);
  });
});
