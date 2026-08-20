import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { compiled } from "./EX9-048.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-048", () => {
  it("draws two by trashing a Negamon-text card from hand", () => {
    const action = compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0];
    expect(action).toMatchObject({ kind: "Draw", amount: 2, cost: { kind: "trash" } });
    expect(action?.cost?.target?.filter).toMatchObject({ zone: "hand", nameOrTrait: [{ tokens: ["Negamon"], match: "text" }] });
  });
  it("inherits +1000 DP", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }] }));
  it("trashes the Negamon-text payment and draws two cards on play", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "EX9-048", as: "source" }, "EX9-055"], deck: ["BT1-009", "BT1-010"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    await s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId });
    await settle(() => player.hand.filter((card) => card.cardId === "BT1-009" || card.cardId === "BT1-010").length === 2);
    expect(player.trash.some((card) => card.cardId === "EX9-055")).toBe(true);
    expect(player.hand.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(player.hand.some((card) => card.cardId === "BT1-010")).toBe(true);
  });
  it("does not draw when the hand has no Negamon-text card to trash", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "EX9-048", as: "source" }, "BT1-009"], deck: ["BT1-010", "BT1-011"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    await s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId });
    await settle(() => player.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-048"));
    expect(player.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(player.deck.map((card) => card.cardId)).toEqual(["BT1-010", "BT1-011"]);
  });
});
