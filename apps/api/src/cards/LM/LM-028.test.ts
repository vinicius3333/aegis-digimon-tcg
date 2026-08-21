import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-028.js";

function armOption(s: ReturnType<typeof setupEngine>): void {
  s.state.players[0]!.battleArea[0]!.placedByEffect = true;
  s.state.isFirstPlayersFirstTurn = true;
}

describe("LM-028 Blue Scramble", () => {
  it("places itself after blue digivolution", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-029", as: "host" }], hand: [{ card: "LM-028", as: "option" }, "ST8-04"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-028"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-028")).toBe(true);
  });

  it("returns blue trash to deck top before playing a small blue Digimon", async () => {
    const options = { autoSelectCards: false, autoAcceptOptional: false, autoOrderTriggers: true, preferInstanceIds: [] as string[] };
    const s = setupEngine({ 0: { battleArea: [{ card: "LM-028", as: "option" }], trash: [{ card: "BT1-030", as: "returnTarget" }, { card: "BT1-029", as: "playTarget" }] }, 1: { battleArea: ["BT1-029"] } }, options);
    options.preferInstanceIds.push(s.inst("returnTarget").instanceId);
    await s.ready();
    armOption(s);
    const resolution = advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("option"));
    await settle(() => s.decisions.length === 1);
    expect(s.engine.applyIntent(0, { type: "respondDecision", decisionId: s.decisions[0]!.req.decisionId, response: { kind: "optional", accept: true } })).toEqual({ ok: true });
    await settle(() => s.decisions.length === 2 && s.decisions[1]!.req.kind === "selectCards");
    expect(s.engine.applyIntent(0, { type: "respondDecision", decisionId: s.decisions[1]!.req.decisionId, response: { kind: "selectCards", instanceIds: [s.inst("returnTarget").instanceId] } })).toEqual({ ok: true });
    await settle(() => s.decisions.length === 3);
    expect(s.state.players[0]!.deck[0]?.cardId).toBe("BT1-030");
    expect(s.engine.applyIntent(0, { type: "respondDecision", decisionId: s.decisions[2]!.req.decisionId, response: { kind: "optional", accept: true } })).toEqual({ ok: true });
    await resolution;
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT1-029")).toBe(true);
  });

  it("does not activate without an opponent Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "LM-028", as: "option" }], trash: ["BT1-029"] } }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    await s.ready();
    armOption(s);
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("option"));
    expect(s.state.players[0]!.trash.some((c) => c.cardId === "LM-029")).toBe(false);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-028")).toBe(true);
  });

  it("plays a qualifying blue Digimon from security and returns itself to hand", async () => {
    const s = setupEngine({ 0: { security: [{ card: "LM-028", as: "securityOption", faceUp: true }], trash: ["BT1-029"] } }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    await settle(() => s.state.players[0]!.hand.some((c) => c.cardId === "LM-028"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT1-029")).toBe(true);
    expect(s.state.players[0]!.hand.some((c) => c.cardId === "LM-028")).toBe(true);
  });
});
