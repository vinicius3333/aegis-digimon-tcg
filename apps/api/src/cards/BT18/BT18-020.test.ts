import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-020.js";

describe("BT18-020 Syakomon", () => {
  it("keeps Aquatic as a rule trait through the engine", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Rule",
      actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Aquatic"], target: { filter: { isSelfRef: true } } }],
    });
    const s = setupEngine({ 0: { battleArea: [{ card: "BT18-020", as: "syakomon" }] } });
    await s.ready();
    expect(observe(s.engine).hasEffectiveTrait(s.perm("syakomon"), "Aquatic")).toBe(true);
  });

  it("digivolves from a blue level 2 for cost 0 and preserves the source", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-003", as: "upamon" },
        hand: [{ card: "BT18-020", as: "syakomon" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("upamon").permanentId,
        instanceId: s.inst("syakomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("upamon").topCard.cardId === "BT18-020");

    expect(s.state.memory).toBe(3);
    expect(s.perm("upamon").stack.at(-1)?.cardId).toBe("BT1-003");
    expect(observe(s.engine).hasEffectiveTrait(s.perm("upamon"), "Aquatic")).toBe(true);
  });
});
