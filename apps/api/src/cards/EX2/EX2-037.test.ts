import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX2-037.js";

describe("EX2-037 Reapermon", () => {
  it("has Reboot", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX2-037", as: "reapermon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("reapermon"), "Reboot")).toBe(true);
  });

  it("de-digivolves the opponent Digimon that became unsuspended", async () => {
    const s = setupEngine({
      0: { battleArea: ["EX2-037"] },
      1: { battleArea: [{ card: "EX2-037", as: "target", under: ["EX2-032"] }, "EX2-032"] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenUnsuspended", { unsuspendedPermanentId: s.perm("target").permanentId });
    await settle();
    expect(s.perm("target").stack).toHaveLength(1);
  });
});
