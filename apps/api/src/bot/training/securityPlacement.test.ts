import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { buildBotView } from "../view.js";
import { mainActionReady } from "./actions.js";
import { createAsyncTrainingPolicy, type TrainingWindow } from "./policy.js";
import "../../cards/index.js";

describe("Liollmon security placement through the asynchronous policy", () => {
  it.each(
    ([0, 1] as const).flatMap((seat) =>
      [false, true].flatMap((moving) => [-1, 0, 1].map((hostIndex) => ({ seat, moving, hostIndex }))),
    ),
  )("seat=$seat moving=$moving host=$hostIndex", async ({ seat, moving, hostIndex }) => {
    const opponent = seat === 0 ? 1 : 0;
    const setup = setupEngine({
      [seat]: {
        battleArea: [
          { card: "ST23-13", as: "host-0", under: [{ card: "BT25-032", as: "old-0", faceUp: false }] },
          { card: "ST23-13", as: "host-1", under: [{ card: "BT25-035", as: "old-1", faceUp: false }] },
          { card: "BT6-090", as: "wrong-tamer" },
          { card: "BT25-032", as: "digimon" },
        ],
        ...(moving
          ? { breeding: { card: "BT26-025", as: "liollmon", under: ["ST23-01"] } }
          : { hand: [{ card: "BT26-025", as: "liollmon" }] }),
        security: [
          { card: "BT25-049", as: "top-security" },
          { card: "BT25-041", as: "bottom-security" },
        ],
        deck: [
          { card: "ST23-04", as: "recovery" },
          { card: "BT25-043", as: "deck-tail" },
        ],
      },
      [opponent]: { battleArea: [{ card: "ST23-13", as: "opponent-tamer" }] },
    });
    setup.state.turnSeat = seat;
    setup.state.memory = 10;
    await setup.ready();
    setup.state.phase = moving ? Phase.Breeding : Phase.Main;
    const hosts = [setup.perm("host-0"), setup.perm("host-1")];
    const windows: TrainingWindow[] = [];
    const policy = createAsyncTrainingPolicy(setup.engine, seat, async (window) => {
      await Promise.resolve();
      if (window.kind === "main")
        return window.actions.findIndex(
          ({ intent }) => intent.type === "playCard" && intent.instanceId === setup.inst("liollmon").instanceId,
        );
      if (window.kind === "breeding")
        return window.actions.findIndex(({ intent }) => intent.type === "moveFromBreeding");
      windows.push(window);
      if (window.kind === "optional") return hostIndex < 0 ? 1 : 0;
      if (window.selected.length) return window.actions.findIndex((action) => action.label === "Finish selection");
      return window.actions.findIndex((action) => action.sourceId === hosts[hostIndex]?.permanentId);
    });
    let movementComplete = false;
    const movement = moving
      ? setup.engine.breeding.run(seat, false).then(() => {
          movementComplete = true;
        })
      : undefined;
    const completed = () => (moving ? movementComplete : mainActionReady(setup.engine));
    const view = buildBotView(setup.state, seat)!;
    expect(
      setup.engine.applyIntent(
        seat,
        await (moving ? policy.chooseBreedingAction(view) : policy.chooseMainAction(view)),
      ),
    ).toEqual({ ok: true });
    for (let step = 0; step < 16; step++) {
      await settle(() => setup.state.pendingDecision !== undefined || completed());
      const pending = setup.state.pendingDecision;
      if (!pending) break;
      const request = setup.decisions.findLast(({ req }) => req.decisionId === pending.decisionId)!.req;
      expect(request.seat).toBe(seat);
      expect(request.sourceCardId).toBe("BT26-025");
      expect(
        setup.engine.applyIntent(seat, await policy.answerDecision(buildBotView(setup.state, seat), request)),
      ).toEqual({ ok: true });
    }
    expect(completed()).toBe(true);
    await movement;
    expect(setup.state.pendingDecision).toBeUndefined();
    expect(setup.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
    expect(windows.filter((window) => window.kind === "optional")).toHaveLength(1);
    expect(
      windows
        .filter((window) => window.kind !== "optional" && !window.selected.length)
        .map((window) => window.actions.map((action) => action.sourceId)),
    ).toEqual(hostIndex < 0 ? [] : [hosts.map((host) => host.permanentId)]);
    for (const [index, host] of hosts.entries()) {
      expect(host.stack.map((card) => ({ id: card.instanceId, faceUp: card.faceUp }))).toEqual([
        ...(hostIndex === index ? [{ id: setup.inst("top-security").instanceId, faceUp: false }] : []),
        { id: setup.inst(`old-${index}`).instanceId, faceUp: false },
      ]);
    }
    expect(setup.state.players[seat]!.security.map((card) => card.instanceId)).toEqual([
      setup.inst(hostIndex < 0 ? "top-security" : "recovery").instanceId,
      setup.inst("bottom-security").instanceId,
    ]);
    expect(setup.state.players[seat]!.deck.map((card) => card.instanceId)).toEqual([
      ...(hostIndex < 0 ? [setup.inst("recovery").instanceId] : []),
      setup.inst("deck-tail").instanceId,
    ]);
    expect(setup.state.players[seat]!.battleArea.map((unit) => unit.topCard.instanceId)).toEqual(
      ["host-0", "host-1", "wrong-tamer", "digimon", "liollmon"].map((label) => setup.inst(label).instanceId),
    );
    expect(setup.perm("wrong-tamer").stack).toHaveLength(0);
    expect(setup.perm("opponent-tamer").stack).toHaveLength(0);
    expect(setup.state.players[seat]!.hand).toHaveLength(0);
    expect(setup.state.players[seat]!.trash).toHaveLength(0);
    expect(setup.state.players[seat]!.breeding).toBeUndefined();
    expect(setup.state.memory).toBe(moving ? 10 : 7);
  });
});
