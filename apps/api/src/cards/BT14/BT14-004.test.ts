import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-004.js";

describe("BT14-004", () => it("inherits once-per-turn +2000 DP when your effect suspends a Tamer", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenEffectSuspends", sourceFilter: { kind: ["Tamer"] }, bySourceController: "mine", actions: [{ kind: "ModifyDP", amount: 2000, duration: "forTheTurn" }] }] })));
