import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT11-102.js";

describe("BT11-102 High Mega Blaster", () => {
  it("registers distinct main and security suspension effects", () => {
    const compiled = runtimeCompiledCard("BT11-102")!;
    expect(compiled.effects.find(({ trigger }) => trigger === "Main")).toBeDefined();
    expect(compiled.effects.find(({ trigger, isSecurity }) => trigger === "Security" && isSecurity)).toBeDefined();
  });
});
