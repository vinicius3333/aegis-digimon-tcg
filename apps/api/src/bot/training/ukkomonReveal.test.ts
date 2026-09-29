import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { buildBotView } from "../view.js";
import { createAsyncTrainingPolicy, type TrainingWindow } from "./policy.js";
import "../../cards/index.js";

const cases = ([0, 1] as const).flatMap((seat) =>
  ["digimon", "tamer"].flatMap((pick) => [true, false].map((hatch) => ({ seat, pick, hatch }))),
);

describe("BT16-082 breeding-move reveal through the asynchronous policy", () => {
  it.each(cases)("seat=$seat pick=$pick hatch=$hatch", async ({ seat, pick, hatch }) => {
    const setup = setupEngine({
      [seat]: {
        breeding: { card: "BT26-009", as: "mover", under: ["BT26-001"] },
        battleArea: [{ card: "BT16-082", as: "ukkomon" }],
        deck: [
          { card: "BT26-011", as: "digimon" },
          { card: "BT8-095", as: "option" },
          { card: "BT26-092", as: "tamer" },
          { card: "BT26-015", as: "hidden-tail" },
        ],
        eggDeck: [{ card: "BT26-001", as: "egg" }],
      },
    });
    setup.state.turnSeat = seat;
    setup.state.memory = 3;
    await setup.ready();
    setup.state.phase = Phase.Breeding;
    const id = (alias: string) => setup.inst(alias).instanceId;
    const revealed = ["digimon", "option", "tamer"].map(id);
    const windows: TrainingWindow[] = [];
    const policy = createAsyncTrainingPolicy(setup.engine, seat, async (window) => {
      await Promise.resolve();
      if (window.kind === "breeding")
        return window.actions.findIndex(({ intent }) => intent.type === "moveFromBreeding");
      windows.push(window);
      if (window.kind === "optional")
        return window.actions.findIndex(({ label }) => label === (hatch ? "Accept" : "Decline"));
      if (window.kind === "orderCards") return 0;
      if (window.selected.length) return window.actions.findIndex(({ label }) => label === "Finish selection");
      return window.actions.findIndex(({ sourceId }) => sourceId === id(pick));
    });
    let movementComplete = false;
    const movement = setup.engine.breeding.run(seat, false).then(() => {
      movementComplete = true;
    });
    const initial = JSON.stringify(buildBotView(setup.state, seat));
    for (const hidden of [...revealed, id("hidden-tail"), id("egg")]) expect(initial).not.toContain(hidden);
    expect(setup.engine.applyIntent(seat, await policy.chooseBreedingAction(buildBotView(setup.state, seat)!))).toEqual(
      { ok: true },
    );
    for (let step = 0; step < 12; step++) {
      await settle(() => setup.state.pendingDecision !== undefined || movementComplete);
      const pending = setup.state.pendingDecision;
      if (!pending) break;
      const request = setup.decisions.findLast(({ req }) => req.decisionId === pending.decisionId)!.req;
      expect(request.seat).toBe(seat);
      expect(request.sourceCardId).toBe("BT16-082");
      expect(
        setup.engine.applyIntent(seat, await policy.answerDecision(buildBotView(setup.state, seat), request)),
      ).toEqual({ ok: true });
    }
    await movement;
    expect(movementComplete).toBe(true);
    expect(setup.state.pendingDecision).toBeUndefined();
    expect(setup.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
    const selection = windows.find((window) => window.kind === "selectCards" && window.selected.length === 0)!;
    expect(selection.actions.map(({ sourceId }) => sourceId)).toEqual([id("digimon"), id("tamer")]);
    expect(selection.observation.revealed.map(({ instanceId }) => instanceId)).toEqual(revealed);
    expect(JSON.stringify(windows)).not.toContain(id("hidden-tail"));
    expect(windows.filter((window) => window.kind === "optional")).toHaveLength(1);
    const player = setup.state.players[seat]!;
    expect(player.hand.map(({ instanceId }) => instanceId)).toEqual([id(pick)]);
    expect(player.deck[0]!.instanceId).toBe(id("hidden-tail"));
    expect(new Set(player.deck.slice(1).map(({ instanceId }) => instanceId))).toEqual(
      new Set(revealed.filter((revealedId) => revealedId !== id(pick))),
    );
    expect(player.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([id("ukkomon"), id("mover")]);
    expect(player.breeding?.topCard.instanceId).toBe(hatch ? id("egg") : undefined);
    expect(player.eggDeck.map(({ instanceId }) => instanceId)).toEqual(hatch ? [] : [id("egg")]);
  });
});
