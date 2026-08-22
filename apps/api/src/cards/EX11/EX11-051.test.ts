import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX11-051.js";
import "../index.js";
describe("EX11-051 Necromon", () => { it("has Piercing and Execute", async () => { const s = setupEngine({ 0: { battleArea: [{ card: "EX11-051", as: "card" }] } }); await s.ready(); expect(observe(s.engine).hasKeyword(s.perm("card"), "Piercing")).toBe(true); expect(observe(s.engine).hasKeyword(s.perm("card"), "Execute")).toBe(true); }); });
