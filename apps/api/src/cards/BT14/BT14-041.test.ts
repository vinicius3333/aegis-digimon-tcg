import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-041.js";

describe("BT14-041", () => it("once per turn after your security increases gives an opponent -7000 DP and itself Security Attack +1", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")).toMatchObject({ frequency: "OncePerTurn", keywords: [{ keyword: "Recovery", amount: 1 }], actions: [{ kind: "SubTrigger", event: "whenAddSecurity", actions: [{ kind: "ModifyDP", amount: -7000 }, { kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: 1 } }] }] })));
