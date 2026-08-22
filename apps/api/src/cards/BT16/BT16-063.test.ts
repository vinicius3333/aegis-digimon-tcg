import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-063.js";

describe("BT16-063", () => {
  it("grants Angel and models Partition", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Partition" }],
      actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Angel"] }],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: [{ keyword: "Partition" }],
    });
  });

  it("gains immunity and places an opposing low-level security Digimon into security during DNA digivolution", () => {
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({
      kind: "GrantStatic",
      grant: "immuneToOpponentDigimonEffects",
      duration: "untilOpponentTurnEnd",
    });
    expect(compiled.effects?.[1]?.actions?.[1]).toMatchObject({
      kind: "SecurityManipulation",
      op: "placeAsSecurity",
      from: ["battleArea"],
      toTop: false,
      condition: { kind: "isDnaDigivolving" },
      source: { filter: { zone: "battleArea" } },
    });
  });
});
