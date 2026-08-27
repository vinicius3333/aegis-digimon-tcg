import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT10-077.js";

describe("BT10-077 MadLeomon", () => {
  it("trashes a source so the opponent discards the number of cards an effect added", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT10-077", as: "madleomon", under: [{ card: "BT10-071", as: "cost" }] }] },
        1: { hand: ["BT1-010", { card: "BT1-001", as: "added1" }, { card: "BT1-002", as: "added2" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    await advance(s.engine).fireSubTrigger("whenEffectAddsToOpponentHand", {
      effectAddedToHandSeat: 1,
      addedToHand: { instanceIds: [s.inst("added1").instanceId, s.inst("added2").instanceId] },
    });
    await settle(() => s.state.players[1]!.hand.length === 1);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[1]!.hand).toHaveLength(1);
  });

  it("counts separate add-to-hand effects separately and resolves only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT10-077",
              as: "madleomon",
              under: [
                { card: "BT10-071", as: "cost1" },
                { card: "BT10-073", as: "cost2" },
              ],
            },
          ],
        },
        1: {
          hand: [
            { card: "BT1-010", as: "kept1" },
            { card: "BT1-011", as: "kept2" },
            { card: "BT1-012", as: "firstAdded" },
            { card: "BT1-015", as: "secondAdded1" },
            { card: "BT1-016", as: "secondAdded2" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    await advance(s.engine).fireSubTrigger("whenEffectAddsToOpponentHand", {
      effectAddedToHandSeat: 1,
      addedToHand: { instanceIds: [s.inst("firstAdded").instanceId] },
    });
    expect(s.state.players[1]!.hand).toHaveLength(4);
    expect(s.perm("madleomon").stack).toHaveLength(1);

    await advance(s.engine).fireSubTrigger("whenEffectAddsToOpponentHand", {
      effectAddedToHandSeat: 1,
      addedToHand: {
        instanceIds: [s.inst("secondAdded1").instanceId, s.inst("secondAdded2").instanceId],
      },
    });

    expect(s.state.players[1]!.hand).toHaveLength(4);
    expect(s.perm("madleomon").stack).toHaveLength(1);
  });

  it("gains owner memory when its inherited source is trashed on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT10-081", as: "host", under: [{ card: "BT10-077", as: "source" }] }] },
      },
      { autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).verb.trashDigivolutionCards(s.perm("host").permanentId, [s.inst("source").instanceId], 1);
    await settle(() => s.state.memory !== 0);

    expect(s.state.memory).toBe(-1);
  });

  it("uses Save to place itself under a friendly Tamer", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT10-077", as: "madleomon" }, { card: "BT10-093", as: "yuu" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const id = s.perm("madleomon").topCard.instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("madleomon").permanentId], "byEffect");
    await settle(() => s.perm("yuu").stack.some(({ instanceId }) => instanceId === id));
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === id)).toBe(false);
  });
});
