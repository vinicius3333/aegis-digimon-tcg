import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT5-019.js";

describe("BT5-019 Shoutmon DX", () => {
  it("places a red Digimon under itself and deletes once per named source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-019", under: ["BT5-014"], as: "shoutmon" }],
          hand: [{ card: "BT5-014", as: "placed" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", dp: 5000 },
            { card: "BT1-011", dp: 5000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("shoutmon"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("shoutmon").stack.some((card) => card.instanceId === s.inst("placed").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(observe(s.engine).hasKeyword(s.perm("shoutmon"), "Blitz")).toBe(true);
  });

  it("does not delete a 5001-DP Digimon and counts only matching stack names", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT5-019", under: ["BT5-007"], as: "shoutmon" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "safe", dp: 5001 },
            { card: "BT1-011", as: "boundary", dp: 5000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("shoutmon"));
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("safe").permanentId);
  });

  it("deletes one 5000-DP Digimon for each matching source in the stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-019", under: ["BT5-014", "BT5-017"], as: "shoutmon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "first", dp: 5000 },
            { card: "BT1-011", as: "second", dp: 5000 },
            { card: "BT1-012", as: "third", dp: 5000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("shoutmon"));
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("third").permanentId);
  });

  it("continues the scaled deletion when the optional placement is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-019", under: ["BT5-014", "BT5-017"], as: "shoutmon" }],
          hand: [{ card: "BT10-112", as: "redLevel7" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "first", dp: 5000 },
            { card: "BT1-011", as: "second", dp: 5000 },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const beforeStack = s.perm("shoutmon").stack.map(({ instanceId }) => instanceId);
    const beforeHand = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("shoutmon"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("shoutmon").stack.map(({ instanceId }) => instanceId)).toEqual(beforeStack);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(beforeHand);
  });

  it.each(["BT1-010", "BT10-112"])("places a red level %s card exactly on top", async (placedCard) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-019", under: ["BT5-014"], as: "shoutmon" }],
          hand: [
            { card: placedCard, as: "placed" },
            { card: "AD1-010", as: "blue" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("shoutmon"));

    expect(s.perm("shoutmon").stack.map(({ cardId }) => cardId)).toEqual(["BT5-014", placedCard]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["AD1-010"]);
  });
});
