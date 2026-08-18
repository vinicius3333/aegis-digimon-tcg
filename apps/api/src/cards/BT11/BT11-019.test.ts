import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT11-019.js";

describe("BT11-019 Shoutmon X7", () => {
  it("has Rush, Material Save 4 and gains 1000 DP per 2 digivolution cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-019", as: "shoutmon", under: ["BT1-001", "BT1-009", "BT1-010", "BT1-011"] }],
      },
    });

    await advance(s.engine).recompute();

    expect(observe(s.engine).hasKeyword(s.perm("shoutmon"), "Rush")).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("shoutmon"), "MaterialSave")).toBe(4);
    expect(s.perm("shoutmon").currentDP).toBe(15000);
  });

  it("deletes an opponent's Digimon with DP no greater than its own", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT11-019", as: "shoutmon" }] },
        1: {
          battleArea: [
            { card: "BT1-028", as: "deletable", dp: 13000 },
            { card: "BT1-029", as: "tooLarge", dp: 14000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 20;
    const deletableInstanceId = s.perm("deletable").topCard.instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shoutmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some(({ instanceId }) => instanceId === deletableInstanceId));

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("tooLarge").permanentId,
    );
  });
});
