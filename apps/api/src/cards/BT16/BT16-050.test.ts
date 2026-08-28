import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-050.js";
import "../index.js";

describe("BT16-050", () => {
  it("matches the catalog identity and black level-2 evolution route", () => {
    expect(getCardDefinition("BT16-050")).toMatchObject({
      cardId: "BT16-050",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      types: ["Cyborg", "D-Brigade", "DigiPolice"],
      evoCosts: [{ color: "Black", level: 2, memoryCost: 0 }],
    });
  });

  it("gives your other D-Brigade or DigiPolice Digimon 1000 DP", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "ModifyDP",
          amount: 1000,
          duration: "permanent",
          target: { filter: { controller: "mine", excludeSelf: true }, count: "all" },
        },
      ],
    });
  });

  it("retains the same DP effect as inherited", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }],
    });
  });

  it("boosts either trait while excluding itself and the opponent live", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT16-050", as: "command", dp: 1000 },
          { card: "BT3-059", as: "eligible", dp: 3000 },
          { card: "BT16-057", as: "police", dp: 5000 },
          { card: "BT1-009", as: "other", dp: 3000 },
        ],
      },
      1: {
        battleArea: [{ card: "BT3-059", as: "opponent", dp: 3000 }],
      },
    });
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("command").currentDP).toBe(1000);
    expect(s.perm("eligible").currentDP).toBe(4000);
    expect(s.perm("police").currentDP).toBe(6000);
    expect(s.perm("other").currentDP).toBe(3000);
    expect(s.perm("opponent").currentDP).toBe(3000);
  });

  it("applies the inherited aura from a legal black level-3-to-level-4 stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT16-054", as: "host", dp: 4000, under: ["BT16-050"] },
          { card: "BT16-057", as: "police", dp: 5000 },
          { card: "BT1-009", as: "other", dp: 3000 },
        ],
      },
      1: { battleArea: [{ card: "BT3-059", as: "opponent", dp: 3000 }] },
    });
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("host").currentDP).toBe(4000);
    expect(s.perm("police").currentDP).toBe(6000);
    expect(s.perm("other").currentDP).toBe(3000);
    expect(s.perm("opponent").currentDP).toBe(3000);
  });
});
