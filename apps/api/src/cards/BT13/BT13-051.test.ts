import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-051.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";

describe("BT13-051 Mikemon", () => {
  it("grants temporary Piercing and preserves the inherited trait aura", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "GainKeyword",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          keyword: { keyword: "Piercing" },
          duration: "forTheTurn",
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          effect: { kind: "modifyDP", amount: 2000 },
          while: { kind: "anyOf" },
        },
      ],
    });
  });

  it("on play grants one own Digimon Piercing but not an opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-051", as: "mike" }, { card: "BT13-047", as: "ally" }] },
        1: { battleArea: [{ card: "BT13-047", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("mike"));
    await settle(() => [s.perm("mike"), s.perm("ally")].some((p) => observe(s.engine).hasPierce(p)));
    expect([s.perm("mike"), s.perm("ally")].filter((p) => observe(s.engine).hasPierce(p))).toHaveLength(1);
    expect(observe(s.engine).hasPierce(s.perm("opponent"))).toBe(false);
  });

  it("gives an inherited Beast or Royal Knight host +2000 only on its controller's turn", async () => {
    for (const [host, baseDP] of [["BT13-047", 1000], ["BT13-046", 13000]] as const) {
      const s = setupEngine({ 0: { battleArea: [{ card: host, as: "host", under: ["BT13-051"] }] } });
      await s.ready();
      expect(s.perm("host").currentDP).toBe(baseDP + 2000);
      s.state.turnSeat = 1;
      await s.engine.recomputeContinuousEffects();
      expect(s.perm("host").currentDP).toBe(baseDP);
    }
  });

  it("does not boost a Sea Animal or unrelated inherited host", async () => {
    for (const [host, baseDP] of [["BT1-033", 4000], ["BT13-049", 1000]] as const) {
      const s = setupEngine({ 0: { battleArea: [{ card: host, as: "host", under: ["BT13-051"] }] } });
      await s.ready();
      expect(s.perm("host").currentDP).toBe(baseDP);
    }
  });

  it("digivolves from a green level 3 for exactly 2 memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-049", as: "base" }], hand: [{ card: "BT13-051", as: "mike" }] },
    });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("mike").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT13-051");
    expect(s.state.memory).toBe(1);
  });
});
