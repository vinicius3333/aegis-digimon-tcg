import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "./BT1-089.js";

describe("BT1-089 Mimi Tachikawa", () => {
  it("sets memory to 3 at the start of its owner's turn when memory is 2 or less", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-089", as: "mimi" }] } });
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("mimi"));
    expect(s.state.memory).toBe(3);
  });

  it("suspends to hatch when a level 5 green Digimon is in play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-089", as: "mimi" }, { card: "BT1-078" }], eggDeck: ["BT1-008"] } }, { autoAcceptOptional: true, autoChooseOption: true });
    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("mimi"));
    expect(s.state.players[0]!.breeding?.topCard.cardId).toBe("BT1-008");
    expect(s.perm("mimi").isSuspended).toBe(true);
  });

  it("suspends to move a level 3 Digimon from breeding to the battle area", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT1-089", as: "mimi" }, { card: "BT1-078" }], breeding: { card: "BT1-064", as: "raised" } } },
      { autoAcceptOptional: true, autoChooseOption: true, preferOptionIndex: 1 },
    );
    const raisedId = s.perm("raised").topCard!.instanceId;
    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("mimi"));
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === raisedId)).toBe(true);
    expect(s.perm("mimi").isSuspended).toBe(true);
  });

  it("plays itself from security without paying its cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT1-089", as: "securityMimi", faceUp: true }] } });

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityMimi"));

    expect(s.state.players[0]!.battleArea.some(
      (permanent) => permanent.topCard?.instanceId === s.inst("securityMimi").instanceId,
    )).toBe(true);
  });
});
