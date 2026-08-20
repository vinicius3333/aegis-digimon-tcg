import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-025.js";

describe("BT16-025", () => {
  it("models Partition", () => {
    expect(compiled.effects[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Partition" }] });
    expect(compiled.effects[3]).toMatchObject({ isInherited: true, keywords: [{ keyword: "Partition" }] });
  });

  it("suspends opposing Digimon and prevents unsuspending during DNA digivolution", () => {
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({ kind: "Suspend", target: expect.objectContaining({ count: "all" }) });
    expect(compiled.effects?.[1]?.actions?.[1]).toMatchObject({ kind: "Restrict", restriction: "unsuspend", duration: "untilOpponentTurnEnd", condition: { kind: "isDnaDigivolving" } });
  });
});
