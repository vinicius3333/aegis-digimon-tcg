import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard, runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT2-011.js";
import "./BT2-012.js";
import "./BT2-013.js";
import "./BT2-014.js";
import "./BT2-015.js";
import "./BT2-016.js";
import "./BT2-017.js";
import "./BT2-018.js";
import "./BT2-019.js";
import "./BT2-020.js";

const CARD_IDS = [
  "BT2-011",
  "BT2-012",
  "BT2-013",
  "BT2-014",
  "BT2-015",
  "BT2-016",
  "BT2-017",
  "BT2-018",
  "BT2-019",
  "BT2-020",
] as const;

describe("BT2-011 through BT2-020 IR coverage", () => {
  it("registers every range card through complete compiled IR", () => {
    for (const cardId of CARD_IDS) {
      expect(hasRegisteredCompiledCard(cardId), `${cardId} direct compiled registration`).toBe(true);
      expect(runtimeCompiledCard(cardId), `${cardId} runtime IR`).toMatchObject({ coverage: "full", residual: [] });
    }
  });

  it("retains the printed no-effect, attack, inherited, keyword, and deletion contracts", () => {
    expect(runtimeCompiledCard("BT2-011")?.effects).toEqual([]);
    expect(runtimeCompiledCard("BT2-014")?.effects).toEqual([]);
    expect(runtimeCompiledCard("BT2-016")?.effects).toEqual([]);

    expect(runtimeCompiledCard("BT2-012")?.effects[0]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [{ kind: "ModifyDP", amount: 4000, condition: { kind: "attackTargetsPlayer" } }],
    });
    expect(runtimeCompiledCard("BT2-013")?.effects[0]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      actions: [{ kind: "Delete", target: { count: 1, filter: { dp: { op: "lte", value: 2000 } } } }],
    });
    expect(runtimeCompiledCard("BT2-015")?.effects[0]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [{ kind: "Draw", amount: 1, condition: { kind: "attackTargetsPlayer" } }],
    });
    expect(runtimeCompiledCard("BT2-017")?.effects[1]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [{ kind: "Aura", while: { kind: "zoneCount", zone: "trash", value: 5, op: "gte" } }],
    });
    expect(runtimeCompiledCard("BT2-018")?.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keywords: [{ keyword: "SecurityAttack", amount: 1 }] }),
        expect.objectContaining({
          trigger: "OnPlay",
          actions: [{ kind: "Delete", target: { count: "all", filter: { dp: { op: "lte", value: 4000 } } } }],
        }),
      ]),
    );
    expect(runtimeCompiledCard("BT2-019")?.effects[0]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [{ kind: "GainMemory", amount: 1, condition: { kind: "attackTargetsPlayer" } }],
    });
    expect(runtimeCompiledCard("BT2-020")?.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "WhenDigivolving",
          actions: [{ kind: "Delete", target: { count: 1, filter: { dp: { op: "lte", value: 6000 } } } }],
        }),
        expect.objectContaining({
          trigger: "WhenAttacking",
          actions: [
            {
              kind: "SecurityManipulation",
              op: "trashTop",
              controller: "opponent",
              amount: 1,
              scaling: { per: 10, unit: "trash", filter: { zone: "trash", controller: "opponent" } },
            },
          ],
        }),
      ]),
    );
  });
});
