import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-059.js";
import "../index.js";

describe("BT26-059 Plutomon", () => {
  it("encodes hand-size cost reduction, shared three-window trash/play, and all-hand-trash lowest-level deletion", () => {
    expect(compiled.digivolutionRequirement).toContainEqual({ level: 5, traits: ["TS"], cost: 4, isAlternate: true });
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      actions: [{ kind: "Replacement", mode: "reduceCost", amount: 6 }],
    });
    expect(compiled.effects?.slice(1, 4).map((e) => e.sharedUseKey)).toEqual([
      "bt26-059-trash-play-titan",
      "bt26-059-trash-play-titan",
      "bt26-059-trash-play-titan",
    ]);
    expect(compiled.effects?.[1]?.actions).toEqual([
      expect.objectContaining({
        kind: "CostGatedBlock",
        cost: expect.objectContaining({ kind: "trash" }),
        actions: [expect.objectContaining({ kind: "PlayWithoutCost", condition: expect.objectContaining({ kind: "isYourTurn" }) })],
      }),
    ]);
    expect(compiled.effects?.[4]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        { kind: "SubTrigger", event: "whenHandTrashed", actions: [{ kind: "Delete", target: { count: "all" } }] },
      ],
    });
  });

  it("publicly trashes a hand card, plays a Titan from trash, and deletes the opponent's lowest-level Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-059", as: "plutomon" }],
          hand: [{ card: "BT1-001", as: "cost" }],
          trash: [{ card: "BT26-021", as: "titan" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "lowest" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("plutomon"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("BT26-021");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT1-001");
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("reduces its play cost by 6 only when its hand is strictly smaller at announcement", async () => {
    const reduced = setupEngine({
      0: { hand: [{ card: "BT26-059", as: "plutomon" }] },
      1: { hand: ["BT1-001", "BT1-002"] },
    });
    reduced.state.memory = 7;
    await reduced.ready();
    expect(
      reduced.engine.applyIntent(0, { type: "playCard", instanceId: reduced.inst("plutomon").instanceId }),
    ).toEqual({ ok: true });
    await settle(() =>
      reduced.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT26-059"),
    );
    expect(reduced.state.memory).toBe(0);

    const tied = setupEngine({
      0: { hand: [{ card: "BT26-059", as: "plutomon" }] },
      1: { hand: ["BT1-001"] },
    });
    tied.state.memory = 7;
    await tied.ready();
    expect(tied.engine.applyIntent(0, { type: "playCard", instanceId: tied.inst("plutomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => tied.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT26-059"));
    expect(tied.state.memory).toBe(-6);
  });

  it("may pay the hand-trash activation outside its turn, triggering deletion without playing a Titan", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-059", as: "plutomon" }],
          hand: [{ card: "BT1-001", as: "cost" }],
          trash: [{ card: "BT26-021", as: "titan" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "lowest" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("plutomon"));

    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(expect.arrayContaining(["BT1-001", "BT26-021"]));
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).not.toContain("BT26-021");
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
