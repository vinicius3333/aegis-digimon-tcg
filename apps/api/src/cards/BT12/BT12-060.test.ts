import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-060.js";

describe("BT12-060 ChuuChuumon", () => {
  it("gives Blocker to a Save-text host on its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT12-063", as: "host", under: ["BT12-060"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
  });

  it("Saves itself under a Tamer on deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-060", as: "source" },
            { card: "BT12-094", as: "tamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const cardInstanceId = s.perm("source").topCard.instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId]);
    await settle(() => s.perm("tamer").stack.some(({ instanceId }) => instanceId === cardInstanceId));
    expect(s.perm("tamer").stack.some(({ instanceId }) => instanceId === cardInstanceId)).toBe(true);
  });
});
