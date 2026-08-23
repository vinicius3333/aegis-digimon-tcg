import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-024.js";

describe("BT17-024", () => {
  it("gains Jamming on play or digivolution by placing a level 3 blue Digimon under itself", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "GainKeyword",
          keyword: { keyword: "Jamming" },
          duration: "forTheTurn",
          optional: true,
          abortOnDecline: true,
          cost: { kind: "place" },
        },
      ],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "GainKeyword",
          keyword: { keyword: "Jamming" },
          duration: "forTheTurn",
          optional: true,
          abortOnDecline: true,
          cost: { kind: "place" },
        },
      ],
    });
  });

  it("has inherited Jamming", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: [{ keyword: "Jamming" }],
    });
  });

  it("grants inherited Jamming to its host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT17-025", as: "host", under: ["BT17-024"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
  });
});
