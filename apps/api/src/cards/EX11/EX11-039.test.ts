import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX11-039.js";
import "../index.js";
describe("EX11-039 HoverEspimon", () => { it("has inherited Jamming", async () => { const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX11-039"] }] } }); await s.ready(); expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true); }); });
