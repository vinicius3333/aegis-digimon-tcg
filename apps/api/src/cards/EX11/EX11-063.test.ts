import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX11-063.js";
import "../index.js";
describe("EX11-063 Winr", () => { it("has Collision and Piercing", async () => { const s = setupEngine({ 0: { battleArea: [{ card: "EX11-063", as: "card" }] } }); await s.ready(); expect(observe(s.engine).hasKeyword(s.perm("card"), "Collision")).toBe(true); expect(observe(s.engine).hasKeyword(s.perm("card"), "Piercing")).toBe(true); }); });
