import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT14-055.js";

describe("BT14-055", () => it("inherits Blocker", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "Blocker", raw: "＜Blocker＞" })));

it("exposes inherited Blocker on the host Digimon", async () => {
  const s = setupEngine({ 0: { battleArea: [{ card: "BT14-042", as: "host", under: ["BT14-055"] }] } });
  await s.ready();
  expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
});
