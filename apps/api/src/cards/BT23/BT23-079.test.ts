import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-079.js";

describe("BT23-079 Eri Karan", () => {
  it("suspends Eri and gives the linked trigger subject +3000 DP through the opponent turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-079", as: "eri" },
            { card: "BT23-047", as: "linked" },
            { card: "BT1-009", as: "other" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const linkedBefore = s.perm("linked").currentDP;
    const otherBefore = s.perm("other").currentDP;

    await advance(s.engine).fireSubTrigger("whenLinked", {
      subjectPermanentId: s.perm("linked").permanentId,
    });

    expect(s.perm("eri").isSuspended).toBe(true);
    expect(s.perm("linked").currentDP).toBe(linkedBefore + 3000);
    expect(s.perm("other").currentDP).toBe(otherBefore);
  });

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
    const appFuse = (compiled.effects.find((entry) => entry.trigger === "YourTurn") as any).actions[0].actions[1];
    expect(appFuse).toMatchObject({
      kind: "AppFuse",
      from: ["hand"],
      into: { kind: ["Digimon"] },
      optional: true,
    });
  });

  it("keeps the App Fuse tail inside the linked trigger and behind the suspend cost", () => {
    const actions = (compiled.effects.find((entry) => entry.trigger === "YourTurn") as any).actions;
    expect(actions).toHaveLength(1);
    expect(actions[0].actions.map((action: any) => action.kind)).toEqual(["ModifyDP", "AppFuse"]);
    expect(actions[0].actions[0]).toMatchObject({ optional: true, abortOnDecline: true });
  });
});
