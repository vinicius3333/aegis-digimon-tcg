import { describe, expect, it } from "vitest";
import { setupEngine as setup, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-096.js";
import "../index.js";

describe("BT21-096 The Champion Ultimate Fighter!", () => {
  it("turns a Marcus Damon into a 12000 DP Rush Digimon and starts its Digimon attack", async () => {
    const s = setup(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "color" },
            { card: "BT2-033", as: "yellow" },
            { card: "BT4-092", as: "marcus" },
          ],
          hand: [{ card: "BT21-096", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const targetId = s.perm("target").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.every((permanent) => permanent.permanentId !== targetId));

    expect(s.perm("marcus").currentDP).toBe(12000);
    expect(s.perm("marcus").isSuspended).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("marcus"), "Rush")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("marcus"), "digivolve")).toBe(true);
    expect(observe(s.engine).canAttackUnsuspended(s.perm("marcus"))).toBe(true);
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  it("targets the chosen Marcus permanent and carries the temporary Digimon grants", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.find((effect) => effect.trigger === "Main")?.actions).toMatchObject([
      { kind: "SelectBind", target: { bindAs: "chosenMarcus" } },
      { kind: "GrantStatic", grant: "kind", tokens: ["Digimon"], staticEffect: { value: 12000 } },
      { kind: "Restrict", restriction: "digivolve" },
      { kind: "GainKeyword", keyword: { keyword: "Rush" } },
      { kind: "GrantCanAttackUnsuspended" },
      { kind: "Attack", attackPlayer: false, optional: true },
    ]);
  });
});
