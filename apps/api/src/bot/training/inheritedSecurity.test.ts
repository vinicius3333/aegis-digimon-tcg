import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { buildBotView } from "../view.js";
import { mainActionReady } from "./actions.js";
import { createAsyncTrainingPolicy, type TrainingWindow } from "./policy.js";
import "../../cards/index.js";

describe("Liollmon inherited security choice through the asynchronous policy", () => {
  it.each(
    ([0, 1] as const).flatMap((seat) =>
      [0, 1, 2].flatMap((security) => [false, true].map((accept) => ({ seat, security, accept }))),
    ),
  )("seat=$seat security=$security accept=$accept", async ({ seat, security, accept }) => {
    const opponent = seat === 0 ? 1 : 0;
    const securityCards = [
      { card: "BT25-043", as: "security-0" },
      { card: "ST23-12", as: "security-1" },
    ].slice(0, security);
    const setup = setupEngine({
      [seat]: {
        battleArea: [{ card: "BT25-049", as: "attacker", under: [{ card: "BT26-025", as: "liollmon" }] }],
        security: securityCards,
        deck: [
          { card: "BT25-020", as: "recovery" },
          { card: "BT25-032", as: "tail" },
        ],
      },
      [opponent]: {
        battleArea: [{ card: "EX9-048", as: "defender", suspended: true, dp: 2000 }],
        security: [{ card: "EX9-046", as: "opponent-security" }],
      },
    });
    setup.state.turnSeat = seat;
    setup.state.memory = 10;
    await setup.ready();
    const attacker = setup.perm("attacker");
    const defenderId = setup.perm("defender").permanentId;
    const windows: TrainingWindow[] = [];
    const policy = createAsyncTrainingPolicy(setup.engine, seat, async (window) => {
      await Promise.resolve();
      if (window.kind === "main")
        return window.actions.findIndex(
          ({ intent }) =>
            intent.type === "attack" &&
            intent.attackerPermanentId === attacker.permanentId &&
            intent.target.kind === "permanent" &&
            intent.target.permanentId === defenderId,
        );
      expect(window.kind).toBe("optional");
      expect(window.request?.sourceCardId).toBe("BT26-025");
      expect(window.actions.map((action) => action.label)).toEqual(["Accept", "Decline"]);
      expect(window.observation.players[seat]!.securityCount).toBe(security);
      expect(window.observation.players[seat]!.faceUpSecurity).toEqual([]);
      expect(window.observation.players[seat]!.hand).toEqual([]);
      for (const hidden of ["BT25-043", "ST23-12", "BT25-020"])
        expect(JSON.stringify(window.observation)).not.toContain(hidden);
      windows.push(window);
      return accept ? 0 : 1;
    });
    expect(setup.engine.applyIntent(seat, await policy.chooseMainAction(buildBotView(setup.state, seat)!))).toEqual({
      ok: true,
    });
    for (let step = 0; step < 12; step++) {
      await settle(() => setup.state.pendingDecision !== undefined || mainActionReady(setup.engine));
      const pending = setup.state.pendingDecision;
      if (!pending) break;
      const request = setup.decisions.findLast(({ req }) => req.decisionId === pending.decisionId)!.req;
      expect(request.seat).toBe(seat);
      expect(
        setup.engine.applyIntent(seat, await policy.answerDecision(buildBotView(setup.state, seat), request)),
      ).toEqual({ ok: true });
    }
    const took = accept && security > 0;
    const recovered = security - Number(took) === 0;
    expect(windows).toHaveLength(security > 0 ? 1 : 0);
    expect(setup.state.players[seat]!.hand.map((card) => card.instanceId)).toEqual(
      took ? [setup.inst("security-0").instanceId] : [],
    );
    expect(setup.state.players[seat]!.security.map((card) => card.instanceId)).toEqual([
      ...(recovered ? [setup.inst("recovery").instanceId] : []),
      ...securityCards.slice(took ? 1 : 0).map(({ as }) => setup.inst(as).instanceId),
    ]);
    expect(setup.state.players[seat]!.deck.map((card) => card.instanceId)).toEqual([
      ...(recovered ? [] : [setup.inst("recovery").instanceId]),
      setup.inst("tail").instanceId,
    ]);
    expect(setup.state.players[seat]!.trash).toHaveLength(0);
    expect(setup.state.players[opponent]!.battleArea).toHaveLength(0);
    expect(setup.state.players[opponent]!.trash.map((card) => card.instanceId)).toEqual([
      setup.inst("defender").instanceId,
    ]);
    expect(setup.state.players[opponent]!.security.map((card) => card.instanceId)).toEqual([
      setup.inst("opponent-security").instanceId,
    ]);
    expect(attacker.topCard.instanceId).toBe(setup.inst("attacker").instanceId);
    expect(attacker.stack.map((card) => card.instanceId)).toEqual([setup.inst("liollmon").instanceId]);
    expect(attacker.isSuspended).toBe(true);
    expect(setup.state.memory).toBe(10);
    expect(mainActionReady(setup.engine)).toBe(true);
    expect(setup.engine.combat.isAttacking).toBe(false);
    expect(setup.state.pendingDecision).toBeUndefined();
    expect(setup.events.filter((event) => event.kind === "attackDeclared")).toHaveLength(1);
    expect(
      setup.events.filter((event) => event.kind === "actionRejected" || event.kind === "securityRevealed"),
    ).toEqual([]);
  });
});
