import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./EX11-049.js";
import "../index.js";
describe("EX11-049 Punkmon", () => { it("gives its host +2000 DP during its controller's turn", async () => { const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX11-049"] }] } }); await s.ready(); expect(s.perm("host").currentDP).toBe(5000); }); });
