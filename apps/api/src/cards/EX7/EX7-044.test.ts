import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-044.js";

describe("EX7-044", () => {
  it("reveals 4, places a Three Musketeers Option under itself, and then may delete a low-cost opposing Digimon or Tamer", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      {
        kind: "RevealAdd",
        revealCount: 4,
        add: [{ count: 1, to: "placeUnder", underFilter: { isSelfRef: true } }],
      },
      { kind: "Delete", target: { count: 1, filter: { playCostLte: 3 } }, condition: { kind: "ifThisEffectActed" } },
    ]));
  it("inherits Collision", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Collision",
      raw: "＜Collision＞",
    }));

  it("deletes an opposing low-cost permanent after successfully placing the revealed Option", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-010", as: "competitor" },
            { card: "EX7-044", as: "giga" },
          ],
          deck: ["EX7-066", "BT1-001", "BT1-002", "BT1-003"],
        },
        1: { battleArea: [{ card: "BT10-058", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("giga"));
    expect(s.perm("giga").stack.some((card) => card.cardId === "EX7-066")).toBe(true);
    expect(s.perm("competitor").topCard.cardId).toBe("BT1-010");
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT10-058")).toBe(false);
  });
});
