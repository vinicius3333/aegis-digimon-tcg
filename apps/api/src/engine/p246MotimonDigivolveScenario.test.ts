import { GameState, Phase, PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { createEvaluationPolicy } from "../bot/policy.js";
import { buildBotView } from "../bot/view.js";
import { layDevScenario, type DevScenarioId } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

const HOST_STACK = ["P-246", "EX13-027", "BT14-034", "EX13-031"];
const METAL_ETEMON = "dev-p246-metal-etemon";

async function attackSecurityWithSukamon(scenario: DevScenarioId) {
  const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true });
  layDevScenario(scenario, s.state, [BLUE_DECK, RED_DECK]);
  await s.ready();
  const turn = s.engine.runOneTurn();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  const memoryBeforeAttack = s.state.memory;
  expect(s.state.players[1]!.security[0]!.cardId).toBe("BT1-080");
  const eventsBeforeAttack = s.events.length;

  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: "p246-motimon-sukamon",
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => !observe(s.engine).isAttacking());
  await settle();

  const player = s.state.players[0]!;
  const host = player.battleArea.find(({ permanentId }) => permanentId === "p246-motimon-host")!;
  const attackEvents = s.events.slice(eventsBeforeAttack);
  const finish = async () => {
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  };
  return { s, player, host, attackEvents, memoryBeforeAttack, finish };
}

describe("P-246 Motimon dev scenarios", () => {
  it("stages KingEtemon over the reporter's stack, a Sukamon attacker, MetalEtemon, and a Titamon security wall", () => {
    const state = new GameState();
    state.players.push(new PlayerState(), new PlayerState());

    layDevScenario("arena-p246-motimon-kingetemon", state, [BLUE_DECK, RED_DECK]);

    expect(state.turnSeat).toBe(0);
    expect(state.memory).toBe(3);
    const [host, attacker] = state.players[0]!.battleArea;
    expect(host!.topCard.cardId).toBe("EX13-035");
    expect(host!.stack.map(({ cardId }) => cardId)).toEqual(HOST_STACK);
    expect(attacker!.topCard.cardId).toBe("BT14-034");
    expect(state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(METAL_ETEMON);
    expect(state.players[1]!.security[0]!.cardId).toBe("BT1-080");
  });

  it("stages the de-digivolved board with KingSukamon on top and KingEtemon in the trash", () => {
    const state = new GameState();
    state.players.push(new PlayerState(), new PlayerState());

    layDevScenario("arena-p246-motimon-after-de-digivolve", state, [BLUE_DECK, RED_DECK]);

    const [host] = state.players[0]!.battleArea;
    expect(host!.topCard.cardId).toBe("EX13-031");
    expect(host!.stack.map(({ cardId }) => cardId)).toEqual(HOST_STACK.slice(0, -1));
    expect(state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("EX13-035");
  });

  it("does not digivolve the level 6 KingEtemon into level 6 MetalEtemon", async () => {
    const { s, player, host, attackEvents, memoryBeforeAttack, finish } = await attackSecurityWithSukamon(
      "arena-p246-motimon-kingetemon",
    );

    expect(attackEvents.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "P-246")).toBe(
      false,
    );
    expect(host.topCard.cardId).toBe("EX13-035");
    expect(host.stack.map(({ cardId }) => cardId)).toEqual(HOST_STACK);
    expect(player.hand.map(({ instanceId }) => instanceId)).toContain(METAL_ETEMON);
    expect(player.trash.map(({ cardId }) => cardId)).not.toContain("EX13-035");
    expect(s.state.memory).toBe(memoryBeforeAttack);

    await finish();
  });

  it("digivolves the level 5 KingSukamon left by De-Digivolve into MetalEtemon for 2 memory", async () => {
    const { s, player, host, memoryBeforeAttack, finish } = await attackSecurityWithSukamon(
      "arena-p246-motimon-after-de-digivolve",
    );

    expect(host.topCard.instanceId).toBe(METAL_ETEMON);
    expect(host.stack.map(({ cardId }) => cardId)).toEqual(HOST_STACK);
    expect(player.hand.map(({ instanceId }) => instanceId)).not.toContain(METAL_ETEMON);
    expect(s.state.memory).toBe(memoryBeforeAttack - 2);

    await finish();
  });

  it("stages the bot's turn with Aegiochusmon: Blue in hand and the memory to play it", async () => {
    const state = new GameState();
    state.players.push(new PlayerState(), new PlayerState());
    layDevScenario("arena-de-digivolve-visibility", state, [BLUE_DECK, RED_DECK]);

    expect(state.turnSeat).toBe(1);
    expect(state.memory).toBe(8);
    expect(state.players[0]!.battleArea[0]!.topCard.cardId).toBe("EX13-035");
    expect(state.players[1]!.hand.map(({ instanceId }) => instanceId)).toEqual(["dev-p246-aegiochusmon-blue"]);

    state.turnCount = 1;
    state.phase = Phase.Main;
    const botView = buildBotView(state, 1);
    expect(createEvaluationPolicy({ seed: 1 }).chooseMainAction(botView!)).toMatchObject({
      type: "playCard",
      instanceId: "dev-p246-aegiochusmon-blue",
    });
  });

  it("de-digivolves KingEtemon with a named, face-up, public movement, then lets Motimon take MetalEtemon", async () => {
    const hostTop = "dev-field-0-p246-motimon-host";
    const s = setupEngine(
      { 0: {}, 1: {} },
      {
        autoAcceptOptional: true,
        autoChooseOption: true,
        autoSelectCards: true,
        preferInstanceIds: [hostTop, "p246-motimon-host"],
      },
    );
    layDevScenario("arena-de-digivolve-visibility", s.state, [BLUE_DECK, RED_DECK]);
    await s.ready();
    const host = s.state.players[0]!.battleArea.find(({ permanentId }) => permanentId === "p246-motimon-host")!;

    const botTurn = s.engine.runOneTurn();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: "dev-p246-aegiochusmon-blue" })).toEqual({
      ok: true,
    });
    await settle(() => host.topCard.cardId === "EX13-031");

    expect(s.events).toContainEqual(
      expect.objectContaining({
        kind: "cardsMoved",
        instanceIds: [hostTop],
        cardIds: ["EX13-035"],
        seat: 0,
        strippedStackTops: { permanentId: "p246-motimon-host", reason: "deDigivolve", sourceCardId: "BT25-025" },
      }),
    );
    expect(s.state.players[0]!.trash.find(({ instanceId }) => instanceId === hostTop)?.faceUp).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await botTurn;

    // runOneTurn drives a single turn; hand the next one to the viewer with the 3 memory a
    // passed turn leaves on their side.
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const ownTurn = s.engine.runOneTurn();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: "p246-motimon-sukamon",
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    // Aegiochusmon: Blue has ＜Blocker＞; its block deletes Sukamon in battle just the same.
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    const blocker = s.state.players[1]!.battleArea.find(({ topCard }) => topCard.cardId === "BT25-025")!;
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: blocker.permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking());
    await settle();

    expect(host.topCard.instanceId).toBe(METAL_ETEMON);
    expect(host.stack.map(({ cardId }) => cardId)).toEqual(HOST_STACK);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
  });
});
