import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-028.js";
import "./index.js";

describe("BT17-028", () => {
  it("registers lowest-level return, security-to-hand, and deletion effects", () => {
    expect(compiled.effects).toHaveLength(4);
    expect(compiled.effects?.map((effect) => effect.trigger)).toEqual([
      "OnPlay",
      "WhenDigivolving",
      "YourTurn",
      "OnDeletion",
    ]);
    expect(compiled.effects?.[2]).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectAddsToHand",
          oncePerTurnKey: "BT17-028/hand-add",
          actions: [{ kind: "SecurityManipulation", op: "toHand", controller: "opponent", amount: 1, toTop: true }],
        },
        {
          kind: "SubTrigger",
          event: "whenEffectAddsToOpponentHand",
          oncePerTurnKey: "BT17-028/hand-add",
          actions: [{ kind: "SecurityManipulation", op: "toHand", controller: "opponent", amount: 1, toTop: true }],
        },
      ],
    });
  });

  it("returns only an opposing Digimon tied for the lowest level on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT17-028", as: "ancient" }] },
        1: {
          battleArea: [
            { card: "BT1-029", as: "lowest" },
            { card: "BT4-025", as: "higher" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 12;
    await s.ready();
    const lowestId = s.perm("lowest").topCard.instanceId;
    const higherId = s.perm("higher").topCard.instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ancient").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === lowestId));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === higherId)).toBe(true);
  });

  it("moves the opponent's top security to hand when its On Play effect returns a Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT17-028", as: "ancient" }] },
        1: {
          battleArea: [{ card: "BT1-029", as: "target" }],
          security: [{ card: "BT1-010", as: "topSecurity" }, "BT1-011"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 12;
    await s.ready();
    const targetId = s.perm("target").topCard!.instanceId;
    const topSecurityId = s.inst("topSecurity").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ancient").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[1]!.hand.some((card) => card.instanceId === targetId) &&
        s.state.players[1]!.hand.some((card) => card.instanceId === topSecurityId),
    );

    expect(s.state.players[1]!.hand.some((card) => card.instanceId === targetId)).toBe(true);
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === topSecurityId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("may play a Tamer on deletion without recovering anything first", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-028", as: "ancient" }],
          hand: [{ card: "BT17-081", as: "tamer" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const tamerId = s.inst("tamer").instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("ancient").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === tamerId));

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT17-028")).toBe(true);
  });
});
