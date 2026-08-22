import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX11-012.js";
import "../index.js";

describe("EX11-012 Medusamon", () => {
  it("has Rush and Progress", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX11-012", as: "medusamon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("medusamon"), "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("medusamon"), "Progress")).toBe(true);
  });
});
