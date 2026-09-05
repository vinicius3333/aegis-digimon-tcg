import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

// CR 15-14-5-1 permits a {Security} effect while its card is face-up in the
// security stack. CR 3-7-2 keeps ordinary security cards face-down/private.
// The compound [Security][Opponent's Turn] clause is therefore a resident
// effect only while the source is face-up in security, as the interpreter's
// timingForTrigger/continuous ledger implements.
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
