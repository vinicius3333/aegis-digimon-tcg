import { describe, expect, it } from "vitest";
import { advance } from "#api/engine/testkit/advance";
import { setupEngine, settle } from "#api/engine/testkit/harness";
import "#api/cards/index";

describe("inherited On Deletion effects pend on the deleted Digimon's top card", () => {
  it("still activates after a nested effect moves its digivolution card out of the trash", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT27-083",
              as: "ravemon",
              under: [
                { card: "ST24-12", as: "stackFalcomon" },
                { card: "BT26-072", as: "stackPeckmon" },
                { card: "BT27-081", as: "stackCrowmon" },
              ],
            },
            { card: "BT26-065", as: "falcomon" },
            {
              card: "BT26-094",
              as: "keenan",
              under: [
                { card: "BT27-081", as: "keenanCrowmon", faceUp: false },
                { card: "BT27-085", as: "keenanBurst", faceUp: false },
              ],
            },
          ],
          hand: [{ card: "BT27-101", as: "yaksha" }],
          trash: ["BT26-082"],
        },
        1: { hand: Array(6).fill("BT1-009") },
      },
      {
        autoSelectCards: true,
        autoAcceptOptional: true,
        preferInstanceIds,
        preferTriggerKeys: ["BT27-083"],
        declinePrompts: ["Arts Digivolve", "Burst Digivolve", "By deleting this Digimon"],
      },
    );
    await s.ready();
    preferInstanceIds.push(s.inst("stackCrowmon").instanceId, s.perm("falcomon").permanentId);

    await advance(s.engine).verb.deletePermanent([s.perm("ravemon").permanentId]);
    await settle(() => s.state.pendingDecision === undefined);

    const triggered = s.events.flatMap((event) =>
      event.kind === "effectTriggered" ? [`${event.effectKey}@${event.sourceInstanceId}`] : [],
    );
    const peckmonInherited = `BT26-072/ir-11-0@${s.inst("stackPeckmon").instanceId}`;
    expect(triggered.filter((key) => key === peckmonInherited)).toHaveLength(2);
    expect(triggered).toContain(`BT27-081/ir-11-0@${s.inst("stackCrowmon").instanceId}`);
  });
});
