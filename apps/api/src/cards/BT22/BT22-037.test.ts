import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import "../index.js";
import { setupEngine, settle, assertNoLoudGap } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import module from "./BT22-037.js";

describe("BT22-037 Chirinmon", () => {
  it("executes its effect-driven security-trash trigger and gives exactly -8000 DP", async () => {
    const s = setupEngine(
      {
        0: { security: ["BT22-037"] },
        1: { battleArea: [{ card: "BT1-028", as: "victim", dp: 10000 }] },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    await settle(() => s.perm("victim").currentDP === 2000, 120);

    expect(s.perm("victim").currentDP).toBe(2000);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT22-037")).toBe(true);
    assertNoLoudGap(s);
  });

  it("keeps its When Digivolving and inherited clauses executable in the direct module", () => {
    expect(module.effectsForTiming(EffectTiming.WhenDigivolving, {} as never)).toHaveLength(1);
    expect(module.effectsForTiming(EffectTiming.OnUseAttack, {} as never)).toHaveLength(1);
    expect(module.effectsForTiming(EffectTiming.OnDiscardSecurity, {} as never)).toHaveLength(1);
  });

  it("trashes top security and pays the destination evolution cost reduced by 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-034", as: "base" }],
          hand: [
            { card: "BT22-037", as: "chirinmon" },
            { card: "BT22-041", as: "target" },
          ],
          security: ["BT1-028"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("chirinmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT22-041");

    expect(s.state.memory).toBe(5); // 3 for Chirinmon, then 4 - 2 for BT22-041.
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT22-034", "BT22-037"]);
    expect(s.perm("base").topCard.cardId).toBe("BT22-041");
  });

  it("does not trash security when the optional hand selection is unavailable", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-034", as: "base" }],
          hand: [{ card: "BT22-037", as: "chirinmon" }, "BT22-043"],
          security: ["BT1-028"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("chirinmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT22-037");

    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});
