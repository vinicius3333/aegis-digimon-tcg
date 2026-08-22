import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-034.js";

describe("EX4-034 Lopmon", () => {
  it("reveals four and adds a green two-color card plus Shu-Chong Wong", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({ kind: "RevealAdd", revealCount: 4, add: [{ filter: { multicolor: true, colors: ["Green"] } }, { filter: { kind: ["Tamer"], nameOrTrait: [{ match: "name", tokens: ["Shu-Chong Wong"] }] } }], rest: "deckBottom", mandatory: true });
  });
  it("may digivolve itself from hand with a two-cost reduction when suspended", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({ isInherited: true, actions: [{ kind: "SubTrigger", event: "onSuspend", actions: [{ kind: "Digivolve", costDelta: -2, from: ["hand"], optional: true }] }] });
  });

  it("adds the eligible two-color green card and Shu-Chong Wong from the top four", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "EX4-034", as: "source" }],
        deck: ["EX4-013", "EX4-063", "BT1-001", "BT1-002"],
      },
    }, { autoSelectCards: true, autoAcceptOptional: true });
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "EX4-013") && s.state.players[0]!.hand.some((card) => card.cardId === "EX4-063"));

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["EX4-013", "EX4-063"]));
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });
});
