import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-089.js";

describe("BT17-089 Rhythm", () => {
  it("provides both suspension-triggered Your Turn effects", () => {
    expect(compiled.effects).toHaveLength(3);
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "YourTurn", actions: [{ kind: "SubTrigger", event: "whenEffectSuspends" }] });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "YourTurn" });
    expect(compiled.effects?.[1]?.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenSuspended", sourceFilter: { isSelfRef: true } });
  });

  it("provides the Security play effect", () => {
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost" }] });
  });
});
