import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-073.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-073", () => {
  it("gains one memory when trashed from hand during your turn", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenTrashedFromHand", actions: [{ kind: "GainMemory", amount: 1 }] }] });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenTrashedFromHand" }] });
  });
  it("gains memory when an effect trashes a hand card", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT14-073", as: "source" }], hand: [{ card: "BT14-066", as: "platinum" }, { card: "BT14-058", as: "numemon" }] } }, { autoSelectCards: true, autoAcceptOptional: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("platinum").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT14-058") && s.state.memory === 3);
    expect(s.state.memory).toBe(3);
  });
});
