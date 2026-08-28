import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-027.js";

describe("BT12-027 Mermaimon", () => {
  it("on play places another blue Digimon as its bottom source, rule-trashes that Digimon's sources, and gains 2 memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-025", as: "cost", under: ["BT9-109", "BT12-019"] }],
          hand: [{ card: "BT12-027", as: "mermaimon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const movedTop = s.perm("cost").topCard.instanceId;
    const discardedSources = s.perm("cost").stack.map(({ instanceId }) => instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mermaimon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    const mermaimon = s.state.players[0]!.battleArea[0]!;
    expect(mermaimon.topCard.cardId).toBe("BT12-027");
    expect(mermaimon.stack[0]!.instanceId).toBe(movedTop);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining(discardedSources),
    );
    expect(s.state.memory).toBe(5);
  });

  it("performs the same placement and memory gain when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-027", as: "mermaimon" },
            { card: "BT12-025", as: "cost", under: ["BT12-019"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const movedTop = s.perm("cost").topCard.instanceId;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("mermaimon"));
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.perm("mermaimon").stack[0]!.instanceId).toBe(movedTop);
    expect(s.state.memory).toBe(2);
  });

  it("can decline and cannot use a non-blue Digimon as the placement cost", async () => {
    const declined = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-027", as: "mermaimon" },
            { card: "BT12-025", as: "cost" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await advance(declined.engine).fire(EffectTiming.WhenDigivolving, declined.perm("mermaimon"));
    expect(declined.state.players[0]!.battleArea).toHaveLength(2);
    expect(declined.state.memory).toBe(0);

    const wrongColor = setupEngine({
      0: {
        battleArea: [
          { card: "BT12-027", as: "mermaimon" },
          { card: "BT12-048", as: "cost" },
        ],
      },
    });
    await advance(wrongColor.engine).fire(EffectTiming.WhenDigivolving, wrongColor.perm("mermaimon"));
    expect(wrongColor.state.players[0]!.battleArea).toHaveLength(2);
    expect(wrongColor.state.memory).toBe(0);
  });
});
