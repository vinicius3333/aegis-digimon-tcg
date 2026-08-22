import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX11-043.js";
import "../index.js";
describe("EX11-043 Invisimon", () => { it("has Security Attack +1", async () => { const s = setupEngine({ 0: { battleArea: [{ card: "EX11-043", as: "card", under: ["BT1-001"] }] } }); await s.ready(); expect(observe(s.engine).keywordAmount(s.perm("card"), "SecurityAttack")).toBe(1); }); });
