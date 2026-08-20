import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-055.js";

describe("BT14-055", () => it("inherits Blocker", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "Blocker", raw: "＜Blocker＞" })));
