import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { buildBotView } from "../view.js";
import { mainActionReady } from "./actions.js";
import { createAsyncTrainingPolicy, type TrainingWindow } from "./policy.js";
import "../../cards/index.js";

describe("inherited end-of-attack unsuspension through the asynchronous policy", () => {
  it.each(
    ([0, 1] as const).flatMap((seat) =>
      ["ST23-04", "BT25-041"].flatMap((card) => [-1, 0, 1].map((payer) => ({ seat, card, payer }))),
    ),
  )("seat=$seat inherited=$card payer=$payer", async ({ seat, card, payer }) => {
    const opponent = seat === 0 ? 1 : 0;
    const setup = setupEngine({
      [seat]: {
        battleArea: [
          { card: "BT25-043", as: "attacker", under: [{ card, as: "inherited" }] },
          ...[0, 1].map((index) => ({
            card: "ST23-13",
            as: `tamer-${index}`,
            suspended: true,
            under: [
              { card: "ST23-06", as: `visible-${index}`, faceUp: true },
              { card: "BT25-032", as: `bottom-${index}`, faceUp: false },
              { card: "BT26-025", as: `next-${index}`, faceUp: false },
            ],
          })),
        ],
        deck: [
          { card: "EX9-046", as: "recovery" },
          { card: "EX9-048", as: "tail" },
        ],
      },
      [opponent]: {
        battleArea: [0, 1].map((index) => ({ card: "EX9-048", as: `defender-${index}`, suspended: true, dp: 2000 })),
        security: ["EX9-046", "EX9-046"],
      },
    });
    setup.state.turnSeat = seat;
    setup.state.memory = 10;
    await setup.ready();
    const attacker = setup.perm("attacker");
    const payerIds = [0, 1].map((index) => setup.inst(`tamer-${index}`).instanceId);
    const defenderIds = [0, 1].map((index) => setup.perm(`defender-${index}`).permanentId);
    const windows: TrainingWindow[] = [];
    const optionals: TrainingWindow[] = [];
    let target = 0;
    const policy = createAsyncTrainingPolicy(setup.engine, seat, async (window) => {
      await Promise.resolve();
      if (window.kind === "main")
        return window.actions.findIndex(
          ({ intent }) =>
            intent.type === "attack" &&
            intent.attackerPermanentId === attacker.permanentId &&
            intent.target.kind === "permanent" &&
            intent.target.permanentId === defenderIds[target],
        );
      if (window.request?.sourceCardId === card) {
        if (window.kind === "optional") {
          optionals.push(window);
          return payer < 0 ? 1 : 0;
        }
        windows.push(window);
        return window.actions.findIndex((action) =>
          window.selected.length > 0 ? action.label === "Finish selection" : action.sourceId === payerIds[payer],
        );
      }
      // Habakirimon's own recovery occurs; decline its separate security-trash unsuspension.
      expect(window.actions.some((action) => action.sourceId === "opponent")).toBe(true);
      return window.actions.findIndex((action) => action.label === "Finish selection");
    });
    for (const index of payer < 0 ? [0] : [0, 1]) {
      target = index;
      expect(setup.engine.applyIntent(seat, await policy.chooseMainAction(buildBotView(setup.state, seat)!))).toEqual({
        ok: true,
      });
      for (let step = 0; step < 16; step++) {
        await settle(() => setup.state.pendingDecision !== undefined || mainActionReady(setup.engine));
        const pending = setup.state.pendingDecision;
        if (!pending) break;
        const request = setup.decisions.findLast(({ req }) => req.decisionId === pending.decisionId)!.req;
        expect(request.seat).toBe(seat);
        expect(
          setup.engine.applyIntent(seat, await policy.answerDecision(buildBotView(setup.state, seat), request)),
        ).toEqual({ ok: true });
      }
      expect(mainActionReady(setup.engine)).toBe(true);
      expect(attacker.isSuspended).toBe(index === 1 || payer < 0);
    }
    expect(optionals).toHaveLength(1);
    expect(optionals[0]!.request?.options?.timing).toBe("EndOfAttack");
    expect(windows).toHaveLength(payer < 0 ? 0 : 2);
    expect(windows[0]?.actions.map((action) => action.sourceId)).toEqual(payer < 0 ? undefined : payerIds);
    for (const index of [0, 1])
      expect(setup.perm(`tamer-${index}`).stack.map((item) => item.instanceId)).toEqual(
        [`visible-${index}`, ...(payer === index ? [] : [`bottom-${index}`]), `next-${index}`].map(
          (alias) => setup.inst(alias).instanceId,
        ),
      );
    expect(setup.state.players[seat]!.trash.map((item) => item.instanceId)).toEqual(
      payer < 0 ? [] : [setup.inst(`bottom-${payer}`).instanceId],
    );
    expect(setup.state.players[opponent]!.battleArea.map((unit) => unit.permanentId)).toEqual(
      payer < 0 ? [defenderIds[1]] : [],
    );
    expect(setup.state.players[opponent]!.trash.map((item) => item.instanceId)).toEqual(
      (payer < 0 ? [0] : [0, 1]).map((index) => setup.inst(`defender-${index}`).instanceId),
    );
    expect(attacker.topCard.instanceId).toBe(setup.inst("attacker").instanceId);
    expect(attacker.stack.map((item) => item.instanceId)).toEqual([setup.inst("inherited").instanceId]);
    expect(setup.state.players[seat]!.security.map((item) => item.instanceId)).toEqual([
      setup.inst("recovery").instanceId,
    ]);
    expect(setup.state.players[seat]!.deck.map((item) => item.instanceId)).toEqual([setup.inst("tail").instanceId]);
    expect(setup.state.players[seat]!.hand).toHaveLength(0);
    expect(setup.state.players[opponent]!.security).toHaveLength(2);
    expect(setup.state.memory).toBe(10);
    expect(setup.engine.combat.isAttacking).toBe(false);
    expect(setup.state.pendingDecision).toBeUndefined();
    expect(setup.events.filter((event) => event.kind === "attackDeclared")).toHaveLength(payer < 0 ? 1 : 2);
    expect(
      setup.events.filter((event) => event.kind === "actionRejected" || event.kind === "securityRevealed"),
    ).toEqual([]);
  });
});
