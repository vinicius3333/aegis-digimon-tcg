import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-009.js";

describe("EX8-009", () => {
  it("reveals 3 for Growlmon/Gallantmon and X Antibody cards on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, add: [{ count: 1, to: "hand" }, { count: 1, to: "hand" }] });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3 });
  });
  it("inherits once-per-turn memory gain when an opposing Digimon is deleted during your turn", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "onDeletionOf", actions: [{ kind: "GainMemory", amount: 1 }] }] }));
  it("selects the printed name and X Antibody matches from the live reveal", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "EX8-009", as: "guilmon" }], deck: [{ card: "AD1-003", as: "growlmon" }, { card: "BT10-016", as: "xantibody" }, { card: "AD1-001", as: "decoy" }] } }, { autoSelectCards: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("guilmon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "AD1-003") && s.state.players[0]!.hand.some((card) => card.cardId === "BT10-016"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["AD1-003", "BT10-016"]));
    expect(s.state.players[0]!.deck.at(-1)?.cardId).toBe("AD1-001");
  });
});
