import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("BT26 Cerberusmon optional cost arena scenario", () => {
  it.each([true, false])(
    "Discord 1556544429438013471 pays the cost before the optional Option and consumes the use (use: %s)",
    async (useOption) => {
      const s = setupEngine({ 0: {}, 1: {} }, { autoSelectCards: true, autoChooseOption: true });
      layDevScenario("arena-bt26-cerberusmon-optional-cost", s.state, [BLUE_DECK, RED_DECK]);
      s.engine.startTurnLoop();
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      const human = s.state.players[0]!;
      const opponent = s.state.players[1]!;
      const hostId = "dev-perm-0-cerberusmon-base";
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: hostId,
          instanceId: "dev-bt26-cerberusmon",
          useAlternateCost: true,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "optional");
      expect(human.trash.some(({ instanceId }) => instanceId === "dev-cerberusmon-hand-cost")).toBe(true);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: s.state.pendingDecision!.decisionId,
          response: { kind: "optional", accept: useOption },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision === undefined);
      expect(s.state.memory).toBe(useOption ? 6 : 7);
      expect(opponent.battleArea[0]!.topCard.cardId).toBe(useOption ? "BT1-009" : "BT1-019");
      expect(human.trash.some(({ instanceId }) => instanceId === "dev-cerberusmon-hand-cost")).toBe(true);
      const decisions = s.decisions.length;
      expect(
        s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
      ).toEqual({ ok: true });
      await settle(() => opponent.security.length === 2 && s.state.pendingDecision === undefined);
      expect(s.decisions.slice(decisions).some(({ req }) => req.sourceCardId === "BT26-074")).toBe(false);
      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    },
  );

  it("Discord 1556544429438013471 can decline on evolution and accept the cost on attack", async () => {
    const s = setupEngine({ 0: {}, 1: {} });
    layDevScenario("arena-bt26-cerberusmon-optional-cost", s.state, [BLUE_DECK, RED_DECK]);
    s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const human = s.state.players[0]!;
    const opponent = s.state.players[1]!;
    const hostId = "dev-perm-0-cerberusmon-base";
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: hostId,
        instanceId: "dev-bt26-cerberusmon",
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const hand = human.hand.map(({ instanceId }) => instanceId);
    const trash = human.trash.map(({ instanceId }) => instanceId);
    expect(s.decisions.at(-1)!.req.options?.min).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(human.hand.map(({ instanceId }) => instanceId)).toEqual(hand);
    expect(human.trash.map(({ instanceId }) => instanceId)).toEqual(trash);
    expect(s.state.memory).toBe(7);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "selectCards", instanceIds: ["dev-cerberusmon-hand-cost"] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(human.trash.some(({ instanceId }) => instanceId === "dev-cerberusmon-hand-cost")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => opponent.security.length === 2 && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(7);
    expect(human.trash.some(({ instanceId }) => instanceId === "dev-cerberusmon-titan-option")).toBe(true);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
  });
});
