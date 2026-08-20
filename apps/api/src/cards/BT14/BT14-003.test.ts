import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-003.js";

describe("BT14-003", () => it("inherits once-per-turn draw when your security increases", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenAddSecurity", fireCondition: { kind: "triggerSecurityIsYours" }, actions: [{ kind: "Draw", amount: 1 }] }] })));
