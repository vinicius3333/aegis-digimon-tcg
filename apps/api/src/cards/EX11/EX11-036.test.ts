import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX11-036.js";
import "../index.js";
describe("EX11-036 Dalphomon", () => { it("has Vortex", async () => { const s = setupEngine({ 0: { battleArea: [{ card: "EX11-036", as: "card" }] } }); await s.ready(); expect(observe(s.engine).hasKeyword(s.perm("card"), "Vortex")).toBe(true); }); });
