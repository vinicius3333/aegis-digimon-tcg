import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-016.js";

describe("BT14-016", () => it("has Raid", () => expect(compiled.effects?.find((entry) => entry.keywords?.length)?.keywords).toContainEqual({ keyword: "Raid", raw: "＜Raid＞" })));
