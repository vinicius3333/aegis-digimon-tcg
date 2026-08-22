import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX11-050.js";
import "../index.js";
describe("EX11-050 Loudmon", () => { it("has Scapegoat and Security Attack +1", async () => { const s = setupEngine({ 0: { battleArea: [{ card: "EX11-050", as: "card" }] } }); await s.ready(); expect(observe(s.engine).hasKeyword(s.perm("card"), "Scapegoat")).toBe(true); expect(observe(s.engine).keywordAmount(s.perm("card"), "SecurityAttack")).toBe(1); }); });
