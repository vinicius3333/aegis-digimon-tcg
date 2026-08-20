import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-022.js";

describe("BT14-022", () => it("when attacking trashes one opposing source and returns a source-less level-five-or-lower Digimon", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({ actions: [{ kind: "TrashDigivolution", amount: 1 }, { kind: "Return", to: "hand", target: { filter: { digivolutionCards: "none", levelComparison: { op: "lte", value: 5 } } } }] })));
