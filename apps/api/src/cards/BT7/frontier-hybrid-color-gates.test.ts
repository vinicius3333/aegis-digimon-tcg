import { describe, expect, it } from "vitest";
import { matchingAlternateDigivolutionRequirement } from "../../engine/cards/cardData.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-011.js";
import "./BT7-021.js";
import "./BT7-022.js";
import "./BT7-023.js";
import "./BT7-035.js";
import "./BT7-036.js";
import "./BT7-047.js";
import "./BT7-060.js";
import "./BT7-061.js";
import "./BT7-071.js";
import "./BT7-073.js";

const cases = [
  { hybrid: "BT7-011", correctTamer: "BT7-085", wrongTamer: "BT7-087", color: "Red", cost: 2 },
  { hybrid: "BT7-021", correctTamer: "BT7-087", wrongTamer: "BT7-088", color: "Blue", cost: 2 },
  { hybrid: "BT7-022", correctTamer: "BT7-087", wrongTamer: "BT7-088", color: "Blue", cost: 2 },
  { hybrid: "BT7-023", correctTamer: "BT7-087", wrongTamer: "BT7-088", color: "Blue", cost: 2 },
  { hybrid: "BT7-035", correctTamer: "BT7-088", wrongTamer: "BT7-089", color: "Yellow", cost: 2 },
  { hybrid: "BT7-036", correctTamer: "BT7-088", wrongTamer: "BT7-089", color: "Yellow", cost: 2 },
  { hybrid: "BT7-047", correctTamer: "BT7-089", wrongTamer: "BT7-090", color: "Green", cost: 2 },
  { hybrid: "BT7-060", correctTamer: "BT7-090", wrongTamer: "BT7-091", color: "Black", cost: 2 },
  { hybrid: "BT7-061", correctTamer: "BT7-090", wrongTamer: "BT7-091", color: "Black", cost: 3 },
  { hybrid: "BT7-071", correctTamer: "BT7-091", wrongTamer: "BT7-085", color: "Purple", cost: 2 },
  { hybrid: "BT7-073", correctTamer: "BT7-091", wrongTamer: "BT7-085", color: "Purple", cost: 2 },
] as const;

describe("BT7 Frontier Hybrid Tamer color gates", () => {
  it.each(cases)(
    "allows $hybrid only on a $color Tamer for its $cost cost",
    async ({ hybrid, correctTamer, wrongTamer, color, cost }) => {
      expect(matchingAlternateDigivolutionRequirement(hybrid, wrongTamer)).toBeUndefined();
      expect(matchingAlternateDigivolutionRequirement(hybrid, correctTamer)).toMatchObject({
        cost,
        baseIsTamer: true,
        baseColors: [color],
      });

      const s = setupEngine({
        0: {
          battleArea: [
            { card: correctTamer, as: "correctTamer" },
            { card: wrongTamer, as: "wrongTamer" },
          ],
          hand: [{ card: hybrid, as: "hybrid" }],
          deck: ["BT1-001"],
        },
      });
      s.state.memory = cost;
      const hybridId = s.inst("hybrid").instanceId;

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("wrongTamer").permanentId,
          instanceId: hybridId,
        }),
      ).toEqual({ ok: false, reason: "invalid-evolution" });
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("correctTamer").permanentId,
          instanceId: hybridId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("correctTamer").topCard?.instanceId === hybridId);

      expect(s.perm("correctTamer").topCard?.instanceId).toBe(hybridId);
      expect(s.state.memory).toBe(0);
      assertNoLoudGap(s);
    },
  );
});
