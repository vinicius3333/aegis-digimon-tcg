import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-059 DeadlyAxemon", () => {
  it("preserves Retaliation, Save on deletion, and inherited Reboot", () => {
    const card = runtimeCompiledCard("BT19-059");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      { trigger: "Static", actions: [], keywords: [{ keyword: "Retaliation", raw: "＜Retaliation＞" }] },
      { trigger: "OnDeletion", actions: [], keywords: [{ keyword: "Save", raw: "＜Save＞" }] },
      { trigger: "Static", actions: [], isInherited: true, keywords: [{ keyword: "Reboot", raw: "＜Reboot＞" }] },
    ]);
  });
});
