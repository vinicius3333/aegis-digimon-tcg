import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-021.js";

describe("BT14-021", () => it("has Evade", () => expect(compiled.effects?.find((entry) => entry.keywords?.length)?.keywords).toContainEqual({ keyword: "Evade", raw: "＜Evade＞" })));
