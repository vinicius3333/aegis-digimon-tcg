import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX11-040.js";
import "../index.js";
describe("EX11-040 Mulemon", () => { it("has Reboot", async () => { const s = setupEngine({ 0: { battleArea: [{ card: "EX11-040", as: "card" }] } }); await s.ready(); expect(observe(s.engine).hasKeyword(s.perm("card"), "Reboot")).toBe(true); }); });
