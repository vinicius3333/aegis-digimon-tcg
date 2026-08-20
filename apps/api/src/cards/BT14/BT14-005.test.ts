import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-005.js";

describe("BT14-005", () => it("inherits once-per-turn +2000 DP by returning three D-Brigade or DigiPolice cards from trash to deck top", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn", actions: [{ kind: "ModifyDP", amount: 2000, cost: { kind: "return", target: { count: 3 }, raw: expect.stringContaining("D-Brigade") } }] })));
