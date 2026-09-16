import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX11 Security Reboot location", () => {
  it.each(["EX11-025", "EX11-030"] as const)(
    "does not grant Reboot while %s remains face-down in security",
    async (cardId) => {
      const s = setupEngine({
        0: {
          security: [{ card: cardId, as: "security", faceUp: false }],
          battleArea: [{ card: cardId, as: "royalBase" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      });
      s.state.turnSeat = 1;
      await s.ready();

      expect(observe(s.engine).hasKeyword(s.perm("royalBase"), "Reboot")).toBe(false);
    },
  );
});
