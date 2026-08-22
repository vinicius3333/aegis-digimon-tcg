import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX11-044.js";
import "../index.js";
describe("EX11-044 Pyramidimon", () => { it("has Reboot and Fragment", async () => { const s = setupEngine({ 0: { battleArea: [{ card: "EX11-044", as: "card" }] } }); await s.ready(); expect(observe(s.engine).hasKeyword(s.perm("card"), "Reboot")).toBe(true); expect(observe(s.engine).hasKeyword(s.perm("card"), "Fragment")).toBe(true); }); });
