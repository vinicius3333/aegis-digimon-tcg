import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard, runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT2-041.js";
import "./BT2-042.js";
import "./BT2-043.js";
import "./BT2-044.js";
import "./BT2-045.js";
import "./BT2-046.js";
import "./BT2-047.js";
import "./BT2-048.js";
import "./BT2-049.js";
import "./BT2-050.js";

const CARD_IDS = [
  "BT2-041",
  "BT2-042",
  "BT2-043",
  "BT2-044",
  "BT2-045",
  "BT2-046",
  "BT2-047",
  "BT2-048",
  "BT2-049",
  "BT2-050",
] as const;

describe("BT2-041 through BT2-050 IR coverage", () => {
  it("registers every range card through complete compiled IR", () => {
    for (const cardId of CARD_IDS) {
      expect(hasRegisteredCompiledCard(cardId)).toBe(true);
      expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
    }
  });

  it("retains the printed range contracts and corrected direct semantics", () => {
    expect(runtimeCompiledCard("BT2-041")?.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "WhenDigivolving",
          actions: [
            expect.objectContaining({ kind: "Suspend", trackCount: "suspendedThisEffect" }),
            expect.objectContaining({
              kind: "RepeatPerCount",
              countSource: "suspendedThisEffect",
              action: expect.objectContaining({ kind: "ModifyDP", amount: -4000 }),
            }),
          ],
        }),
      ]),
    );
    expect(runtimeCompiledCard("BT2-042")?.effects).toEqual([]);
    expect(runtimeCompiledCard("BT2-043")?.effects[0]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 1000 }],
    });
    expect(runtimeCompiledCard("BT2-044")?.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" }],
    });
    expect(runtimeCompiledCard("BT2-045")?.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [{ kind: "Replacement", event: "wouldDigivolve", mode: "reduceCost", amount: 2 }],
    });
    expect(runtimeCompiledCard("BT2-046")?.effects[0]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          sourceFilter: { isSelfRef: true },
          fireCondition: { kind: "triggerDeletedLevelAtLeast", value: 6 },
        },
      ],
    });
    expect(runtimeCompiledCard("BT2-047")?.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "WhenAttacking",
          isInherited: true,
          actions: expect.arrayContaining([
            expect.objectContaining({
              kind: "PlayWithoutCost",
              suspended: true,
              optional: true,
              target: expect.objectContaining({
                filter: expect.objectContaining({ kind: ["Digimon"], colors: ["Green"], levels: [3] }),
                count: 1,
              }),
            }),
          ]),
        }),
      ]),
    );
    expect(runtimeCompiledCard("BT2-048")?.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keywords: expect.arrayContaining([expect.objectContaining({ keyword: "Blocker" })]),
        }),
      ]),
    );
    expect(runtimeCompiledCard("BT2-049")?.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "OnPlay",
          actions: expect.arrayContaining([
            expect.objectContaining({ kind: "Suspend" }),
            expect.objectContaining({
              kind: "Restrict",
              restriction: "unsuspend",
              duration: "untilOpponentNextUnsuspendPhase",
            }),
          ]),
        }),
      ]),
    );
    expect(runtimeCompiledCard("BT2-050")?.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "YourTurn",
          actions: expect.arrayContaining([
            expect.objectContaining({
              kind: "GainKeyword",
              keyword: expect.objectContaining({ keyword: "SecurityAttack", amount: 1 }),
              scaling: expect.objectContaining({
                per: 1,
                unit: "cards",
                filter: expect.objectContaining({ excludeSelf: true, suspended: true, kind: ["Digimon"] }),
              }),
            }),
          ]),
        }),
      ]),
    );
  });
});
