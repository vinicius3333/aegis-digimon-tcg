import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT18-016.js";

describe("BT18-016 Volcanomon", () => {
  it("has Blitz on digivolving and gains 2000 DP when attacking", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "WhenDigivolving", keywords: [{ keyword: "Blitz" }] });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        { kind: "ModifyDP", amount: 2000, duration: "untilOpponentTurnEnd", target: { filter: { isSelfRef: true } } },
      ],
    });
    const s = setupEngine({ 0: { battleArea: [{ card: "BT18-016", as: "volcanomon" }] } });
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("volcanomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("volcanomon").currentDP === s.perm("volcanomon").baseDP + 2000);
    expect(s.perm("volcanomon").currentDP).toBe(s.perm("volcanomon").baseDP + 2000);
  });

  it("digivolves from a red level 4 for 3 and preserves the source stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-014", as: "gigasmon" }],
        hand: [{ card: "BT18-016", as: "volcanomon" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gigasmon").permanentId,
        instanceId: s.inst("volcanomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("gigasmon").topCard.cardId === "BT18-016");
    expect(s.state.memory).toBe(2);
    expect(s.perm("gigasmon").stack.at(-1)?.cardId).toBe("BT18-014");
    expect(observe(s.engine).hasKeyword(s.perm("gigasmon"), "Blitz")).toBe(true);
  });
});
