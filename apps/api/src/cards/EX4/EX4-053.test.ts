import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-053.js";

describe("EX4-053 Falcomon", () => {
  it("reveals three and adds purple Ravemon/Bird/Avian plus Keenan Crier", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom", add: [{ filter: { colors: ["Purple"], nameOrTrait: [{ match: "name", tokens: ["Ravemon"] }, { match: "trait", tokens: ["Bird", "Avian"] }] } }, { filter: { nameOrTrait: [{ match: "name", tokens: ["Keenan Crier"] }] } }] });
  });
  it("inherits hand trashing only when deleted outside battle", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({ kind: "Trash", chooser: "opponent", condition: { kind: "not", condition: { kind: "triggerRemovalCause", removalCause: "byBattle" } } });
  });

  it("adds a purple Ravemon and Keenan Crier from the top three", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX4-053", as: "source" }], deck: ["EX4-058", "EX4-064", "BT1-001"] },
    }, { autoSelectCards: true, autoAcceptOptional: true });
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "EX4-058") && s.state.players[0]!.hand.some((card) => card.cardId === "EX4-064"));

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["EX4-058", "EX4-064"]));
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });
});
