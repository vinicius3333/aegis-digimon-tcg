import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT9-021.js";

describe("BT9-021 Jellymon", () => {
  it("draws once per turn when its controller plays a blue Tamer", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT9-021", as: "jellymon" }, { card: "BT9-086", as: "tamer" }], deck: [{ card: "BT1-001", as: "drawn" }] } });
    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("tamer").permanentId });
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });

  it("as an inherited effect returns an opposing level 3 after an effect adds to hand", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT9-025", as: "host", under: ["BT9-021"] }], trash: [{ card: "BT1-001", as: "added" }] }, 1: { battleArea: [{ card: "BT1-028", as: "target" }] } }, { autoSelectCards: true });
    const targetId = s.perm("target").topCard!.instanceId;
    await advance(s.engine).verb.returnToHand([s.inst("added").instanceId]);
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === targetId)).toBe(true);
  });

  it("does not return an opposing level 3 when an effect adds a card to the opponent's hand", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT9-025", as: "host", under: ["BT9-021"] }] },
      1: {
        battleArea: [{ card: "BT1-028", as: "target" }],
        trash: [{ card: "BT1-001", as: "added" }],
      },
    });
    const targetId = s.perm("target").topCard!.instanceId;
    await advance(s.engine).verb.returnToHand([s.inst("added").instanceId]);
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === targetId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === targetId)).toBe(false);
  });
});
