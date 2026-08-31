import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard, runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT3-011.js";
import "./BT3-012.js";
import "./BT3-013.js";
import "./BT3-014.js";
import "./BT3-015.js";
import "./BT3-016.js";
import "./BT3-017.js";
import "./BT3-018.js";
import "./BT3-019.js";

const EFFECT_CARD_IDS = [
  "BT3-011",
  "BT3-012",
  "BT3-013",
  "BT3-014",
  "BT3-015",
  "BT3-016",
  "BT3-017",
  "BT3-018",
  "BT3-019",
] as const;

describe("BT3-011 through BT3-020 IR coverage", () => {
  it("registers every effect-bearing range card through complete compiled IR", () => {
    for (const cardId of EFFECT_CARD_IDS) {
      expect(hasRegisteredCompiledCard(cardId), `${cardId} direct compiled registration`).toBe(true);
      expect(runtimeCompiledCard(cardId), `${cardId} runtime IR`).toMatchObject({ coverage: "full", residual: [] });
    }
  });

  it("retains the printed timing, targeting, keyword, and stack contracts", () => {
    expect(runtimeCompiledCard("BT3-011")?.effects[0]).toMatchObject({
      trigger: "Security",
      timing: "endOfBattle",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityBattleEnded",
          once: true,
          actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false }],
        },
      ],
    });
    expect(runtimeCompiledCard("BT3-012")?.effects[0]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      actions: [{ kind: "Delete", target: { count: 1, filter: { dp: { op: "lte", value: 2000 } } } }],
    });
    expect(runtimeCompiledCard("BT3-013")?.effects[0]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [{ kind: "Aura", while: { kind: "selfLevelIs", value: 7 } }],
    });
    expect(runtimeCompiledCard("BT3-014")?.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "WhenDigivolving",
          actions: [expect.objectContaining({ kind: "SetBaseDP", value: 1000, duration: "forTheTurn" })],
        }),
        expect.objectContaining({
          trigger: "YourTurn",
          actions: [
            expect.objectContaining({ grant: "color", kind: "GrantStatic", tokens: ["Yellow"], duration: "forTheTurn" }),
          ],
        }),
      ]),
    );
    expect(runtimeCompiledCard("BT3-015")?.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Static",
          keywords: expect.arrayContaining([expect.objectContaining({ keyword: "Piercing" })]),
        }),
        expect.objectContaining({
          trigger: "WhenDigivolving",
          actions: expect.arrayContaining([
            expect.objectContaining({
              kind: "Return",
              to: "hand",
              optional: true,
              target: expect.objectContaining({
                count: 1,
                filter: expect.objectContaining({ zone: "trash", levels: [7] }),
              }),
            }),
          ]),
        }),
      ]),
    );
    expect(runtimeCompiledCard("BT3-016")?.effects[0]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: expect.arrayContaining([expect.objectContaining({ keyword: "Piercing" })]),
    });
    expect(runtimeCompiledCard("BT3-017")?.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "WhenDigivolving",
          actions: expect.arrayContaining([expect.objectContaining({ kind: "Delete" })]),
        }),
        expect.objectContaining({
          trigger: "WhenAttacking",
          actions: expect.arrayContaining([expect.objectContaining({ kind: "Delete" })]),
        }),
      ]),
    );
    expect(runtimeCompiledCard("BT3-018")?.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Static",
          keywords: expect.arrayContaining([expect.objectContaining({ keyword: "Piercing" })]),
        }),
        expect.objectContaining({
          trigger: "WhenDigivolving",
          actions: expect.arrayContaining([expect.objectContaining({ kind: "DeDigivolve", amount: 2 })]),
        }),
      ]),
    );
    expect(runtimeCompiledCard("BT3-019")?.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Static",
          keywords: expect.arrayContaining([
            expect.objectContaining({ keyword: "SecurityAttack", amount: 1 }),
            expect.objectContaining({ keyword: "Reboot" }),
          ]),
        }),
        expect.objectContaining({
          trigger: "WhenDigivolving",
          actions: expect.arrayContaining([
            expect.objectContaining({
              kind: "PlaceUnder",
              position: "top",
              optional: true,
              target: expect.objectContaining({ from: ["hand"] }),
            }),
            expect.objectContaining({
              kind: "GainMemory",
              amount: 3,
              condition: expect.objectContaining({ kind: "ifThisEffectActed" }),
            }),
          ]),
        }),
      ]),
    );
  });
});
