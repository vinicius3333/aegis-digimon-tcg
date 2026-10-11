import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { trainingObservation } from "../training/observation.js";
import type { TrainingWindow } from "../training/policy.js";
import { searchMcts } from "./mcts.js";
import { determinize } from "./determinize.js";

describe("information-set MCTS", () => {
  it("uses exploration and backpropagation to prefer the winning branch", async () => {
    const setup = setupEngine({});
    await setup.ready();
    const root: TrainingWindow = {
      observation: trainingObservation(setup.state, 0),
      kind: "main",
      selected: [],
      actions: [
        { intent: { type: "endPhase" }, label: "Lose" },
        { intent: { type: "hatchEgg" }, label: "Win" },
      ],
    };
    const result = await searchMcts({
      root,
      seat: 0,
      simulations: 128,
      rolloutChoose: () => 0,
      simulate: async (choose) => ({ reward: choose(root) === 1 ? 1 : 0, valid: true }),
    });
    expect(result.action).toBe(1);
    expect(result.report.completed).toBe(128);
    expect(result.report.invalid).toBe(0);
    expect(result.report.root.find((edge) => edge.action === 0)!.visits).toBeGreaterThan(0);
    expect(result.report.root[0]!.visits).toBeGreaterThan(100);
  });

  it("does not count rejected rollouts as completed search", async () => {
    const setup = setupEngine({});
    await setup.ready();
    const root: TrainingWindow = {
      observation: trainingObservation(setup.state, 0),
      kind: "main",
      selected: [],
      actions: [{ intent: { type: "endPhase" }, label: "Pass" }],
    };
    await expect(
      searchMcts({
        root,
        seat: 0,
        simulations: 2,
        rolloutChoose: () => 0,
        simulate: async (choose) => {
          choose(root);
          return { reward: 1, valid: false };
        },
      }),
    ).rejects.toThrow("No valid MCTS rollouts");
  });

  it("samples independent of true hidden locations while preserving the observer's hand and face-up security", async () => {
    const make = async () => {
      const setup = setupEngine({
        0: { hand: ["BT1-010"], deck: ["BT1-011", "BT1-012"], security: ["BT1-013"] },
        1: { hand: ["BT1-027"], deck: ["BT1-028", "BT1-029"], security: ["BT1-030"] },
      });
      await setup.ready();
      return setup;
    };
    const first = await make();
    const second = await make();
    for (const seat of [0, 1] as const) {
      const originals = [
        ...first.state.players[seat]!.hand,
        ...first.state.players[seat]!.deck,
        ...first.state.players[seat]!.security,
      ];
      for (const entry of [
        ...second.state.players[seat]!.hand,
        ...second.state.players[seat]!.deck,
        ...second.state.players[seat]!.security,
      ])
        entry.instanceId = originals.find((original) => original.cardId === entry.cardId)!.instanceId;
    }
    first.state.players[0]!.security[0]!.faceUp = true;
    second.state.players[0]!.security[0]!.faceUp = true;
    const hidden = second.state.players[1]!;
    const card = hidden.hand.shift()!;
    hidden.hand.push(hidden.deck.shift()!);
    hidden.deck.push(card);
    const ownHand = first.state.players[0]!.hand[0]!.instanceId;
    await determinize(first.engine, 0, 917);
    await determinize(second.engine, 0, 917);
    const signature = (setup: typeof first) =>
      Array.from(setup.state.players, (player) => ({
        hand: Array.from(player.hand, (entry) => entry.instanceId),
        deck: Array.from(player.deck, (entry) => entry.instanceId),
        security: Array.from(player.security, (entry) => entry.instanceId),
      }));
    expect(signature(first)).toEqual(signature(second));
    expect(first.state.players[0]!.hand[0]!.instanceId).toBe(ownHand);
    expect(first.state.players[0]!.security[0]!.faceUp).toBe(true);
    expect(first.state.players[1]!.hand).toHaveLength(1);
    expect(first.state.players[1]!.deck).toHaveLength(2);
    expect(first.state.players[1]!.security).toHaveLength(1);
  });
});
