import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-045.js";

describe("BT14-045", () => it("has Jamming", () => expect(compiled.effects?.find((entry) => entry.keywords?.length)?.keywords).toContainEqual({ keyword: "Jamming", raw: "＜Jamming＞" })));
