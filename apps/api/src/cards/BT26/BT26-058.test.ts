import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-058.js";

describe("BT26-058 HiAndromon", () => {
  it("encodes Reboot/Blocker, shared CS protection, and leave prevention paid by rotating its stack", () => {
    expect(compiled.effects?.[0]?.keywords).toEqual(expect.arrayContaining([
      expect.objectContaining({ keyword: "Reboot" }), expect.objectContaining({ keyword: "Blocker" }),
    ]));
    expect(compiled.effects?.[1]?.sharedUseKey).toBe("bt26-058-protect-cs");
    expect(compiled.effects?.[2]?.sharedUseKey).toBe("bt26-058-protect-cs");
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "AllTurns", actions: [{ kind: "Replacement", event: "wouldLeavePlay", actions: [{ kind: "Prevent", cost: { kind: "placeOwnTopAtStackBottom" } }] }] });
  });
});
