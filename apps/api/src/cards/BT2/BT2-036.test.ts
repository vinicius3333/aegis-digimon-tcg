import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-036.js";

describe("BT2-036 Gatomon", () => {
  it("gives -4000 DP when its owner has a purple Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT2-036", as: "source" }],
          battleArea: [{ card: "BT2-067", as: "purple", dp: 3000 }],
        },
        1: { battleArea: [{ card: "BT1-074", as: "target", dp: 7000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 3000);
    expect(s.perm("target").currentDP).toBe(3000);
  });

  it("does not give -4000 DP without one of its controller's purple Digimon in play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT2-036", as: "source" }] },
        1: {
          battleArea: [
            { card: "BT1-074", as: "target", dp: 7000 },
            { card: "BT2-067", as: "opposingPurple" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT2-036"));

    expect(s.perm("target").currentDP).toBe(7000);
  });

  it("deletes a 4000 DP target through the zero-DP rule check", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT2-036", as: "source" }],
          battleArea: [{ card: "BT2-067", as: "purple" }],
        },
        1: { battleArea: [{ card: "BT2-034", as: "target", dp: 4000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT2-034")).toBe(true);
  });

  it("gets +3000 DP when one of its owner's other Digimon is deleted", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-036", as: "gatomon" },
          { card: "BT2-067", as: "other" },
        ],
      },
    });
    const baseDP = s.perm("gatomon").currentDP;
    await advance(s.engine).verb.deletePermanent([s.perm("other").permanentId], "byEffect");
    expect(s.perm("gatomon").currentDP).toBe(baseDP + 3000);
  });

  it("stacks +3000 DP for each other allied Digimon deleted", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-036", as: "gatomon" },
          { card: "BT2-067", as: "first" },
          { card: "BT2-068", as: "second" },
        ],
      },
    });
    const baseDP = s.perm("gatomon").currentDP;

    await advance(s.engine).verb.deletePermanent(
      [s.perm("first").permanentId, s.perm("second").permanentId],
      "byEffect",
    );

    expect(s.perm("gatomon").currentDP).toBe(baseDP + 6000);
  });

  it("does not gain DP from an opposing deletion or during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-036", as: "gatomon" },
          { card: "BT2-067", as: "ally" },
        ],
      },
      1: { battleArea: [{ card: "BT2-067", as: "opponent" }] },
    });
    const baseDP = s.perm("gatomon").currentDP;

    await advance(s.engine).verb.deletePermanent([s.perm("opponent").permanentId], "byEffect");
    expect(s.perm("gatomon").currentDP).toBe(baseDP);

    s.state.turnSeat = 1;
    await advance(s.engine).verb.deletePermanent([s.perm("ally").permanentId], "byEffect");
    expect(s.perm("gatomon").currentDP).toBe(baseDP);
  });
});
