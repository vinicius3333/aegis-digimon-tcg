import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-021.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT16-021", () => {
  it("models Blocker and Armor Purge", () => {
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Blocker" }, { keyword: "Armor Purge" }],
    });
  });

  it("trashes and restricts an opponent Digimon when it suspends", () => {
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({ kind: "SubTrigger", event: "whenSuspended" });
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({
      actions: [
        expect.objectContaining({ kind: "Trash", target: expect.objectContaining({ count: 1 }) }),
        expect.objectContaining({ kind: "Restrict", restriction: "attackOrBlock", duration: "untilOpponentTurnEnd" }),
      ],
    });
  });

  it("trashes the top source and restricts the resulting source-less opponent", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT16-021", as: "watcher" }] },
      1: { battleArea: [{ card: "BT1-010", as: "suspended", suspended: true, under: ["BT1-009"] }] },
    });
    const sourceId = s.perm("suspended").stack[0]!.instanceId;

    await advance(s.engine).fireSubTrigger("whenSuspended", { suspendedPermanentId: s.perm("suspended").permanentId });

    expect(s.state.players[1]!.trash.some((card) => card.instanceId === sourceId)).toBe(true);
    expect(s.perm("suspended").stack).toHaveLength(0);
    expect(observe(s.engine).isRestricted(s.perm("suspended"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("suspended"), "block")).toBe(true);
  });
});
