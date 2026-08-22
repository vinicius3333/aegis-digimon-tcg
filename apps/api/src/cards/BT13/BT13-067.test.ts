import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-067.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT13-067 Gladimon", () => {
  it("registers Jamming and inherited Reboot", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "Static", keywords: [expect.objectContaining({ keyword: "Jamming" })] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "Static", isInherited: true, keywords: [expect.objectContaining({ keyword: "Reboot" })] });
  });

  it("exposes Jamming on the live Gladimon permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-067", as: "gladi" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("gladi"), "Jamming")).toBe(true);
  });
});
