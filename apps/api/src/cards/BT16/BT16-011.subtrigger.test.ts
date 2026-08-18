import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { advance } from "../../engine/testkit/advance.js";

// A3 for BT16-011's [Your Turn][Once Per Turn] SubTrigger clause: "when a red Digimon card
// returns from your trash to your hand, this Digimon gains <Rush> for the turn."
//
// This exercises the REAL IR-compiled dispatch path (interpreter.ts's runSubTrigger gates),
// not a mocked subscribeSubTrigger — the previous subTriggerSeams.test.ts proof used a bare
// `.subscribe()` with no `matches` predicate, which bypasses the interpreter's gate-building
// entirely and would stay green even if the dedicated `cardReturnsFromTrashToHandGate` were
// deleted. This test only goes green through the full IR -> runSubTrigger -> gate path.
//
// FAILS-WHEN-REVERTED: delete `cardReturnsFromTrashToHandGate` (and its filterMatch carve-out
// entry) from interpreter.ts's runSubTrigger => the generic `subjectMatchesFilter` default
// takes over, finds no `subjectPermanentId` in the whenCardReturnsFromTrashToHand payload, and
// the gate always returns false => the Rush keyword is never granted => RED.

describe("BT16-011 whenCardReturnsFromTrashToHand -> gain <Rush> for the turn", () => {
  it("returning a red Digimon from trash to hand grants Rush to BT16-011", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT16-011", dp: 9000, as: "bt16011" }],
        trash: [{ card: "BT16-011", as: "trashedRed" }],
      },
    });

    const trashedInstanceId = s.inst("trashedRed").instanceId;
    await advance(s.engine).verb.returnToHand([trashedInstanceId]);
    await settle(() => true, 20);

    const perm = s.perm("bt16011");
    const continuous = (s.engine as unknown as { continuous: { hasKeyword: (id: string, kw: string) => boolean } })
      .continuous;
    expect(continuous.hasKeyword(perm.permanentId, "Rush")).toBe(true);
  });

  it("does NOT grant Rush when the returned card is NOT a red Digimon (color-filter control)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT16-011", dp: 9000, as: "bt16011" }],
        trash: [{ card: "BT1-028", as: "trashedNonRed" }], // a non-red (Blue) Digimon
      },
    });

    const trashedInstanceId = s.inst("trashedNonRed").instanceId;
    await advance(s.engine).verb.returnToHand([trashedInstanceId]);
    await settle(() => true, 20);

    const perm = s.perm("bt16011");
    const continuous = (s.engine as unknown as { continuous: { hasKeyword: (id: string, kw: string) => boolean } })
      .continuous;
    expect(continuous.hasKeyword(perm.permanentId, "Rush")).toBe(false);
  });
});
