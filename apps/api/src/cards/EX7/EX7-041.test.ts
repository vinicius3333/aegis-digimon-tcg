import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-041.js";

describe("EX7-041", () => {
  it("has Blocker and protects itself from effect deletion during the opponent's turn", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toContainEqual({
      keyword: "Blocker",
      raw: "＜Blocker＞",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")?.actions[0]).toMatchObject({
      kind: "GrantStatic",
      grant: "protection",
      tokens: ["beDeletedByEffects"],
    });
  });
  it("inherits Reboot", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Reboot",
      raw: "＜Reboot＞",
    }));

  it("uses Blocker publicly and protects from an opponent effect during their turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX7-041", as: "torto" }] },
      1: { battleArea: [{ card: "BT1-009", as: "other" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("torto"), "Blocker")).toBe(true);
    const removed = await advance(s.engine).verb.deletePermanent([s.perm("torto").permanentId], "byEffect");
    expect(removed).toBe(0);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX7-041")).toBe(true);
  });
});
