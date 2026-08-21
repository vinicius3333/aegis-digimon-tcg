import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT14-035.js";

describe("BT14-035", () => it("has Barrier", () => expect(compiled.effects?.find((entry) => entry.keywords?.length)?.keywords).toContainEqual({ keyword: "Barrier", raw: "＜Barrier＞" })));

it("exposes Barrier on the battle-area Digimon", async () => {
  const s = setupEngine({ 0: { battleArea: [{ card: "BT14-035", as: "unimon" }] } });
  await s.ready();
  expect(observe(s.engine).hasKeyword(s.perm("unimon"), "Barrier")).toBe(true);
});
