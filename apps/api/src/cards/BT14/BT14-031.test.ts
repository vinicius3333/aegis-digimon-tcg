import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-031.js";

describe("BT14-031", () => it("inherits once-per-turn -2000 DP to an opposing Digimon when attacking", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn", actions: [{ kind: "ModifyDP", amount: -2000, duration: "forTheTurn" }] })));
