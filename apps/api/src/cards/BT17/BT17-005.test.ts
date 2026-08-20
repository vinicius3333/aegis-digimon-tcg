import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-005.js";

describe("BT17-005", () => {
  it("gains 1 memory on deletion as inherited when it had Unidentified", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "OnDeletion", isInherited: true, actions: [{ kind: "GainMemory", amount: 1, condition: { kind: "selfHasTrait" } }] });
  });
});
