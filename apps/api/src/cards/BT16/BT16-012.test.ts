import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-012.js";

describe("BT16-012", () => {
  it("has Partition and reduces an opposing Digimon by 7000 during DNA digivolution", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Partition" }] });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "ModifyDP", amount: -7000, condition: { kind: "isDnaDigivolving" } }] });
  });
  it("deletes 4000 DP or lower opposing Digimon when digivolving or attacking", () => expect(compiled.effects?.[2]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "Delete", target: { filter: { dp: { op: "lte", value: 4000 } } } }] }));
});
