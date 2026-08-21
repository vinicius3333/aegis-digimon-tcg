import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-015.js";
import "../index.js";

describe("EX4-015 Gaomon", () => {
  it("draws one card for each player on play", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toEqual([{ kind: "Draw", amount: 1, controller: "mine" }, { kind: "Draw", amount: 1, controller: "opponent" }]);
  });
  it("inherits memory gain when an effect adds a card to the opponent's hand", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenEffectAddsToOpponentHand", actions: [{ kind: "GainMemory", amount: 1 }] }] });
  });

  it("draws one card from both players' decks on play", async () => {
    const s = setupEngine({ 0: { deck: ["BT1-010", "BT1-011"], battleArea: [{ card: "EX4-015", as: "gaomon" }] }, 1: { deck: ["BT1-012", "BT1-013"] } });
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("gaomon"));

    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[1]!.deck).toHaveLength(1);
  });
});
