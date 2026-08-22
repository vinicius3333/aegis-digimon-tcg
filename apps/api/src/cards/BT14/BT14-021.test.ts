import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT14-021.js";

describe("BT14-021", () => it("has Evade", () => expect(compiled.effects?.find((entry) => entry.keywords?.length)?.keywords).toContainEqual({ keyword: "Evade", raw: "＜Evade＞" })));

it("exposes Evade on the battle-area Digimon", async () => {
  const s = setupEngine({ 0: { battleArea: [{ card: "BT14-021", as: "syakomon" }] } });
  await s.ready();
  expect(observe(s.engine).hasKeyword(s.perm("syakomon"), "Evade")).toBe(true);
});
