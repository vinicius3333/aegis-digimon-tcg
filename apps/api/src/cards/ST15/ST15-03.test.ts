import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("ST15-03 ClearAgumon", () => {
  it("grants inherited Reboot to a host containing ClearAgumon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST15-10", as: "host", under: ["BT1-009", "ST15-03"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
  });

  it("does not grant Reboot to a host without ClearAgumon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST15-10", as: "host", under: ["BT1-009"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(false);
  });
});
