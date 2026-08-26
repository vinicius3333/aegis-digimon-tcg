import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT9-061.js";

describe("BT9-061 Monochromon", () => {
  it("matches catalog and Blocker plus attack-memory-loss IR", () => {
    expect(getCardDefinition("BT9-061")).toMatchObject({
      cardId: "BT9-061", nameEn: "Monochromon", colors: ["Black", "Red"], kinds: ["Digimon"], level: 4,
      playCost: 5, dp: 6000,
      evoCosts: [{ color: "Black", level: 3, memoryCost: 2 }, { color: "Red", level: 3, memoryCost: 2 }],
      forms: ["Champion"], attributes: ["Data"], types: ["Ankylosaur"],
    });
    expect(compiled).toEqual({
      effects: [{ trigger: "Static", actions: [], keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] }, { trigger: "WhenAttacking", actions: [{ kind: "GainMemory", amount: -3 }] }],
      coverage: "full", residual: [],
    });
  });

  it("has Blocker and loses 3 memory when attacking", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT9-061", as: "monochromon" }] },
      1: { security: ["BT1-001"] },
    });
    s.state.memory = 4;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("monochromon"), "Blocker")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("monochromon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
  });
});
