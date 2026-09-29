import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, settleAcrossTimers, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT8/BT8-094.js";
import "./BT11-099.js";
import { compiled } from "./BT11-090.js";

describe("BT11-090 Nicolai Petrov", () => {
  it("maps catalog facts and every printed effect to IR", () => {
    expect(getCardDefinition("BT11-090")).toMatchObject({
      cardId: "BT11-090",
      colors: ["Blue"],
      kinds: ["Tamer"],
      playCost: 3,
    });
    expect(compiled.effects).toMatchObject([
      { trigger: "StartOfYourMainPhase", actions: [{ kind: "GainKeyword", keyword: { keyword: "Jamming" } }] },
      { trigger: "YourTurn", actions: [{ kind: "SubTrigger", event: "whenEffectAddsToOpponentHand" }] },
      { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost" }] },
    ]);
  });

  it("grants Jamming to a Gaomon/Gaogamon-named Digimon at start of main", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-090", as: "nicolai" }, { card: "BT11-020", as: "gaogamon" }, "BT1-009"],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-012", "BT1-013"],
        },
        1: { deck: ["BT1-014", "BT1-015"], security: ["BT1-016", "BT1-017"] },
      },
      { autoSelectCards: true },
    );
    s.state.isFirstPlayersFirstTurn = false;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).hasKeyword(s.perm("gaogamon"), "Jamming")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("suspends itself to gain 1 memory when an effect adds cards to the opponent's hand on its turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-090", as: "nicolai" },
            { card: "BT1-037", as: "blueProvider" },
          ],
          hand: [
            { card: "BT11-099", as: "first-provider" },
            { card: "BT11-099", as: "second-provider" },
            { card: "BT11-099", as: "third-provider" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          security: ["BT1-014", "BT1-015"],
        },
        1: {
          battleArea: [
            { card: "BT1-037", as: "target-one", under: ["BT1-028"] },
            { card: "BT1-037", as: "target-two", under: ["BT1-028"] },
            { card: "BT1-037", as: "target-three", under: ["BT1-028"] },
          ],
          deck: ["BT1-016", "BT1-017", "BT1-018"],
          security: ["BT1-019", "BT1-020"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.isFirstPlayersFirstTurn = false;
    s.state.memory = 10;
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first-provider").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("nicolai").isSuspended && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(6);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second-provider").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.trash.some((c) => c.cardId === "BT11-099") &&
        s.state.players[1]!.battleArea.length === 1,
    );
    expect(s.state.memory).toBe(1);
    expect(s.perm("nicolai").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = 10;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("third-provider").instanceId })).toEqual({
      ok: true,
    });
    await settleAcrossTimers(
      () =>
        s.state.pendingDecision === undefined &&
        s.perm("nicolai").isSuspended &&
        s.state.memory === 6 &&
        s.state.players[1]!.battleArea.length === 0,
    );
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(6);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });

  it("does not gain memory from the same event on the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT11-090", as: "nicolai" }] } }, { autoAcceptOptional: true });
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenEffectAddsToOpponentHand", { effectAddedToHandSeat: 1 });

    expect(s.perm("nicolai").isSuspended).toBe(false);
    expect(s.state.memory).toBe(0);
  });
});

describe("BT11-090 Nicolai Petrov — KB Q&A rulings", () => {
  async function runTurnWithBreedingMove(startingMemory: number) {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-090", as: "nicolai" },
            { card: "BT11-020", as: "gaogamon" },
          ],
          breeding: { card: "BT1-009", dp: 3000, as: "mover" },
          deck: ["BT1-010", "BT1-010"],
          eggDeck: ["BT1-001"],
        },
        1: {
          battleArea: [{ card: "BT8-094", as: "emperor" }, "BT1-009"],
          deck: ["BT1-010"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = startingMemory;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("mover").permanentId })).toEqual({
      ok: true,
    });
    return { s, turn };
  }

  const nicolaiStartOfMainTriggers = (s: EngineSetup) =>
    s.events.filter((event) => event.kind === "effectTriggered" && event.sourceCardId === "BT11-090");

  it("does not activate [Start of Your Main Phase] when the memory crossed to the opponent before the main phase (Q2116)", async () => {
    const crossed = await runTurnWithBreedingMove(1);
    await crossed.turn;

    const phases = crossed.s.events.flatMap((event) => (event.kind === "phaseChanged" ? [event.phase] : []));
    expect(crossed.s.state.memory).toBe(-1);
    expect(phases).not.toContain(Phase.Main);
    expect(nicolaiStartOfMainTriggers(crossed.s)).toHaveLength(0);

    const control = await runTurnWithBreedingMove(3);
    await advance(control.s.engine).waitForMainPhase(0);
    expect(nicolaiStartOfMainTriggers(control.s).length).toBeGreaterThan(0);
    expect(observe(control.s.engine).hasKeyword(control.s.perm("gaogamon"), "Jamming")).toBe(true);
    advance(control.s.engine).endMainPhaseIfOpen(0);
    await control.turn;
  });
});
