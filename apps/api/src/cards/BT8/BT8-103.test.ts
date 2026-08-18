import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT8-103.js";

describe("BT8-103 Lightning Blade", () => {
  it("waives its color requirement and gives +2000 DP and Piercing to the same Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT8-012", as: "chosen" },
          { card: "BT8-023", as: "other" },
        ],
        hand: [{ card: "BT8-103", as: "option" }],
      },
    }, { autoSelectCards: true });
    const chosenDp = s.perm("chosen").currentDP;
    const otherDp = s.perm("other").currentDP;
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("option").instanceId,
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.trash.some((card) => card.cardId === "BT8-103") &&
      observe(s.engine).hasPierce(s.perm("chosen"))
    );

    expect(s.perm("chosen").currentDP).toBe(chosenDp + 2_000);
    expect(observe(s.engine).hasPierce(s.perm("chosen"))).toBe(true);
    expect([...s.perm("chosen").keywords]).toContain("Piercing");
    expect(s.perm("other").currentDP).toBe(otherDp);
    expect(observe(s.engine).hasPierce(s.perm("other"))).toBe(false);
    expect([...s.perm("other").keywords]).not.toContain("Piercing");
    expect(s.decisions.filter(({ req }) => req.kind === "chooseTargets")).toHaveLength(1);
  });
});
