import { Phase, getCardDefinition, type GameState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST6-04.js";

describe("ST6-04 Dracmon", () => {
  it("returns a purple Option costing 1 or 7 from trash", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST6-04", as: "dracmon" }],
          trash: [
            { card: "ST6-15", as: "costOne" },
            { card: "ST6-16", as: "costSeven" },
            { card: "BT6-107", as: "invalidCostThree" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("costSeven").instanceId);
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dracmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("costSeven").instanceId));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("costSeven").instanceId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("costOne").instanceId, s.inst("invalidCostThree").instanceId]),
    );
    const request = s.decisions.find(({ req }) => req.kind === "selectCards")?.req;
    expect(request).toBeDefined();
    expect(new Set(request!.options?.candidateInstanceIds ?? [])).toEqual(
      new Set([s.inst("costOne").instanceId, s.inst("costSeven").instanceId]),
    );
  });
});

describe("ST6-04 Dracmon — KB Q&A rulings", () => {
  it("can attack with less than 2 memory and the turn continues until the attack ends (Q671)", async () => {
    expect(getCardDefinition("ST6-04")?.effectText ?? "").not.toContain("[When Attacking]");
    const observed: { kind: string; memory: number; phase: string; turnSeat: number }[] = [];
    let state: GameState | undefined;
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST6-04", as: "dracmon" }],
          hand: ["ST6-02"],
          deck: ["ST6-02", "ST6-02"],
          security: ["ST6-02"],
        },
        1: { deck: ["ST6-02"], security: ["ST6-02", "ST6-02"] },
      },
      {
        onEvent: (event) => {
          if (state) {
            observed.push({ kind: event.kind, memory: state.memory, phase: state.phase, turnSeat: state.turnSeat });
          }
        },
      },
    );
    state = s.state;
    s.state.isFirstPlayersFirstTurn = false;
    s.state.memory = 1;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(1);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("dracmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(observed).toContainEqual({ kind: "securityChecked", memory: 1, phase: Phase.Main, turnSeat: 0 });
    expect(s.state.memory).toBe(1);
    expect(s.state.phase).toBe(Phase.Main);
    expect(observed.some(({ kind }) => kind === "turnEnded")).toBe(false);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });
});
