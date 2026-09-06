import { describe, expect, it } from "vitest";
import { advance } from "./testkit/advance.js";
import { observe } from "./testkit/observe.js";
import { setupEngine, settle } from "./testkit/harness.js";
import "../cards/BT20/index.js";
import "../cards/BT20/BT20-030.js";
import "../cards/BT20/BT20-031.js";
import "../cards/BT20/BT20-037.js";
import "../cards/BT20/BT20-092.js";

describe("overall timing restrictions", () => {
  it("blocks On Play effects and unsuspend timing for Digimon and Tamers played after Valdur Arm locks the turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-035", as: "base" }],
          hand: [{ card: "BT20-037", as: "valdur" }],
          deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT20-010", as: "existing" }],
          hand: [
            { card: "BT20-030", as: "liollmon" },
            { card: "BT20-092", as: "npc" },
            { card: "BT1-010", as: "npcMaterial" },
          ],
          deck: [
            { card: "BT1-010", as: "normalDraw" },
            { card: "BT20-031", as: "wouldReveal" },
            { card: "BT20-099", as: "wouldRevealOption" },
            { card: "BT1-010", as: "rest" },
            "BT1-010",
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("valdur").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("existing"), "unsuspend"));

    // Enter the actual opponent turn, preserving its normal draw as the only
    // expected hand/deck change before the two future plays.
    s.state.turnSeat = 1;
    s.state.memory = 10;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    const deckBeforePlays = s.state.players[1]!.deck.map((card) => card.instanceId);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("liollmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-030"));
    const liollmon = s.perm("liollmon");
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual(deckBeforePlays);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("wouldReveal").instanceId);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).not.toContain(
      s.inst("wouldRevealOption").instanceId,
    );
    expect(observe(s.engine).timingEffectDisabled(liollmon, "onPlay")).toBe(true);
    expect(observe(s.engine).isRestricted(liollmon, "unsuspend")).toBe(true);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("npc").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-092"));
    const npc = s.perm("npc");
    expect(observe(s.engine).timingEffectDisabled(npc, "onPlay")).toBe(true);
    expect(observe(s.engine).isRestricted(npc, "unsuspend")).toBe(true);
    expect(npc.stack).toHaveLength(0);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("npcMaterial").instanceId);
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual(deckBeforePlays);

    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    expect(observe(s.engine).timingEffectDisabled(liollmon, "onPlay")).toBe(false);
    expect(observe(s.engine).timingEffectDisabled(npc, "onPlay")).toBe(false);
    expect(observe(s.engine).isRestricted(liollmon, "unsuspend")).toBe(false);
    expect(observe(s.engine).isRestricted(npc, "unsuspend")).toBe(false);
  });
});
