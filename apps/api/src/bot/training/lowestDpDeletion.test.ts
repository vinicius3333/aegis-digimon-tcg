import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { buildBotView } from "../view.js";
import { mainActionReady } from "./actions.js";
import { trainingObservation } from "./observation.js";
import { createAsyncTrainingPolicy, type TrainingWindow } from "./policy.js";
import "../../cards/index.js";

describe("Hinokamuy lowest-DP deletion through the asynchronous policy", () => {
  it.each(
    ([0, 1] as const).flatMap((seat) =>
      ["digivolve", "attack"].flatMap((entry) => [0, 1].map((target) => ({ seat, entry, target }))),
    ),
  )("seat=$seat entry=$entry target=$target", async ({ seat, entry, target }) => {
    const opponent = seat === 0 ? 1 : 0;
    const setup = setupEngine({
      [seat]: {
        battleArea: [
          { card: entry === "digivolve" ? "BT25-041" : "ST23-09", as: "source" },
          { card: "EX9-048", as: "friendly", dp: 500 },
        ],
        hand: entry === "digivolve" ? [{ card: "ST23-09", as: "evolution" }] : [],
        deck: [
          { card: "EX9-046", as: "draw" },
          { card: "EX9-047", as: "tail" },
        ],
      },
      [opponent]: {
        battleArea: [
          { card: "EX9-048", as: "low-0", dp: 2000 },
          { card: "EX9-048", as: "low-1", dp: 2000, suspended: true },
          { card: "EX9-048", as: "high", dp: 4000, suspended: true },
          { card: "BT6-090", as: "tamer" },
        ],
        breeding: { card: "EX9-048", as: "breeding", dp: 1000, under: ["EX9-005"] },
        security: [{ card: "EX9-046", as: "security" }],
      },
    });
    setup.state.turnSeat = seat;
    setup.state.memory = 10;
    await setup.ready();
    const sourceId = setup.perm("source").permanentId;
    const highId = setup.perm("high").permanentId;
    const targets = [0, 1].map((index) => setup.perm(`low-${index}`).permanentId);
    const selections: TrainingWindow[] = [];
    let declaration = entry;
    const policy = createAsyncTrainingPolicy(setup.engine, seat, async (window) => {
      await Promise.resolve();
      if (window.kind === "main")
        return window.actions.findIndex(({ intent }) =>
          declaration === "digivolve"
            ? intent.type === "digivolve" &&
              intent.instanceId === setup.inst("evolution").instanceId &&
              intent.permanentId === sourceId &&
              intent.alternateRequirementIndex === 0
            : intent.type === "attack" &&
              intent.attackerPermanentId === sourceId &&
              intent.target.kind === "permanent" &&
              intent.target.permanentId === highId,
        );
      expect(window.request?.sourceCardId).toBe("ST23-09");
      expect(
        setup.engine.continuous.hasRestriction(sourceId, "beAffected", "Digimon", { byOpponentEffect: true }),
      ).toBe(true);
      selections.push(window);
      return window.selected.length
        ? window.actions.findIndex((action) => action.label === "Finish selection")
        : window.actions.findIndex((action) => action.sourceId === targets[target]);
    });
    const opponentPolicy = createAsyncTrainingPolicy(setup.engine, opponent, async (window) => {
      expect(window.kind).toBe("optional");
      expect(window.request?.sourceCardId).toBe("BT6-090");
      return 1;
    });
    // The post-evolution attack must not activate the shared once-per-turn clause again.
    for (const next of entry === "digivolve" ? ["digivolve", "attack"] : ["attack"]) {
      declaration = next;
      expect(setup.engine.applyIntent(seat, await policy.chooseMainAction(buildBotView(setup.state, seat)!))).toEqual({
        ok: true,
      });
      for (let step = 0; step < 12; step++) {
        await settle(() => setup.state.pendingDecision !== undefined || mainActionReady(setup.engine));
        const pending = setup.state.pendingDecision;
        if (!pending) break;
        const request = setup.decisions.findLast(({ req }) => req.decisionId === pending.decisionId)!.req;

        expect(
          setup.engine.applyIntent(
            request.seat,
            await (request.seat === seat ? policy : opponentPolicy).answerDecision(
              buildBotView(setup.state, request.seat),
              request,
            ),
          ),
        ).toEqual({ ok: true });
      }
      expect(mainActionReady(setup.engine)).toBe(true);
    }
    expect(selections).toHaveLength(2);
    expect(selections[0]!.actions.map((action) => action.sourceId)).toEqual(targets);
    expect(selections[1]!.selected).toEqual([targets[target]]);
    expect(selections[1]!.actions.map((action) => action.label)).toEqual(["Finish selection"]);
    expect(
      selections[0]!.observation.players[seat]!.board.find((unit) => unit.permanentId === sourceId)?.statuses
        .immuneToOpponentDigimonEffects,
    ).toBe(true);
    expect(
      trainingObservation(setup.state, seat).players[seat]!.board.find((unit) => unit.permanentId === sourceId)
        ?.statuses.immuneToOpponentDigimonEffects,
    ).toBe(true);
    expect(setup.state.players[opponent]!.battleArea.map((unit) => unit.permanentId)).toEqual([
      targets[1 - target],
      setup.perm("tamer").permanentId,
    ]);
    expect(setup.state.players[opponent]!.trash.map((card) => card.instanceId)).toEqual([
      setup.inst(`low-${target}`).instanceId,
      setup.inst("high").instanceId,
    ]);
    expect(setup.state.players[opponent]!.security.map((card) => card.instanceId)).toEqual([
      setup.inst("security").instanceId,
    ]);
    expect(setup.state.players[opponent]!.breeding?.topCard.instanceId).toBe(setup.inst("breeding").instanceId);
    expect(setup.state.players[seat]!.battleArea.map((unit) => unit.permanentId)).toEqual([
      sourceId,
      setup.perm("friendly").permanentId,
    ]);
    expect(setup.perm("source").topCard.instanceId).toBe(
      setup.inst(entry === "digivolve" ? "evolution" : "source").instanceId,
    );
    expect(setup.perm("source").stack.map((card) => card.instanceId)).toEqual(
      entry === "digivolve" ? [setup.inst("source").instanceId] : [],
    );
    expect(setup.perm("source").isSuspended).toBe(true);
    expect(setup.state.players[seat]!.hand.map((card) => card.instanceId)).toEqual(
      entry === "digivolve" ? [setup.inst("draw").instanceId] : [],
    );
    expect(setup.state.players[seat]!.deck.map((card) => card.instanceId)).toEqual([
      ...(entry === "attack" ? [setup.inst("draw").instanceId] : []),
      setup.inst("tail").instanceId,
    ]);
    expect(setup.state.players[seat]!.trash).toHaveLength(0);
    expect(setup.state.memory).toBe(entry === "digivolve" ? 7 : 10);
    expect(setup.engine.combat.isAttacking).toBe(false);
    expect(setup.state.pendingDecision).toBeUndefined();
    expect(setup.events.filter((event) => event.kind === "attackDeclared")).toHaveLength(1);
    expect(
      setup.events.filter((event) => event.kind === "securityRevealed" || event.kind === "actionRejected"),
    ).toEqual([]);
  });
});
