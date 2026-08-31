import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-085.js";

describe("BT18-085 Zanbamon", () => {
  it("scales digivolution reduction and Your Turn security attack/DP", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [{ kind: "Replacement", event: "wouldDigivolve" }],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "YourTurn",
      actions: [
        { kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: 1 } },
        { kind: "ModifyDP", amount: 2000 },
      ],
    });
  });

  it("scales both Security Attack and DP from distinct colors in the opponent's trash", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT18-085", as: "zanbamon" }] },
      1: { trash: ["BT1-001", "BT1-003", "BT1-005", "BT1-007"] },
    });
    const baseDP = s.perm("zanbamon").baseDP;

    await s.engine.recomputeContinuousEffects();

    expect(s.perm("zanbamon").currentDP).toBe(baseDP + 4000);
    expect(observe(s.engine).keywordAmount(s.perm("zanbamon"), "SecurityAttack")).toBe(2);
  });

  it("naturally reduces a Zanbamon evolution by every opponent-trash color", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-079", as: "sandiramon" }],
        hand: [{ card: "BT18-085", as: "zanbamon" }],
      },
      1: { trash: ["BT1-001", "BT1-003", "BT1-005", "BT1-007"] },
    });
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("sandiramon").permanentId,
      instanceId: s.inst("zanbamon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("sandiramon").topCard?.cardId === "BT18-085");

    expect(s.state.memory).toBe(4);
    expect(s.perm("sandiramon").currentDP).toBe(16000);
    expect(observe(s.engine).keywordAmount(s.perm("sandiramon"), "SecurityAttack")).toBe(2);
  });
});
