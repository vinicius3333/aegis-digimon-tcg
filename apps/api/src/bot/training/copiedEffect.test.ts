import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { buildBotView } from "../view.js";
import { mainActionReady } from "./actions.js";
import { createAsyncTrainingPolicy, type TrainingWindow } from "./policy.js";
import "../../cards/index.js";

type Target = "source" | "ally" | "low" | "high" | "played";
interface Path {
  copy: boolean;
  suspend: Target | null;
  delete: Target | null;
}
const paths: Path[] = [
  { copy: false, suspend: null, delete: null },
  { copy: true, suspend: null, delete: null },
  { copy: true, suspend: null, delete: "low" },
  { copy: true, suspend: "source", delete: "low" },
  { copy: true, suspend: "ally", delete: null },
  ...(["ally", "low", "high", "played"] as const).map((suspend) => ({ copy: true, suspend, delete: "high" as const })),
];
const cases = ([0, 1] as const).flatMap((seat) =>
  [false, true].flatMap((opponentPlays) =>
    [...paths, ...(opponentPlays ? [{ copy: true, suspend: null, delete: "played" as const }] : [])].map((path) => ({
      seat,
      opponentPlays,
      ...path,
    })),
  ),
);

describe("scoped copied effects through the asynchronous policy", () => {
  it.each(cases)("seat=$seat opponentPlays=$opponentPlays copy=$copy suspend=$suspend delete=$delete", async (path) => {
    const seat = path.seat;
    const opponent = seat === 0 ? 1 : 0;
    const playingSeat = path.opponentPlays ? opponent : seat;
    const setup = setupEngine({
      [seat]: {
        battleArea: [
          { card: "EX8-074", as: "source" },
          { card: "EX9-046", as: "ally" },
          { card: "BT6-090", as: "own-tamer" },
        ],
        hand: playingSeat === seat ? [{ card: "EX9-048", as: "played" }] : [],
        deck: ["EX9-046"],
      },
      [opponent]: {
        battleArea: [
          { card: "EX9-047", as: "low", dp: 8000 },
          { card: "EX9-048", as: "high", dp: 11000 },
          { card: "BT6-090", as: "opponent-tamer" },
        ],
        breeding: { card: "EX9-046", as: "breeding", under: ["EX9-005"] },
        hand: playingSeat === opponent ? [{ card: "EX9-048", as: "played" }] : [],
        deck: ["EX9-046"],
      },
    });
    setup.state.turnSeat = playingSeat;
    setup.state.memory = 10;
    await setup.ready();
    const playedId = setup.inst("played").instanceId;
    const initialBoards = ([0, 1] as const).map((owner) => [...setup.state.players[owner]!.battleArea]);
    const units = {
      source: setup.perm("source"),
      ally: setup.perm("ally"),
      low: setup.perm("low"),
      high: setup.perm("high"),
    };
    const targetId = (target: Target): string =>
      target === "played"
        ? setup.state.players[playingSeat]!.battleArea.find((unit) => unit.topCard.instanceId === playedId)!.permanentId
        : units[target].permanentId;
    const selectedWindows: { kind: "suspend" | "delete"; window: TrainingWindow }[] = [];
    let copyPrompts = 0;
    const innerPrompts: string[] = [];
    const policies = ([0, 1] as const).map((policySeat) =>
      createAsyncTrainingPolicy(setup.engine, policySeat, async (window) => {
        await Promise.resolve();
        if (window.kind === "main")
          return window.actions.findIndex(
            (action) => action.intent.type === "playCard" && action.intent.instanceId === playedId,
          );
        if (window.request?.sourceCardId !== "EX8-074") {
          if (window.kind !== "optional") throw new Error(`Unexpected other effect decision: ${window.kind}`);
          return 1;
        }
        expect(policySeat).toBe(seat);
        if (window.kind === "optional") {
          if (window.request.promptText === "ActivateEffect") {
            copyPrompts++;
            return path.copy ? 0 : 1;
          }
          if (window.request.promptText?.startsWith("Suspend")) {
            innerPrompts.push("suspend");
            return path.suspend === null ? 1 : 0;
          }
          if (window.request.promptText?.startsWith("Delete")) {
            innerPrompts.push("delete");
            return path.delete === null ? 1 : 0;
          }
          throw new Error(`Unexpected copied-effect optional: ${window.request.promptText}`);
        }
        const kind = window.request.options?.effectTextPart?.includes("You may suspend") ? "suspend" : "delete";
        selectedWindows.push({ kind, window });
        if (window.selected.length > 0)
          return window.actions.findIndex((action) => action.label === "Finish selection");
        const target = kind === "suspend" ? path.suspend : path.delete;
        expect(target).not.toBeNull();
        return window.actions.findIndex((action) => action.sourceId === targetId(target!));
      }),
    );
    expect(
      setup.engine.applyIntent(
        playingSeat,
        await policies[playingSeat]!.chooseMainAction(buildBotView(setup.state, playingSeat)!),
      ),
    ).toEqual({ ok: true });
    for (let step = 0; step < 20; step++) {
      await settle(() => setup.state.pendingDecision !== undefined || mainActionReady(setup.engine));
      const pending = setup.state.pendingDecision;
      if (pending === undefined) break;
      const request = setup.decisions.findLast(({ req }) => req.decisionId === pending.decisionId)!.req;
      expect(
        setup.engine.applyIntent(
          request.seat,
          await policies[request.seat]!.answerDecision(buildBotView(setup.state, request.seat), request),
        ),
      ).toEqual({ ok: true });
      await settle();
    }
    await settle(() => mainActionReady(setup.engine));
    expect(mainActionReady(setup.engine)).toBe(true);
    expect(setup.state.pendingDecision).toBeUndefined();
    expect(copyPrompts).toBe(1);
    expect(innerPrompts).toEqual(path.copy ? ["suspend", "delete"] : []);
    const suspendWindow = selectedWindows.find((entry) => entry.kind === "suspend")?.window;
    const deleteWindow = selectedWindows.find((entry) => entry.kind === "delete")?.window;
    const idFor = (target: Target) =>
      target === "played"
        ? (suspendWindow ?? deleteWindow)!.observation.players[playingSeat]!.board.find(
            (unit) => unit.top.instanceId === playedId,
          )!.permanentId
        : units[target].permanentId;
    const suspensionCandidates = ["source", "ally", "low", "high", "played"] as const;
    expect(suspendWindow?.actions.map((action) => action.sourceId).sort()).toEqual(
      path.suspend === null ? undefined : suspensionCandidates.map(idFor).sort(),
    );
    const raisedCeiling = path.suspend !== null && path.suspend !== "source";
    const deletionCandidates: Target[] = [
      "low",
      ...(raisedCeiling ? ["high" as const] : []),
      ...(path.opponentPlays ? ["played" as const] : []),
    ];
    expect(deleteWindow?.actions.map((action) => action.sourceId).sort()).toEqual(
      path.delete === null || deletionCandidates.length === 1 ? undefined : deletionCandidates.map(idFor).sort(),
    );
    for (const target of ["source", "ally", "low", "high"] as const) {
      const unit = units[target];
      expect(
        setup.state.players[unit.controllerSeat]!.battleArea.some(
          (candidate) => candidate.permanentId === unit.permanentId,
        ),
      ).toBe(path.delete !== target);
      expect(unit.isSuspended).toBe(path.suspend === target);
    }
    const playedUnit = setup.state.players[playingSeat]!.battleArea.find(
      (unit) => unit.topCard.instanceId === playedId,
    );
    expect(playedUnit?.isSuspended).toBe(path.delete === "played" ? undefined : path.suspend === "played");
    for (const owner of [0, 1] as const) {
      const deletedId = path.delete === null ? undefined : setup.inst(path.delete).instanceId;
      const expected = initialBoards[owner]!.filter((unit) => unit.topCard.instanceId !== deletedId).map(
        (unit) => unit.permanentId,
      );
      if (owner === playingSeat && path.delete !== "played") expected.push(playedUnit!.permanentId);
      expect(setup.state.players[owner]!.battleArea.map((unit) => unit.permanentId)).toEqual(expected);
    }
    expect(setup.state.players[seat]!.trash.map((card) => card.instanceId)).toEqual([]);
    expect(setup.state.players[opponent]!.trash.map((card) => card.instanceId)).toEqual(
      path.delete === null ? [] : [setup.inst(path.delete).instanceId],
    );
    expect(setup.state.memory).toBe(5);
    expect(setup.state.players[playingSeat]!.hand).toHaveLength(0);
    expect(setup.state.players[opponent]!.breeding?.topCard.instanceId).toBe(setup.inst("breeding").instanceId);
    expect(setup.events.filter((event) => event.kind === "attackDeclared" || event.kind === "actionRejected")).toEqual(
      [],
    );
  });
});
