import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX11-060 Arisa Kinosaki", () => {
  it("suspends to draw and plays a level-4-or-lower Puppet after an effect deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-060", as: "arisa" },
            { card: "EX11-024", as: "puppet" },
          ],
          hand: [{ card: "EX11-022", as: "puppetInHand" }],
          deck: ["BT1-001", "BT1-002"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("puppet").permanentId]);
    await settle(() => s.perm("arisa").isSuspended);

    expect(s.perm("arisa").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "EX11-022")).toBe(true);
    assertNoLoudGap(s);
  });
});
