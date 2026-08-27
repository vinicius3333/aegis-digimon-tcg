import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-011.js";
import "../index.js";

describe("BT16-011", () => {
  it("returns a red Digimon from trash and conditionally deletes an opposing Digimon at or below this DP", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({ kind: "Return", to: "hand", optional: true });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({
      kind: "Delete",
      optional: true,
      condition: { kind: "selfDigivolutionStackHasTrait" },
      target: { filter: { dp: { op: "lte", relativeToSource: true } } },
    });
  });
  it("gains Rush when a red card returns from trash and trashes opponent security on deletion", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenCardReturnsFromTrashToHand",
          actions: [{ kind: "GainKeyword", keyword: { keyword: "Rush" } }],
        },
      ],
    });
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "OnDeletion",
      isInherited: true,
      actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent" }],
    });
  });

  it("optionally returns a red Digimon and deletes an opponent at or below its DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-011", as: "host", dp: 9000, under: ["BT13-014"] }],
          trash: [{ card: "BT1-009", as: "redCard" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "atLimit", dp: 9000 },
            { card: "BT1-009", as: "aboveLimit", dp: 10000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const atLimitId = s.perm("atLimit").permanentId;
    const aboveLimitId = s.perm("aboveLimit").permanentId;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("host"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("redCard").instanceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("redCard").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === atLimitId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === aboveLimitId)).toBe(true);
  });

  it("allows declining both optional On Play actions", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-011", as: "host", dp: 9000, under: ["BT13-014"] }],
          trash: [{ card: "BT1-009", as: "redCard" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }] },
      },
      { autoDeclineOptional: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("host"));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("redCard").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
