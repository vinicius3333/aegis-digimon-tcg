import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT19-028 Xiangpengmon", () => {
  it("naturally resolves When Digivolving after a level-5 evolution", async () => {
    const preferredInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-025", as: "base" },
            { card: "BT19-019", as: "other", suspended: true },
          ],
          hand: [{ card: "BT19-028", as: "xiang" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferredInstanceIds },
    );
    const other = s.perm("other");
    preferredInstanceIds.push(other.topCard!.instanceId);
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("xiang").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-028");
    expect(other.isSuspended).toBe(false);
    expect(s.perm("base").stack.map((card) => card.cardId)).toContain("BT19-019");
    expect(s.state.memory).toBe(8);
  });

  it("has Security Attack +1, Blocker, and Aquatic without leaking them", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT19-028", as: "xiang" },
          { card: "BT19-015", as: "peer" },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("xiang"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).hasKeyword(s.perm("xiang"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("xiang"), "Aquatic")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("peer"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("peer"), "Aquatic")).toBe(false);
  });

  it("unsuspends a Digimon, then may place another Aqua-category Digimon under itself for 3 memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-019", as: "aquatic", suspended: true },
            { card: "BT19-028", as: "xiang" },
            { card: "BT19-015", as: "nonmatching" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    const aquatic = s.perm("aquatic");
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("xiang"));
    expect(aquatic.isSuspended).toBe(false);
    expect(s.perm("xiang").stack.map((card) => card.cardId)).toEqual(["BT19-019"]);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-015")).toBe(true);
    expect(s.state.memory).toBe(3);
  });

  it("declining the placement still keeps the preceding unsuspend and gains no memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-019", as: "aquatic", suspended: true },
            { card: "BT19-028", as: "xiang" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("xiang"));
    expect(s.perm("aquatic").isSuspended).toBe(false);
    expect(s.perm("xiang").stack).toHaveLength(0);
    expect(s.state.memory).toBe(0);
  });
});
