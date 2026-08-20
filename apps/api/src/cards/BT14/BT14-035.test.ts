import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-035.js";

describe("BT14-035", () => it("has Barrier", () => expect(compiled.effects?.find((entry) => entry.keywords?.length)?.keywords).toContainEqual({ keyword: "Barrier", raw: "＜Barrier＞" })));
