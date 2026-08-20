import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-011.js";

describe("BT14-011", () => it("has Blocker", () => expect(compiled.effects?.find((entry) => entry.keywords?.length)?.keywords).toContainEqual({ keyword: "Blocker", raw: "＜Blocker＞" })));
