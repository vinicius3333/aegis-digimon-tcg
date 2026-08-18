import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-077.js";

describe("BT2-077 Kimeramon", () => {
  it("may delete another own Digimon to delete an opposing level 5 or lower Digimon", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT2-077", as: "source" }], battleArea: [
      { card: "BT2-067", as: "cost", dp: 3000 },
    ] }, 1: { battleArea: [{ card: "BT1-074", as: "target", dp: 7000 }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    const mine = s.state.players[0] as PlayerState;
    const opponent = s.state.players[1] as PlayerState;
    const costId = s.perm("cost").permanentId;
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => !mine.battleArea.some((p) => p.permanentId === costId) && opponent.battleArea.length === 0);
    expect(mine.trash.some((card) => card.cardId === "BT2-067")).toBe(true);
    expect(opponent.trash.some((card) => card.cardId === "BT1-074")).toBe(true);
  });

  it("Q1027 may decline without deleting either Digimon", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT2-077", as: "source" }],
        battleArea: [{ card: "BT2-067", as: "cost" }],
      },
      1: { battleArea: [{ card: "BT1-074", as: "target" }] },
    });
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("source").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decline = s.decisions.at(-1)!.req;
    expect(decline.sourceCardId).toBe("BT2-077");
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: decline.decisionId,
      response: { kind: "optional", accept: false },
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("cost").permanentId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("target").permanentId)).toBe(true);
  });
});
