import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-008.js";

describe("BT14-008", () => it("inherits once-per-turn deletion of an opposing 3000 DP or lower Digimon when attacking", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn", actions: [{ kind: "Delete", target: { filter: { controller: "opponent", dp: { op: "lte", value: 3000 } } } }] })));
