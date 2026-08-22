import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT14-016.js";

describe("BT14-016", () => it("has Raid", () => expect(compiled.effects?.find((entry) => entry.keywords?.length)?.keywords).toContainEqual({ keyword: "Raid", raw: "＜Raid＞" })));

it("exposes Raid on the battle-area Digimon", async () => {
  const s = setupEngine({ 0: { battleArea: [{ card: "BT14-016", as: "triceramon" }] } });
  await s.ready();
  expect(observe(s.engine).hasKeyword(s.perm("triceramon"), "Raid")).toBe(true);
});
