import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST15-12 WarGreymon", () => {
  it("unsuspends itself when either player's security loses a card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST15-12", as: "wargreymon", suspended: true }] },
      1: { security: ["BT1-001"] },
    }, { autoAcceptOptional: true });

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });

    expect(s.perm("wargreymon").isSuspended).toBe(false);
  });

  it("can activate only once per turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST15-12", as: "wargreymon", suspended: true }] },
      1: { security: ["BT1-001", "BT1-001"] },
    }, { autoAcceptOptional: true });

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    expect(s.perm("wargreymon").isSuspended).toBe(false);

    s.perm("wargreymon").isSuspended = true;
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    expect(s.perm("wargreymon").isSuspended).toBe(true);
  });

  it("does not unsuspend when the optional effect is declined", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST15-12", as: "wargreymon", suspended: true }] },
      1: { security: ["BT1-001"] },
    }, { autoDeclineOptional: true });

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });

    expect(s.perm("wargreymon").isSuspended).toBe(true);
  });
});
