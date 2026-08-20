import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-001.js";

describe("BT14-001", () => it("inherits once-per-turn draw when an opponent security card is removed during your turn", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenSecurityRemoved", sourceFilter: { controller: "opponent" }, actions: [{ kind: "Draw", amount: 1 }] }] })));
