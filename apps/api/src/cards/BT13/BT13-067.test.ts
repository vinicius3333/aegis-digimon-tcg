import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-067.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT13-067 Gladimon", () => {
  it("registers Jamming and inherited Reboot", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [{ keyword: "Reboot", raw: "＜Reboot＞" }],
    });
  });

  it("exposes Jamming on the live Gladimon permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-067", as: "gladi" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("gladi"), "Jamming")).toBe(true);
  });
});
