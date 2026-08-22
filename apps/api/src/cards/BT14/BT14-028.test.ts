import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT14-028.js";

describe("BT14-028", () => {
  it("has Blocker", () => expect(compiled.effects?.find((entry) => entry.keywords?.length)?.keywords).toContainEqual({ keyword: "Blocker", raw: "＜Blocker＞" }));
  it("once per turn prevents battle deletion after an opponent source is trashed", () => expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenDigivolutionTrashed", actions: [{ kind: "Restrict", restriction: "beDeletedInBattle", duration: "untilOpponentTurnEnd" }] }] }));

  it("exposes Blocker on the battle-area Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT14-028", as: "shogun" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("shogun"), "Blocker")).toBe(true);
  });
});
