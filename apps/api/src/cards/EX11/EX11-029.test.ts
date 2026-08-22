import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX11-029.js";
import "../index.js";
describe("EX11-029 Turbomon", () => { it("has Piercing", async () => { const s = setupEngine({ 0: { battleArea: [{ card: "EX11-029", as: "card" }] } }); await s.ready(); expect(observe(s.engine).hasKeyword(s.perm("card"), "Piercing")).toBe(true); }); });
