import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX11-035.js";
import "../index.js";
describe("EX11-035 Zephagamon", () => { it("has Piercing, Vortex, and Blocker", async () => { const s = setupEngine({ 0: { battleArea: [{ card: "EX11-035", as: "card" }] } }); await s.ready(); expect(observe(s.engine).hasKeyword(s.perm("card"), "Piercing")).toBe(true); expect(observe(s.engine).hasKeyword(s.perm("card"), "Vortex")).toBe(true); expect(observe(s.engine).hasKeyword(s.perm("card"), "Blocker")).toBe(true); }); });
