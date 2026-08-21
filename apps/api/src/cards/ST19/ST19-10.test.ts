import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "./ST19-10.js";
import "./ST19-07.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";

describe("ST19-10 ExTyrannomon", () => {
  it("matches the alternate digivolution, DigiXros, Armor Purge, and inherited Barrier text", () => {
    expect(getCardDefinition("ST19-10")).toMatchObject({
      effectText: expect.stringContaining("＜Armor Purge＞"),
      inheritedEffectText: "＜Barrier＞.",
      evoCosts: expect.arrayContaining([
        { color: "Yellow", level: 4, memoryCost: 4 },
        { color: "Green", level: 4, memoryCost: 4 },
      ]),
    });
  });

  it("exposes Armor Purge and inherited Barrier after a legal stack is built", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST19-10", as: "exty", under: ["ST19-07"] }] },
      1: { battleArea: [] },
    });
    await s.ready();
    const p = s.perm("exty");
    expect(observe(s.engine).hasKeyword(p, "Armor Purge")).toBe(true);
    expect(observe(s.engine).hasKeyword(p, "Barrier")).toBe(true);
  });
});
