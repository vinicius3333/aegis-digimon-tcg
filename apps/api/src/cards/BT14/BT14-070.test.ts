import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-070.js";

describe("BT14-070", () => it("inherits once-per-turn memory when trashed from hand during your turn", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenTrashedFromHand", actions: [{ kind: "GainMemory", amount: 1 }] }] })));
