import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX11-045.js";
import "../index.js";
describe("EX11-045 Metatromon", () => { it("has Blocker", async () => { const s = setupEngine({ 0: { battleArea: [{ card: "EX11-045", as: "card" }] } }); await s.ready(); expect(observe(s.engine).hasKeyword(s.perm("card"), "Blocker")).toBe(true); }); });
