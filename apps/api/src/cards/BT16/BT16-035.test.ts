import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-035.js";

describe("BT16-035", () => {
  it("grants itself the Angel trait", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Angel"] }] });
  });

  it("has Barrier, Reboot, and an optional once-per-turn unsuspend after security removal", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn", keywords: [{ keyword: "Barrier" }, { keyword: "Reboot" }] });
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({ kind: "SubTrigger", event: "whenSecurityRemoved", actions: [{ kind: "Unsuspend", optional: true }] });
  });
});
