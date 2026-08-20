import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-002.js";

describe("BT14-002", () => it("inherits conditional Jamming when no opposing Digimon has as many or more sources", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "YourTurn", actions: [{ kind: "GainKeyword", keyword: { keyword: "Jamming" }, condition: { kind: "opponentHasNone", filter: { digivolutionCardsCompareToSource: "gte" } } }] })));
