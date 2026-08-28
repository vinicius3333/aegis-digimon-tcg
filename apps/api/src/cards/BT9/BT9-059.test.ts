import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-059.js";

describe("BT9-059 Tapirmon", () => {
  it("matches catalog and Q1853 live-color inherited DP aura IR", () => {
    expect(getCardDefinition("BT9-059")).toMatchObject({
      cardId: "BT9-059", nameEn: "Tapirmon", colors: ["Black"], kinds: ["Digimon"], level: 3,
      playCost: 3, dp: 2000,
      evoCosts: [{ color: "Red", level: 2, memoryCost: 0 }, { color: "Black", level: 2, memoryCost: 0 }],
      forms: ["Rookie"], attributes: ["Vaccine"], types: ["Holy Beast"],
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], effects: [{ trigger: "AllTurns", isInherited: true, actions: [{ kind: "Aura", effect: { kind: "modifyDP", amount: 1000 }, while: { kind: "selfColorCount", op: "gte", value: 2 } }] }],
    });
  });

  it("grants +1000 DP only while its host has at least 2 colors", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT9-074", as: "twoColor", under: ["BT9-059"] },
          { card: "BT1-028", as: "oneColor", under: ["BT9-059"] },
        ],
      },
    });
    await s.ready();
    expect(s.perm("twoColor").currentDP).toBe(5000);
    expect(s.perm("oneColor").currentDP).toBe(3000);
  });
});
