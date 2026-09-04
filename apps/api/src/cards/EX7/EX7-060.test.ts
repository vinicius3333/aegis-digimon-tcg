import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-060.js";

describe("EX7-060", () => {
  it("plays itself from trash with its cost reduced by 4 when you have four or fewer cards in hand", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: true,
      reduceCostBy: 4,
      condition: { kind: "zoneCount", value: 4 },
    }));
  it("has Blocker and on deletion may play a level 5 or lower Dark Dragon or Evil Dragon from trash", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toContainEqual({
      keyword: "Blocker",
      raw: "＜Blocker＞",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: false,
      optional: true,
      target: { count: 1, filter: { levelComparison: { op: "lte", value: 5 } } },
    });
  });

  it("publicly plays a level 5 or lower Dark Dragon from trash after deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-060", as: "nidhogg" }], trash: [{ card: "EX7-056", as: "darkDragon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("nidhogg"), "Blocker")).toBe(true);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("nidhogg").permanentId], "byBattle")).toBe(1);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX7-056"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX7-056")).toBe(true);
  });
});
