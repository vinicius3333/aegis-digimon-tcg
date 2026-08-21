import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST23-14.js";
import "./ST23-12.js";

describe("ST23-14 Reina Sakuya & Makoto Kuonji", () => {
  it("suspends itself and grants Jamming to an exact Glowing Dawn Digimon when its under-card is trashed", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "ST23-14", as: "tamer", under: [{ card: "BT1-001", faceUp: false }] },
          { card: "ST23-11", as: "glowing" },
        ],
        hand: [{ card: "ST23-12", as: "liollmon" }],
        trash: [{ card: "ST23-03", as: "returnTarget" }],
        deck: ["BT1-002"],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    const underId = s.perm("tamer").stack[0]!.instanceId;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("liollmon").instanceId })).toEqual({ ok: true });
    await settle(() => {
      return s.state.players[0]!.trash.some((card) => card.instanceId === underId) && s.perm("tamer").isSuspended;
    });

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === underId)).toBe(true);
    expect(s.perm("tamer").stack.some((card) => card.instanceId === underId)).toBe(false);
    expect(s.perm("tamer").isSuspended).toBe(true);
  });
});
