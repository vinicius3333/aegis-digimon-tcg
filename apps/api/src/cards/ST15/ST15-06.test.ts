import { describe, expect, it } from "vitest";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("ST15-06 Mekanorimon", () => {
  it("declares inherited Reboot and keeps it scoped to a host containing Mekanorimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST15-10", as: "host", under: ["BT1-009", "ST15-06"] }],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
    expect(registeredCompiledCards.get("ST15-06")?.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Static",
          isInherited: true,
          keywords: [expect.objectContaining({ keyword: "Reboot" })],
        }),
      ]),
    );
  });

  it("does not grant Reboot to an unrelated host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST15-10", as: "host", under: ["BT1-009"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(false);
  });
});
