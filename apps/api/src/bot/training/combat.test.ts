import { describe, expect, it } from "vitest";
import type { ServerEvent } from "@aegis/shared";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { buildBotView } from "../view.js";
import { mainActions } from "./actions.js";
import { createTrainingPolicy, type TrainingWindow } from "./policy.js";
import "../../cards/index.js";

async function eventOf<K extends ServerEvent["kind"]>(
  setup: EngineSetup,
  kind: K,
): Promise<Extract<ServerEvent, { kind: K }>> {
  await settle(() => setup.events.some((event) => event.kind === kind));
  return setup.events.find((event) => event.kind === kind) as Extract<ServerEvent, { kind: K }>;
}

function attack(setup: EngineSetup, target?: string): void {
  const candidate = mainActions(setup.engine, 0).find(
    ({ intent }) =>
      intent.type === "attack" &&
      intent.attackerPermanentId === setup.perm("attacker").permanentId &&
      (target === undefined
        ? intent.target.kind === "player"
        : intent.target.kind === "permanent" && intent.target.permanentId === setup.perm(target).permanentId),
  );
  expect(candidate).toBeDefined();
  expect(setup.engine.applyIntent(0, candidate!.intent)).toEqual({ ok: true });
}

describe("scoped combat actions through the training adapter", () => {
  it.each([true, false])("resolves Barrier accept=%s against actual battle deletion", async (accept) => {
    const setup = setupEngine(
      {
        0: { battleArea: [{ card: "BT9-112", as: "attacker" }] },
        1: { battleArea: [{ card: "BT26-026", as: "defender", suspended: true }], security: ["EX9-046", "EX9-048"] },
      },
      { autoDeclineOptional: true },
    );
    await setup.ready();
    attack(setup, "defender");
    const prompt = await eventOf(setup, "barrierPrompt");
    let window: TrainingWindow | undefined;
    const policy = createTrainingPolicy(setup.engine, 1, (offered) => {
      window = offered;
      return accept ? 0 : 1;
    });
    const response = policy.chooseBarrierResponse(buildBotView(setup.state, 1)!, prompt.permanentId);
    expect(window!.actions.map(({ intent }) => intent)).toEqual([
      { type: "respondBarrier", permanentId: prompt.permanentId, accept: true },
      { type: "respondBarrier", permanentId: prompt.permanentId, accept: false },
    ]);
    expect(setup.engine.applyIntent(1, response)).toEqual({ ok: true });
    await eventOf(setup, "combatResolved");
    expect(setup.state.players[1]!.battleArea.some((unit) => unit.permanentId === prompt.permanentId)).toBe(accept);
    expect(setup.state.players[1]!.security).toHaveLength(accept ? 1 : 2);
    expect(setup.state.pendingDecision).toBeUndefined();
  });

  it.each([0, 1, 2])("resolves Alliance choice %s: decline or either ally", async (choice) => {
    const setup = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST23-04", as: "attacker" },
            { card: "BT25-032", as: "ally-a" },
            { card: "EX9-046", as: "ally-b" },
          ],
        },
        1: {
          battleArea: [
            { card: "EX9-048", as: "defender", suspended: true },
            { card: "ST23-09", as: "blocker" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    await setup.ready();
    const initialDP = setup.perm("attacker").currentDP;
    attack(setup, "defender");
    const prompt = await eventOf(setup, "alliancePrompt");
    const policy = createTrainingPolicy(setup.engine, 0, (window) => {
      expect(window.actions.map(({ intent }) => intent.type)).toEqual([
        "respondAlliance",
        "respondAlliance",
        "respondAlliance",
      ]);
      return choice;
    });
    const selected = choice === 0 ? undefined : prompt.eligibleAllyIds[choice - 1];
    const ally = setup.state.players[0]!.battleArea.find((unit) => unit.permanentId === selected);
    const bonus = ally?.currentDP ?? 0;
    expect(setup.engine.applyIntent(0, policy.chooseAllianceResponse(buildBotView(setup.state, 0)!, prompt))).toEqual({
      ok: true,
    });
    const block = await eventOf(setup, "blockWindowOpened");
    expect(setup.perm("attacker").currentDP).toBe(initialDP + bonus);
    expect(setup.perm("attacker").securityAttack).toBe(choice === 0 ? 1 : 2);
    expect(setup.perm("ally-a").isSuspended).toBe(selected === setup.perm("ally-a").permanentId);
    expect(setup.perm("ally-b").isSuspended).toBe(selected === setup.perm("ally-b").permanentId);
    const defender = createTrainingPolicy(setup.engine, 1, () => 0);
    expect(
      setup.engine.applyIntent(
        1,
        defender.chooseBlockResponse(buildBotView(setup.state, 1)!, {
          ...block,
          mustBlock: false,
          targetsPlayer: false,
        }),
      ),
    ).toEqual({ ok: true });
    await eventOf(setup, "combatResolved");
    expect(setup.state.players[1]!.battleArea.some((unit) => unit.topCard.cardId === "EX9-048")).toBe(false);
  });

  it.each([0, 1, 2])("resolves voluntary block choice %s including declining", async (choice) => {
    const setup = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-032", as: "attacker" }] },
        1: {
          battleArea: [
            { card: "ST23-09", as: "block-a" },
            { card: "ST23-09", as: "block-b" },
          ],
          security: ["EX9-046", "EX9-046"],
        },
      },
      { autoDeclineOptional: true },
    );
    await setup.ready();
    attack(setup);
    const prompt = await eventOf(setup, "blockWindowOpened");
    expect(prompt.mustBlock ?? false).toBe(false);
    const policy = createTrainingPolicy(setup.engine, 1, (window) => {
      expect(window.actions).toHaveLength(3);
      return choice;
    });
    expect(
      setup.engine.applyIntent(
        1,
        policy.chooseBlockResponse(buildBotView(setup.state, 1)!, { ...prompt, mustBlock: false, targetsPlayer: true }),
      ),
    ).toEqual({ ok: true });
    await eventOf(setup, choice === 0 ? "securityChecked" : "combatResolved");
    await settle(() => !setup.engine.combat.isAttacking);
    expect(setup.state.players[1]!.security).toHaveLength(choice === 0 ? 1 : 2);
    expect(setup.state.players[0]!.battleArea).toHaveLength(choice === 0 ? 1 : 0);
    const selected = choice === 0 ? undefined : prompt.eligibleBlockerIds[choice - 1];
    expect(setup.perm("block-a").isSuspended).toBe(selected === setup.perm("block-a").permanentId);
    expect(setup.perm("block-b").isSuspended).toBe(selected === setup.perm("block-b").permanentId);
  });

  it.each([0, 1])("resolves Collision by selecting blocker %s without offering decline", async (choice) => {
    const setup = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-047", as: "attacker" }] },
        1: {
          battleArea: [
            { card: "ST23-09", as: "block-a" },
            { card: "ST23-09", as: "block-b" },
          ],
          security: ["EX9-046", "EX9-046"],
        },
      },
      { autoDeclineOptional: true },
    );
    await setup.ready();
    attack(setup);
    const prompt = await eventOf(setup, "blockWindowOpened");
    expect(prompt.mustBlock).toBe(true);
    const policy = createTrainingPolicy(setup.engine, 1, (window) => {
      expect(window.actions.map(({ intent }) => intent.type)).toEqual(["declareBlock", "declareBlock"]);
      return choice;
    });
    expect(
      setup.engine.applyIntent(
        1,
        policy.chooseBlockResponse(buildBotView(setup.state, 1)!, { ...prompt, mustBlock: true, targetsPlayer: true }),
      ),
    ).toEqual({ ok: true });
    await eventOf(setup, "combatResolved");
    expect(setup.state.players[1]!.security).toHaveLength(2);
    expect(setup.state.players[0]!.battleArea).toHaveLength(0);
    expect(setup.perm("block-a").isSuspended).toBe(
      prompt.eligibleBlockerIds[choice] === setup.perm("block-a").permanentId,
    );
    expect(setup.perm("block-b").isSuspended).toBe(
      prompt.eligibleBlockerIds[choice] === setup.perm("block-b").permanentId,
    );
  });
  it.each([-1, 0, 1])("resolves Vortex choice %s through real end-turn decisions", async (choice) => {
    const setup = setupEngine(
      {
        0: { hand: ["BT25-032"], deck: ["BT25-032", "BT25-032"], battleArea: [{ card: "EX8-074", as: "attacker" }] },
        1: {
          battleArea: [
            { card: "EX9-048", as: "target-a", suspended: true },
            { card: "EX9-046", as: "target-b", suspended: true },
          ],
        },
      },
      { autoOrderTriggers: false, autoOrderCards: false },
    );
    await setup.ready();
    let finished = false;
    const turn = setup.engine.runOneTurn().then(() => {
      finished = true;
    });
    await advance(setup.engine).waitForMainPhase(0);
    setup.perm("attacker").enterFieldTurnCount = setup.state.turnCount;
    await setup.engine.recomputeContinuousEffects();
    expect(mainActions(setup.engine, 0).some(({ intent }) => intent.type === "attack")).toBe(false);
    const windows: TrainingWindow[] = [];
    const target = setup.perm(choice === 1 ? "target-b" : "target-a");
    const policy = createTrainingPolicy(setup.engine, 0, (window) => {
      windows.push(window);
      if (window.kind === "optional") return choice < 0 ? 1 : 0;
      if (window.selected.length > 0) return window.actions.findIndex((action) => action.label === "Finish selection");
      if (window.request?.options?.selectionContext === "attackTarget") {
        return window.actions.findIndex(
          (action) => action.sourceId === target.permanentId || action.sourceId === target.topCard.instanceId,
        );
      }
      return 0;
    });
    expect(setup.engine.applyIntent(0, policy.chooseMainAction(buildBotView(setup.state, 0)!))).toEqual({ ok: true });
    for (let step = 0; !finished && step < 30; step++) {
      await settle(() => finished || setup.state.pendingDecision !== undefined);
      if (finished) break;
      const pending = setup.state.pendingDecision!;
      const request = setup.decisions.findLast(({ req }) => req.decisionId === pending.decisionId)!.req;
      expect(
        setup.engine.applyIntent(request.seat, policy.answerDecision(buildBotView(setup.state, request.seat), request)),
      ).toEqual({ ok: true });
      await settle();
    }
    expect(finished).toBe(true);
    await turn;
    expect(windows.some((window) => window.kind === "optional")).toBe(true);
    if (choice >= 0) {
      const targeting = windows.find((window) => window.request?.options?.selectionContext === "attackTarget");
      expect(targeting).toBeDefined();
      expect(targeting!.actions.filter((action) => action.sourceId !== undefined)).toHaveLength(2);
      expect(setup.state.players[1]!.battleArea.some((unit) => unit.permanentId === target.permanentId)).toBe(false);
      expect(setup.events.some((event) => event.kind === "attackDeclared")).toBe(true);
    } else {
      expect(setup.state.players[1]!.battleArea).toHaveLength(2);
      expect(setup.events.some((event) => event.kind === "attackDeclared")).toBe(false);
    }
  });
});
