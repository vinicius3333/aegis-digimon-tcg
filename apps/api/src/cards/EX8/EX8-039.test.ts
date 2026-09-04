import { describe, expect, it } from "vitest";
import { PlayerState } from "@aegis/shared";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "./index.js";
import { compiled } from "./EX8-039.js";

describe("EX8-039", () => {
  it("reveals 3 for an Insectoid and an NSp card", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        { count: 1, to: "hand" },
        { count: 1, to: "hand" },
      ],
      rest: "deckBottom",
    }));
  it("inherits +2000 DP during its owner's turn", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent", target: { isSelf: true } }],
    }));
  it("reveals three cards, adds matching Insectoid and NSp cards, and bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX8-039", as: "tentomon" }],
          deck: [
            { card: "ST4-03", as: "insectoid" },
            { card: "EX7-015", as: "nsp" },
            { card: "AD1-001", as: "rest" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tentomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        player.hand.some((card) => card.instanceId === s.inst("insectoid").instanceId) &&
        player.hand.some((card) => card.instanceId === s.inst("nsp").instanceId),
    );
    expect(player.hand.some((card) => card.instanceId === s.inst("insectoid").instanceId)).toBe(true);
    expect(player.hand.some((card) => card.instanceId === s.inst("nsp").instanceId)).toBe(true);
    expect(player.deck.at(-1)?.cardId).toBe("AD1-001");
  });

  it("grants the inherited DP only during its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-001", as: "host", under: ["EX8-039"] }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(7000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(5000);
  });
});
