import { describe, it, expect } from "vitest";
import { Zone, type PlayerState, type Seat } from "@aegis/shared";
import { advance } from "./advance.js";
import { setupEngine, settle, type EngineSetup } from "./harness.js";
import "../../cards/index.js";

const player = (s: EngineSetup, seat: Seat): PlayerState => s.state.players[seat] as PlayerState;

/**
 * The Test Seam's own tests. Everything else in the suite trusts the Board Spec to lay the
 * board it says it lays, so the spec's semantics are asserted here once.
 */
describe("Board Spec", () => {
  it("lays both seats' zones from one literal", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-019", dp: 4000, as: "attacker" }],
        hand: ["BT2-034"],
        deck: ["ST1-03", "ST1-04"],
        trash: ["EX2-007"],
        security: 3,
      },
      1: { battleArea: [{ card: "BT1-019", as: "defender", suspended: true }] },
    });

    expect(player(s, 0).battleArea).toHaveLength(1);
    expect(player(s, 0).hand).toHaveLength(1);
    expect(player(s, 0).deck).toHaveLength(2);
    expect(player(s, 0).trash).toHaveLength(1);
    expect(player(s, 0).security).toHaveLength(3);
    expect(s.perm("attacker").currentDP).toBe(4000);
    expect(s.perm("defender").isSuspended).toBe(true);
  });

  it("defaults DP to the card definition's printed DP", () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-019", as: "p" }] } });
    expect(s.perm("p").baseDP).toBeGreaterThan(0);
  });

  it("lays permanents as established, so they are not summoning-sick", () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-019", as: "old" }] } });
    s.state.turnCount = 3;
    expect(s.perm("old").enterFieldTurnCount).not.toBe(s.state.turnCount);
  });

  it("marks a permanent as entered this turn when asked", () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-019", as: "fresh", enteredThisTurn: true }] } });
    expect(s.perm("fresh").enterFieldTurnCount).toBe(s.state.turnCount);
  });

  it("stacks digivolution cards bottom-first under the top card", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-019", as: "stacked", under: ["ST1-03", "ST1-04"] }] },
    });
    expect(s.perm("stacked").stack.map((c) => c.cardId)).toEqual(["ST1-03", "ST1-04"]);
  });

  it("resolves an alias freshly, not from a captured object", () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-019", as: "p" }] } });
    const before = s.perm("p");
    expect(s.perm("p")).toBe(before);
    player(s, 0).battleArea.splice(0, 1);
    expect(() => s.perm("p")).toThrow();
  });

  it("fails loudly on an undeclared alias", () => {
    const s = setupEngine({ 0: { hand: ["BT2-034"] } });
    expect(() => s.perm("nope")).toThrow();
  });

  it("adds cards mid-test through the Mutation Seam", () => {
    const s = setupEngine({ 0: { hand: [] } });
    const added = s.give(0, Zone.Hand, { card: "BT2-034", as: "late" });
    expect(player(s, 0).hand).toHaveLength(1);
    expect(s.inst("late").instanceId).toBe(added.instanceId);
  });

  it("still accepts the options-only call used before the Board Spec existed", async () => {
    const s = setupEngine({ autoAcceptOptional: true });
    await settle(() => false, 1);
    expect(s.state.players).toHaveLength(2);
  });
});

describe("automatic decision responders", () => {
  it("confirms orderTriggers by default", async () => {
    const s = setupEngine({
      0: { battleArea: ["BT1-085", "BT1-087"], hand: ["BT1-010"] },
    });
    s.state.memory = 1;

    await advance(s.engine).runTurn(0);

    expect(s.decisions.some(({ req }) => req.kind === "orderTriggers")).toBe(true);
  });

  it("can leave orderTriggers pending when explicitly disabled", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT1-085", "BT1-087"], hand: ["BT1-010"] },
      },
      { autoOrderTriggers: false },
    );
    s.state.memory = 1;

    const turn = s.engine.runOneTurn();
    await settle(() => s.decisions.some(({ req }) => req.kind === "orderTriggers"));

    const pending = s.state.pendingDecision;
    const request = s.decisions.find(({ req }) => req.kind === "orderTriggers")!.req;
    expect(pending?.kind).toBe("orderTriggers");
    expect(request.options?.triggerKeys).toHaveLength(2);

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending!.decisionId,
        response: {
          kind: "orderTriggers",
          order: request.options!.triggerKeys!.slice(0, 1),
        },
      }),
    ).toEqual({ ok: true });

    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    for (let i = 0; i < 500 && !mainPhase.isOpen; i += 1) await Promise.resolve();
    expect(mainPhase.isOpen).toBe(true);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
  });
});
