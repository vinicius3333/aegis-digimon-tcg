import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { buildBotView } from "../view.js";
import { mainActionReady } from "./actions.js";
import { createAsyncTrainingPolicy, type TrainingWindow } from "./policy.js";
import "../../cards/index.js";

describe("Habakirimon leave-field protection through the asynchronous policy", () => {
  it.each(
    ([0, 1] as const).flatMap((seat) =>
      [false, true].flatMap((ally) => [false, true].map((accept) => ({ seat, ally, accept }))),
    ),
  )("seat=$seat ally=$ally accept=$accept", async ({ seat, ally, accept }) => {
    const opponent = seat === 0 ? 1 : 0;
    const setup = setupEngine({
      [seat]: {
        battleArea: [
          { card: "BT25-043", as: "protector", under: [{ card: "BT25-041", as: "protector-source" }] },
          ...(ally ? [{ card: "ST23-03", as: "ally", under: [{ card: "BT25-032", as: "ally-source" }] }] : []),
        ],
        security: [
          { card: "ST23-06", as: "security-0" },
          { card: "ST23-12", as: "security-1" },
          { card: "BT26-025", as: "security-2" },
        ],
      },
      [opponent]: { hand: [{ card: "BT25-076", as: "ghoulmon" }] },
    });
    setup.state.turnSeat = opponent;
    setup.state.memory = 10;
    await setup.ready();
    const protectionWindows: TrainingWindow[] = [];
    const target = setup.perm(ally ? "ally" : "protector");
    const targetTop = target.topCard.instanceId;
    const targetSource = setup.inst(ally ? "ally-source" : "protector-source").instanceId;
    const defender = createAsyncTrainingPolicy(setup.engine, seat, async (window) => {
      await Promise.resolve();
      protectionWindows.push(window);
      expect(window.kind).toBe("optional");
      return accept ? 0 : 1;
    });
    const attacker = createAsyncTrainingPolicy(setup.engine, opponent, async (window) => {
      await Promise.resolve();
      if (window.kind === "main")
        return window.actions.findIndex(
          ({ intent }) => intent.type === "playCard" && intent.instanceId === setup.inst("ghoulmon").instanceId,
        );
      if (window.selected.length) return window.actions.findIndex((action) => action.label === "Finish selection");
      return window.actions.findIndex((action) => action.sourceId === target.permanentId);
    });
    expect(
      setup.engine.applyIntent(opponent, await attacker.chooseMainAction(buildBotView(setup.state, opponent)!)),
    ).toEqual({ ok: true });
    for (let step = 0; step < 16; step++) {
      await settle(() => setup.state.pendingDecision !== undefined || mainActionReady(setup.engine));
      const pending = setup.state.pendingDecision;
      if (!pending) break;
      const request = setup.decisions.findLast(({ req }) => req.decisionId === pending.decisionId)!.req;
      expect(
        setup.engine.applyIntent(
          request.seat,
          await (request.seat === seat ? defender : attacker).answerDecision(
            buildBotView(setup.state, request.seat),
            request,
          ),
        ),
      ).toEqual({ ok: true });
    }
    expect(mainActionReady(setup.engine)).toBe(true);
    expect(setup.state.pendingDecision).toBeUndefined();
    expect(setup.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
    expect(protectionWindows).toHaveLength(1);
    expect(protectionWindows[0]!.request).toMatchObject({ seat, sourceCardId: "BT25-043" });
    expect(protectionWindows[0]!.actions.map((action) => action.intent)).toEqual([
      {
        type: "respondDecision",
        decisionId: protectionWindows[0]!.request!.decisionId,
        response: { kind: "optional", accept: true },
      },
      {
        type: "respondDecision",
        decisionId: protectionWindows[0]!.request!.decisionId,
        response: { kind: "optional", accept: false },
      },
    ]);
    expect(setup.state.players[seat]!.battleArea.map((unit) => unit.topCard.instanceId)).toEqual([
      ...(accept || ally ? [setup.inst("protector").instanceId] : []),
      ...(ally && accept ? [targetTop] : []),
    ]);
    expect(setup.state.players[seat]!.battleArea.map((unit) => unit.stack.map((card) => card.instanceId))).toEqual([
      ...(accept || ally ? [[setup.inst("protector-source").instanceId]] : []),
      ...(ally && accept ? [[targetSource]] : []),
    ]);
    expect(setup.state.players[seat]!.hand).toHaveLength(0);
    const security = [0, 1, 2].map((index) => setup.inst(`security-${index}`).instanceId);
    // Preventing Ghoulmon's deletion also triggers its "didn't delete" security trash.
    expect(setup.state.players[seat]!.security.map((card) => card.instanceId)).toEqual(
      accept ? security.slice(2) : security,
    );
    expect(setup.state.players[seat]!.trash.map((card) => card.instanceId).sort()).toEqual(
      (accept ? security.slice(0, 2) : [targetSource, targetTop]).sort(),
    );
    expect(setup.state.players[opponent]!.battleArea.map((unit) => unit.topCard.instanceId)).toEqual([
      setup.inst("ghoulmon").instanceId,
    ]);
    expect(setup.state.players[opponent]!.hand).toHaveLength(0);
    expect(setup.state.players[opponent]!.trash).toHaveLength(0);
    expect(setup.state.memory).toBe(-2);
  });
});
