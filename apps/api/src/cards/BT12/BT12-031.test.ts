import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-031.js";

describe("BT12-031 Imperialdramon: Fighter Mode", () => {
  it("has the printed 2-cost Dragon Mode evolution route", () => {
    expect(digivolutionRequirementsFor("BT12-031")).toContainEqual({
      names: ["Imperialdramon: Dragon Mode"],
      cost: 2,
      isAlternate: true,
    });
  });

  it("suspends source-less opponents, then returns one suspended Digimon when the instead cost is unavailable", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-031", as: "fighter" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "sourceLess" },
            { card: "BT12-025", as: "withSource", under: ["BT12-021"], suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("fighter"));
    expect(s.state.players[1]!.hand).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("may return its Dragon Mode source to bottom-deck every opposing suspended Digimon instead", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-031", as: "fighter", under: ["BT12-030"] }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "sourceLess" },
            { card: "BT12-025", as: "alreadySuspended", under: ["BT12-021"], suspended: true },
            { card: "BT1-010", as: "readyWithSource", under: ["BT12-021"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("fighter"));
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT12-030");
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("readyWithSource").isSuspended).toBe(false);
    expect(s.state.players[1]!.deck.slice(-2).map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT1-009", "BT12-025"]),
    );
  });

  it("counts distinct evolution-card colors for DP and grants exactly one of each keyword at two or more", async () => {
    const none = setupEngine({ 0: { battleArea: [{ card: "BT12-031", as: "fighter" }] } });
    await none.ready();
    expect(none.perm("fighter").currentDP).toBe(13000);
    expect(observe(none.engine).hasKeyword(none.perm("fighter"), "Blocker")).toBe(false);

    const three = setupEngine({
      0: { battleArea: [{ card: "BT12-031", as: "fighter", under: ["BT12-021", "BT1-064", "BT1-009"] }] },
    });
    await three.ready();
    expect(three.perm("fighter").currentDP).toBe(16000);
    expect(observe(three.engine).hasKeyword(three.perm("fighter"), "Blocker")).toBe(true);
    expect(observe(three.engine).keywordAmount(three.perm("fighter"), "SecurityAttack")).toBe(1);
  });
});
