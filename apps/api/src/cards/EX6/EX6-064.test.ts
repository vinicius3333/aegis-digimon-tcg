import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-064.js";

describe("EX6-064 Shu-Chong Wong", () => {
  it("reveals three for Beast-family cards", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [{ count: 1, to: "hand" }],
      rest: "deckBottom",
    }));
  it("watches any own effect-suspended Digimon, then suspends this Tamer to reduce evolution by two", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenEffectSuspends",
      triggerFilter: { controller: "mine", kind: ["Digimon"] },
      actions: [{ kind: "Digivolve", from: ["hand"], reduceCost: 2, cost: { kind: "suspend" } }],
    });
    expect(compiled.effects?.find((entry) => entry.isSecurity)?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      payCost: false,
    });
  });
  it("publicly reveals three cards and adds one Beast-family card", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX6-064", as: "shu" }], deck: ["BT1-035", "BT1-009", "BT1-010"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("shu"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-035")).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });
});
