import { describe, expect, it } from "vitest";
import type { Seat } from "@aegis/shared";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { buildBotView } from "../view.js";
import { mainActionReady, mainActions } from "./actions.js";
import { createAsyncTrainingPolicy, type TrainingWindow } from "./policy.js";
import "../../cards/index.js";

type Choose = (window: TrainingWindow) => number;

async function resolveMain(setup: EngineSetup, seat: Seat, choose: Choose): Promise<TrainingWindow[]> {
  const windows: TrainingWindow[] = [];
  const policy = createAsyncTrainingPolicy(setup.engine, seat, async (window) => {
    await Promise.resolve();
    windows.push(window);
    const index = choose(window);
    expect({ kind: window.kind, index }).not.toEqual({ kind: window.kind, index: -1 });
    return index;
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
  await settle(() => mainActionReady(setup.engine));
  expect(mainActionReady(setup.engine)).toBe(true);
  expect(setup.state.pendingDecision).toBeUndefined();
  expect(setup.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
  return windows;
}

const declineOther = (window: TrainingWindow): number =>
  Math.max(
    0,
    window.actions.findIndex(({ label }) => ["Decline", "Don't use", "Finish selection"].includes(label)),
  );

const materialWindows = (windows: TrainingWindow[]) =>
  windows.filter(({ actions }) => actions.some(({ label }) => /Assembly/.test(label) && label !== "Assembly play"));

describe("Assembly through the asynchronous training policy", () => {
  it.each(([0, 1] as const).flatMap((seat) => [0, 1].map((material) => ({ seat, material }))))(
    "BT26-073 main-phase Assembly seat=$seat material=$material",
    async ({ seat, material }) => {
      const setup = setupEngine({
        [seat]: {
          hand: [{ card: "BT26-073", as: "played" }],
          trash: [
            { card: "BT25-008", as: "material-0" },
            { card: "BT26-015", as: "level-five" },
            { card: "BT26-011", as: "material-1" },
            { card: "BT26-092", as: "tamer" },
          ],
        },
      });
      setup.state.turnSeat = seat;
      setup.state.memory = 10;
      await setup.ready();
      const played = setup.inst("played").instanceId;
      const materials = [setup.inst("material-0").instanceId, setup.inst("material-1").instanceId];
      const windows = await resolveMain(setup, seat, (window) => {
        if (window.kind === "main") return window.actions.findIndex(({ label }) => label === "Assembly play");
        if (materialWindows([window]).length === 0) return declineOther(window);
        if (window.selected.length === 0)
          return window.actions.findIndex(({ sourceId }) => sourceId === materials[material]);
        return window.actions.findIndex(({ label }) => label === "Finish Assembly");
      });
      const main = windows[0]!;
      expect(
        main.actions
          .filter(({ sourceId }) => sourceId === played)
          .map(({ label, projectedCost }) => ({ label, projectedCost })),
      ).toEqual([
        { label: "Play or use card", projectedCost: 8 },
        { label: "Assembly play", projectedCost: 6 },
      ]);
      expect(
        materialWindows(windows).map((window) => ({
          selected: window.selected,
          offered: window.actions.map(({ label, sourceId }) => (label === "Assembly material" ? sourceId : label)),
        })),
      ).toEqual([
        { selected: [], offered: materials },
        { selected: [materials[material]], offered: ["Finish Assembly"] },
      ]);
      const unit = setup.state.players[seat]!.battleArea.find(({ topCard }) => topCard.instanceId === played)!;
      expect(unit.stack.map(({ instanceId }) => instanceId)).toEqual([materials[material]]);
      expect(setup.state.memory).toBe(4);
      expect(setup.state.players[seat]!.trash.map(({ instanceId }) => instanceId)).toEqual(
        [
          setup.inst("material-0").instanceId,
          setup.inst("level-five").instanceId,
          setup.inst("material-1").instanceId,
          setup.inst("tamer").instanceId,
        ].filter((id) => id !== materials[material]),
      );
    },
  );

  it.each([0, 1] as const)("BT26-085 requires five different levels seat=%s", async (seat) => {
    const setup = setupEngine({
      [seat]: {
        hand: [{ card: "BT26-085", as: "played" }],
        trash: [
          { card: "BT26-001", as: "level-2" },
          { card: "BT26-009", as: "level-3" },
          { card: "BT25-008", as: "no-chronomon-text" },
          { card: "BT24-034", as: "level-4" },
          { card: "BT26-011", as: "same-level-4" },
          { card: "BT26-015", as: "level-5" },
          { card: "BT26-016", as: "level-6" },
          { card: "BT26-092", as: "tamer" },
        ],
      },
    });
    setup.state.turnSeat = seat;
    setup.state.memory = 10;
    await setup.ready();
    const id = (alias: string) => setup.inst(alias).instanceId;
    const picks = ["level-4", "level-2", "level-3", "level-5", "level-6"].map(id);
    const windows = await resolveMain(setup, seat, (window) => {
      if (window.kind === "main") return window.actions.findIndex(({ label }) => label === "Assembly play");
      if (materialWindows([window]).length === 0) return declineOther(window);
      const next = picks[window.selected.length];
      return next === undefined
        ? window.actions.findIndex(({ label }) => label === "Finish Assembly")
        : window.actions.findIndex(({ sourceId }) => sourceId === next);
    });
    const offered = materialWindows(windows).map((window) =>
      window.actions.map(({ label, sourceId }) => (label === "Assembly material" ? sourceId : label)),
    );
    const eligible = ["level-2", "level-3", "level-4", "same-level-4", "level-5", "level-6"].map(id);
    expect(offered[0]).toEqual(eligible);
    expect(offered[1]).toEqual(
      eligible.filter((candidate) => candidate !== picks[0] && candidate !== id("same-level-4")),
    );
    expect(offered.slice(1, 5).every((choices) => !choices.includes("Finish Assembly"))).toBe(true);
    expect(offered[5]).toEqual(["Finish Assembly"]);
    const unit = setup.state.players[seat]!.battleArea.find(({ topCard }) => topCard.instanceId === id("played"))!;
    expect(new Set(unit.stack.map(({ instanceId }) => instanceId))).toEqual(new Set(picks));
    expect(setup.state.memory).toBe(3);
    expect(setup.state.players[seat]!.trash.map(({ instanceId }) => instanceId)).toEqual([
      id("no-chronomon-text"),
      id("same-level-4"),
      id("tamer"),
    ]);
  });

  it("omits Assembly when the trash cannot complete a recipe", async () => {
    const setup = setupEngine({
      0: {
        hand: [{ card: "BT26-085", as: "played" }],
        trash: [
          { card: "BT26-009", as: "level-3" },
          { card: "BT24-034", as: "level-4" },
          { card: "BT26-011", as: "same-level-4" },
          { card: "BT26-015", as: "level-5" },
          { card: "BT26-016", as: "level-6" },
        ],
      },
    });
    setup.state.memory = 10;
    await setup.ready();
    expect(mainActions(setup.engine, 0).map(({ label }) => label)).toEqual(["End main phase", "Play or use card"]);
  });

  it.each(([0, 1] as const).flatMap((seat) => [true, false].map((assemble) => ({ seat, assemble }))))(
    "BT26-096 effect play offers BT26-073 Assembly seat=$seat assemble=$assemble",
    async ({ seat, assemble }) => {
      const setup = setupEngine({
        [seat]: {
          hand: [{ card: "BT26-073", as: "played" }],
          battleArea: [{ card: "BT26-096", as: "kosuke" }],
          trash: [
            { card: "BT25-008", as: "material" },
            { card: "BT26-015", as: "level-five" },
          ],
          deck: [{ card: "BT26-009", as: "deck" }],
        },
      });
      setup.state.turnSeat = seat;
      setup.state.memory = 10;
      await setup.ready();
      const played = setup.inst("played").instanceId;
      const material = setup.inst("material").instanceId;
      const windows = await resolveMain(setup, seat, (window) => {
        if (window.kind === "main") return window.actions.findIndex(({ intent }) => intent.type === "activateEffect");
        if (materialWindows([window]).length > 0) {
          if (!assemble) return window.actions.findIndex(({ label }) => label === "Decline Assembly");
          return window.selected.length === 0
            ? window.actions.findIndex(({ sourceId }) => sourceId === material)
            : window.actions.findIndex(({ label }) => label === "Finish Assembly");
        }
        if (window.request?.sourceCardId === "BT26-096" && window.kind !== "optional")
          return window.selected.length === 0
            ? window.actions.findIndex(({ sourceId }) => sourceId === played)
            : window.actions.findIndex(({ label }) => label === "Finish selection");
        if (window.request?.sourceCardId === "BT26-096")
          return window.actions.findIndex(({ label }) => label === "Accept");
        return declineOther(window);
      });
      expect(
        materialWindows(windows).map((window) =>
          window.actions.map(({ label, sourceId }) => (label === "Assembly material" ? sourceId : label)),
        ),
      ).toEqual(assemble ? [[material, "Decline Assembly"], ["Finish Assembly"]] : [[material, "Decline Assembly"]]);
      const unit = setup.state.players[seat]!.battleArea.find(({ topCard }) => topCard.instanceId === played)!;
      expect(unit.stack.map(({ instanceId }) => instanceId)).toEqual(assemble ? [material] : []);
      expect(setup.state.memory).toBe(assemble ? 6 : 4);
      expect(setup.state.players[seat]!.deck.at(-1)?.instanceId).toBe(setup.inst("kosuke").instanceId);
    },
  );
});
