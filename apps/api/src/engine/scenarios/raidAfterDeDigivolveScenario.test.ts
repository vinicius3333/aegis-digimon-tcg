import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("Discord 1557815179218128896 playable Raid scenario", () => {
  it.each([false, true])("resolves Raid before source removal: %s", async (raidFirst) => {
    const options = {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoOrderTriggers: true,
      preferInstanceIds: ["dev-field-1-raid-target"],
    };
    const s = setupEngine({ 0: {}, 1: {} }, options);
    layDevScenario("arena-raid-after-dedigivolve", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    options.autoOrderTriggers = false;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: "dev-perm-0-raid-attacker",
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const request = s.decisions.at(-1)!.req;
    const keys = request.options!.triggerKeys!;
    const first = keys.find((key) => (raidFirst ? key.endsWith("/keyword/Raid") : key.includes("AD1-004/")))!;
    expect(first).toBeDefined();
    options.autoOrderTriggers = true;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: request.decisionId,
        response: { kind: "orderTriggers", order: [first, ...keys.filter((key) => key !== first)] },
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).finishAttack();
    await settle(() => s.state.pendingDecision === undefined);
    const attacker = s.state.players[0]!.battleArea.find((p) => p.permanentId === "dev-perm-0-raid-attacker")!;
    expect(attacker.topCard.cardId).toBe("AD1-004");
    expect(attacker.currentDP).toBe(14000);
    expect(s.state.players[1]!.trash.some((c) => c.cardId === "EX13-052")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT22-052")).toBe(!raidFirst);
    expect(s.decisions.filter(({ req }) => req.kind === "selectCards" && req.promptText.includes("Raid"))).toHaveLength(
      raidFirst ? 1 : 0,
    );
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
