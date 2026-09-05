import { describe, expect, it } from "vitest";
import { EffectTiming, Zone } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-057.js";

describe("EX7-057", () => {
  it("trashes 2 cards to delete one opposing Digimon with 7000 DP or less on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "Trash", target: { count: 2 } },
      { kind: "Delete", target: { count: 1, filter: { dp: { op: "lte", value: 7000 } } } },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toHaveLength(2);
  });
  it("has Dark Dragon as a rule trait and inherits Security Attack +1 with four or fewer hand cards", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")?.actions[0]).toMatchObject({
      kind: "GrantStatic",
      tokens: ["Dark Dragon"],
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "Aura",
      effect: { kind: "keyword", keyword: { keyword: "SecurityAttack", amount: 1 } },
      while: { kind: "zoneCount", value: 4 },
    });
  });

  it("publicly trashes two hand cards and deletes an opposing Digimon at the 7000 DP ceiling", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-057", as: "loud" }], hand: ["BT1-009", "BT1-010"] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "ceiling", dp: 7000 },
            { card: "BT1-010", as: "over", dp: 8000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("loud"));
    expect(s.state.players[0]!.trash.filter((card) => ["BT1-009", "BT1-010"].includes(card.cardId))).toHaveLength(2);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-009")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-010")).toBe(true);
  });

  it("publicly grants inherited Security Attack +1 at four hand cards but not five", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX7-055", as: "host", under: ["EX7-057"] }],
        hand: ["BT1-009", "BT1-010", "BT1-009", "BT1-010"],
      },
    });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
    s.give(0, Zone.Hand, "BT1-009");
    await advance(s.engine).recompute();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(0);
  });
});
