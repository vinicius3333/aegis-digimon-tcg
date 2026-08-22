import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-034.js";

describe("BT5-034 Kotemon", () => {
  it("adds up to two yellow Warrior or Holy Warrior Digimon", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT5-034", as: "source" }], deck: [
      { card: "BT5-042", as: "warrior" }, { card: "BT5-045", as: "holyWarrior" },
      "BT5-035", "BT5-036", "BT5-038",
    ] } }, { autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    const added = [s.inst("warrior").instanceId, s.inst("holyWarrior").instanceId];
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => added.every((id) => player.hand.some((card) => card.instanceId === id)));
    expect(player.deck).toHaveLength(3);
  });

  it("may add only one of two eligible revealed cards", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT5-034", as: "source" }], deck: [
      { card: "BT5-042", as: "warrior" }, { card: "BT5-045", as: "holyWarrior" },
      "BT5-035", "BT5-036", "BT5-038",
    ] } });
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const choice = s.state.pendingDecision!;
    expect(JSON.parse(choice.payloadJson)).toMatchObject({ min: 0, max: 2 });
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: choice.decisionId,
      response: { kind: "selectCards", instanceIds: [s.inst("warrior").instanceId] },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("warrior").instanceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("holyWarrior").instanceId)).toBe(false);
  });

  it("may decline all eligible revealed cards", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT5-034", as: "source" }], deck: [
      { card: "BT5-042", as: "warrior" }, "BT5-035", "BT5-036", "BT5-038", "BT5-039",
    ] } });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const choice = s.state.pendingDecision!;
    expect(s.engine.applyIntent(0, { type: "respondDecision", decisionId: choice.decisionId, response: { kind: "selectCards", instanceIds: [] } })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });
});
