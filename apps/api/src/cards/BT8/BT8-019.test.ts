import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-019.js";

describe("BT8-019 Zhuqiaomon", () => {
  it("keeps itself and the opponent's chosen Digimon, deletes all others and gains memory per deletion", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-002", as: "base" }, { card: "BT1-009", as: "ally" }], hand: [{ card: "BT8-019", as: "evolving" }] }, 1: { battleArea: [{ card: "BT1-010", as: "spared" }, { card: "BT1-011", as: "deleted" }] } }, { autoSelectCards: true });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.events.some(event => event.kind === "effectResolved" && event.sourceCardId === "BT8-019"));
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("spared").topCard?.cardId).toBe("BT1-010");
    expect(s.state.memory).toBe(1);
  });

  it("Q1703 has the opponent choose which of their Digimon survives", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-002", as: "base" }], hand: [{ card: "BT8-019", as: "evolving" }] },
      1: { battleArea: [{ card: "BT1-010", as: "first" }, { card: "BT1-011", as: "second" }] },
    });
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("evolving").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    const decision = s.decisions.at(-1)!.req;
    expect(decision.seat).toBe(1);
    expect(s.engine.applyIntent(1, {
      type: "respondDecision",
      decisionId: decision.decisionId,
      response: { kind: "chooseTargets", instanceIds: [s.perm("second").permanentId] },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("second").permanentId);
  });

  it("Q1706 deletes all other allied Digimon when the opponent has none", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "AD1-002", as: "base" }, { card: "BT1-009", as: "ally" }],
        hand: [{ card: "BT8-019", as: "evolving" }],
      },
    }, { autoSelectCards: true });
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("evolving").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1 && s.state.memory === 2);

    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("BT8-019");
    expect(s.state.memory).toBe(2);
  });
});
