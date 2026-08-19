import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-079.js";

describe("BT23-079 Eri Karan", () => {
  it("targets the linked Digimon itself for the +3000 DP effect", () => {
    const watcher = (compiled.effects.find((entry) => entry.trigger === "YourTurn") as any).actions[0];
    expect(watcher.event).toBe("whenLinked");
    expect(watcher.actions[0].target.sourceRef).toBe("triggerSubject");
    expect(watcher.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 3000,
      duration: "untilOpponentTurnEnd",
      cost: { kind: "suspend", target: { isSelf: true, filter: { isSelfRef: true } } },
    });
  });

  it("models the follow-up App Fuse from hand into any Digimon fusion target", () => {
    const appFuse = (compiled.effects.find((entry) => entry.trigger === "YourTurn") as any).actions[1];
    expect(appFuse).toMatchObject({
      kind: "AppFuse",
      from: ["hand"],
      into: { kind: ["Digimon"] },
      optional: true,
    });
  });
});
