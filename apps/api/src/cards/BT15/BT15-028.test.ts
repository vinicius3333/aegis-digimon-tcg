import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT15-028.js";

describe("BT15-028", () => {
  it("trashes three opposing digivolution cards and may play a blue Tamer if none remain", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({ kind: "TrashDigivolution", amount: 3, fromTop: false });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      condition: { kind: "opponentHasNone" },
    });
  });

  it("trashes exactly three bottom sources and plays only the blue Tamer for free when none remain", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-028", as: "divermon" }],
          hand: [
            { card: "BT2-090", as: "purpleMatt" },
            { card: "BT1-086", as: "blueMatt" },
          ],
        },
        1: {
          battleArea: [
            {
              card: "BT1-009",
              as: "target",
              under: [
                { card: "BT15-001", as: "bottom" },
                { card: "BT15-002", as: "middle" },
                { card: "BT15-003", as: "top" },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    const removedIds = [s.inst("bottom").instanceId, s.inst("middle").instanceId, s.inst("top").instanceId];

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("divermon"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-086"));

    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(expect.arrayContaining(removedIds));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("purpleMatt").instanceId]);
    expect(s.state.memory).toBe(2);
  });

  it("removes only the bottom three of four sources and does not play a Tamer while one remains", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-028", as: "divermon" }],
          hand: [{ card: "BT1-086", as: "blueMatt" }],
        },
        1: {
          battleArea: [
            {
              card: "BT1-009",
              as: "target",
              under: [
                "BT15-001",
                "BT15-002",
                "BT15-003",
                { card: "BT15-004", as: "top" },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("divermon"));
    await settle(() => s.perm("target").stack.length === 1);

    expect(s.perm("target").stack.map((card) => card.instanceId)).toEqual([s.inst("top").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("blueMatt").instanceId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("may play a blue Tamer on an empty opposing board, as clarified by Q2513", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-028", as: "divermon" }],
          hand: [{ card: "BT1-086", as: "blueMatt" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("divermon"));
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-086")).toBe(true);
    expect(s.state.memory).toBe(1);
  });
});
