import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT19-059.js";

describe("BT19-059", () => {
  it("preserves Retaliation, Save, and inherited Reboot", () => {
    const card = runtimeCompiledCard("BT19-059");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      { trigger: "Static", keywords: [{ keyword: "Retaliation" }] },
      { trigger: "OnDeletion", keywords: [{ keyword: "Save" }] },
      { trigger: "Static", isInherited: true, keywords: [{ keyword: "Reboot" }] },
    ]);
  });
});
