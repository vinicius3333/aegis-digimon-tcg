import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-081.js";
import { Phase, type Seat } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import {
  drainMicrotasks,
  settle,
  setupEngine,
  type EngineSetup,
  type SetupEngineOptions,
} from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-081", () => {
  it("plays a Dark Animal or SoC Digimon from trash on digivolution, with two copies if Eiji is underneath", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: false,
      target: {
        filter: { levelComparison: { op: "lte", value: 4 } },
        countModifier: { amount: 2, condition: { kind: "selfDigivolutionStackHasTrait" } },
      },
    }));
  it("once per turn unsuspends by deleting an opposing low-level Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "Unsuspend", cost: { kind: "deleteOwn" } }],
    }));

  it("naturally digivolves, plays from trash, and unsuspends after deleting a low-level attacker target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-078", as: "base" }],
          hand: [{ card: "BT14-081", as: "fenriloogamon" }],
          trash: [{ card: "BT14-074", as: "trashLoogarmon" }],
        },
        1: {
          battleArea: [{ card: "BT14-069", as: "target" }],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("fenriloogamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT14-081");
    expect(s.perm("base").topCard?.cardId).toBe("BT14-081");
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-074")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && !s.perm("base").isSuspended);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("base").isSuspended).toBe(false);
  });

  it("naturally plays three eligible trash cards when Eiji is in the digivolution stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-078", as: "base", under: ["BT14-087"] }],
          hand: [{ card: "BT14-081", as: "fenriloogamon" }],
          trash: ["BT14-074", "BT14-071", "BT14-072"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("fenriloogamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("base").topCard?.cardId === "BT14-081" &&
        s.state.players[0]!.battleArea.filter((perm) =>
          ["BT14-074", "BT14-071", "BT14-072"].includes(perm.topCard?.cardId ?? ""),
        ).length === 3,
    );
    expect(
      s.state.players[0]!.battleArea.filter((perm) =>
        ["BT14-074", "BT14-071", "BT14-072"].includes(perm.topCard?.cardId ?? ""),
      ),
    ).toHaveLength(3);
  });

  it("naturally keeps the main phase open at opponent memory +1, then ends at +3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-081", as: "fenriloogamon" }],
          hand: [
            { card: "BT14-069", as: "firstPlay" },
            { card: "BT14-070", as: "secondPlay" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 2;
    const turn = s.engine.runOneTurn();
    await settle(() => s.state.phase === Phase.Main);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstPlay").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-069"));
    expect(s.state.phase).toBe(Phase.Main);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondPlay").instanceId })).toEqual({
      ok: true,
    });
    await turn;
    expect(s.events).toContainEqual(expect.objectContaining({ kind: "turnEnded", endingSeat: 0 }));
  });

  it("resets the attack deletion cost and unsuspend on the next own turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-081", as: "host", under: ["BT3-085"] }],
          hand: ["BT1-009"],
          deck: Array(8).fill("BT1-009"),
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstCost" },
            { card: "BT1-009", as: "secondCost" },
          ],
          security: Array(3).fill("BT1-091"),
          hand: ["BT1-009"],
          deck: Array(8).fill("BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const firstId = s.perm("firstCost").permanentId;
    const secondId = s.perm("secondCost").permanentId;
    const remains = (id: string) => s.state.players[1]!.battleArea.some((p) => p.permanentId === id);
    const attack = () =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      });
    preferred.push(s.perm("firstCost").topCard.instanceId);
    s.state.memory = 10;
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2 && !s.perm("host").isSuspended);
    expect(remains(firstId)).toBe(false);
    expect(remains(secondId)).toBe(true);
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.perm("host").isSuspended).toBe(true);
    expect(remains(secondId)).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 10;
    preferred.splice(0, preferred.length, s.perm("secondCost").topCard.instanceId);
    const secondTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !s.perm("host").isSuspended);
    expect(remains(secondId)).toBe(false);
    expect(s.state.players[1]!.trash.filter((c) => c.cardId === "BT1-009")).toHaveLength(2);
    advance(s.engine).endMainPhaseIfOpen(0);
    await secondTurn;
  });
});

describe("BT14-081 Fenriloogamon — KB Q&A rulings", () => {
  const DECK = Array<string>(6).fill("BT1-009");
  const played = (s: EngineSetup, seat: Seat, cardId: string) =>
    s.state.players[seat]!.battleArea.some((perm) => perm.topCard?.cardId === cardId);
  const turnEndedFor = (s: EngineSetup, seat: Seat) =>
    s.events.filter((event) => event.kind === "turnEnded" && event.endingSeat === seat);

  async function playToOpponentMemoryTwo(withFenriloogamon: boolean) {
    const s = setupEngine(
      {
        0: {
          battleArea: withFenriloogamon ? [{ card: "BT14-081", as: "fenriloogamon" }] : [],
          hand: [
            { card: "BT14-069", as: "gazimon" },
            { card: "BT14-070", as: "goblimon" },
          ],
          deck: [...DECK],
        },
        1: { deck: [...DECK], security: 3 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 1;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gazimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => played(s, 0, "BT14-069"));
    await drainMicrotasks();
    return { s, turn };
  }

  it("keeps your turn going at 1 or 2 opponent memory and ends it only at 3 or more (Q2449)", async () => {
    const { s, turn } = await playToOpponentMemoryTwo(true);
    expect(s.state.memory).toBe(-2);
    expect(s.state.phase).toBe(Phase.Main);
    expect(turnEndedFor(s, 0)).toHaveLength(0);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("goblimon").instanceId })).toEqual({
      ok: true,
    });
    await turn;
    expect(turnEndedFor(s, 0)).toHaveLength(1);
    expect(played(s, 0, "BT14-070")).toBe(true);

    const control = await playToOpponentMemoryTwo(false);
    await control.turn;
    expect(turnEndedFor(control.s, 0)).toHaveLength(1);
    expect(control.s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT14-070"]);
  });

  it("does not raise the turn end condition during the opponent's turn (Q2450)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-081", as: "fenriloogamon" }], deck: [...DECK], security: 3 },
        1: {
          hand: [
            { card: "BT14-069", as: "gazimon" },
            { card: "BT14-070", as: "goblimon" },
          ],
          deck: [...DECK],
          security: 3,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = 1;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.memory.turnEndMinMemoryFor(1)).toBe(1);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gazimon").instanceId })).toEqual({
      ok: true,
    });
    await turn;
    expect(turnEndedFor(s, 1)).toHaveLength(1);
    expect(s.engine.memory.memoryFor(0)).toBe(2);
    expect(s.state.players[1]!.hand.map((card) => card.cardId)).toContain("BT14-070");
  });

  async function crossToThreeWithOuryukenEndOfTurn(withFenriloogamon: boolean) {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            ...(withFenriloogamon ? [{ card: "BT14-081", as: "fenriloogamon" }] : []),
            { card: "BT9-111", as: "ouryuken", under: ["BT10-016", "BT10-068"] },
          ],
          hand: [{ card: "BT14-069", as: "gazimon" }],
          deck: [...DECK],
        },
        1: { deck: [...DECK], security: 3 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 0;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gazimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("ouryuken").stack.length === 0 && s.state.memory === -1, 2000);
    await drainMicrotasks();
    return { s, turn };
  }

  it("continues your turn when an [End of Your Turn] effect brings the memory back to 1 or 2 on the opponent's side (Q2451)", async () => {
    const { s, turn } = await crossToThreeWithOuryukenEndOfTurn(true);
    expect(s.state.memory).toBe(-1);
    expect(s.state.players[0]!.deck.slice(-2).map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT10-016", "BT10-068"]),
    );
    expect(s.state.phase).toBe(Phase.Main);
    expect(s.engine.mainPhase.isOpen).toBe(true);
    expect(turnEndedFor(s, 0)).toHaveLength(0);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    expect(turnEndedFor(s, 0)).toHaveLength(1);

    const control = await crossToThreeWithOuryukenEndOfTurn(false);
    await control.turn;
    expect(turnEndedFor(control.s, 0)).toHaveLength(1);
  });

  async function digivolveIntoPileVolcamon(startingMemory: number) {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-081", as: "fenriloogamon" },
            { card: "BT10-010", as: "base" },
          ],
          hand: [{ card: "BT10-014", as: "pileVolcamon" }],
          deck: [...DECK],
        },
        1: { deck: [...DECK], security: ["BT1-009", "BT1-009"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = startingMemory;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("pileVolcamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT10-014");
    return { s, turn };
  }

  it("lets <Blitz> attack on its own 1-or-more memory condition, not the raised turn end condition (Q2452)", async () => {
    const atThree = await digivolveIntoPileVolcamon(0);
    await settle(() => atThree.s.state.pendingDecision?.kind === "optional");
    const blitz = atThree.s.state.pendingDecision!;
    expect(atThree.s.state.memory).toBe(-3);
    expect(JSON.parse(blitz.payloadJson)).toMatchObject({ promptKey: "activateBlitz" });
    expect(
      atThree.s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: blitz.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => atThree.s.engine.hasAcceptedBlitzAttack(atThree.s.perm("base").permanentId));
    expect(
      atThree.s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: atThree.s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await atThree.turn;
    expect(atThree.s.state.players[1]!.security).toHaveLength(1);

    const atOne = await digivolveIntoPileVolcamon(2);
    await drainMicrotasks();
    expect(atOne.s.state.memory).toBe(-1);
    expect(atOne.s.state.phase).toBe(Phase.Main);
    expect(
      atOne.s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: atOne.s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => atOne.s.state.players[1]!.security.length === 1 && !atOne.s.engine.combat.isAttacking);
    advance(atOne.s.engine).endMainPhaseIfOpen(0);
    await atOne.turn;
  });

  it("plays either none or as many as possible with Eiji in the stack, never just 2 (Q2453)", async () => {
    const setup = (options: SetupEngineOptions) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT14-078", as: "base", under: ["BT14-087"] }],
            hand: [{ card: "BT14-081", as: "fenriloogamon" }],
            trash: ["BT14-074", "BT14-071", "BT14-072", "BT14-071"],
          },
        },
        options,
      );
      s.state.memory = 10;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("fenriloogamon").instanceId,
        }),
      ).toEqual({ ok: true });
      return s;
    };

    const s = setup({ autoAcceptOptional: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const selection = s.state.pendingDecision!;
    const payload = JSON.parse(selection.payloadJson) as { candidateInstanceIds: string[]; min: number; max: number };
    expect(payload).toMatchObject({ min: 3, max: 3 });
    expect(payload.candidateInstanceIds).toHaveLength(4);

    const justTwo = s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: selection.decisionId,
      response: { kind: "selectCards", instanceIds: payload.candidateInstanceIds.slice(0, 2) },
    });
    expect(justTwo.ok).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: selection.decisionId,
        response: { kind: "selectCards", instanceIds: payload.candidateInstanceIds.slice(0, 3) },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 4);
    expect(s.state.players[0]!.trash).toHaveLength(1);

    const declined = setup({ autoDeclineOptional: true, autoSelectCards: true });
    await settle(() => declined.perm("base").topCard?.cardId === "BT14-081");
    await drainMicrotasks();
    expect(declined.state.players[0]!.battleArea).toHaveLength(1);
    expect(declined.state.players[0]!.trash).toHaveLength(4);
  });

  it("moves the memory to 3 on the opponent's side and ends the turn when you pass (Q2454)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-081", as: "fenriloogamon" }], deck: [...DECK] },
        1: { deck: [...DECK], security: 3 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 2;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.memory.turnEndMinMemoryFor(0)).toBe(3);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
    expect(turnEndedFor(s, 0)).toHaveLength(1);
    expect(s.engine.memory.memoryFor(1)).toBe(3);
  });
});
