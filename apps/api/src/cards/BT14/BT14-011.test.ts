import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT14-011.js";

describe("BT14-011", () => it("has Blocker", () => expect(compiled.effects?.find((entry) => entry.keywords?.length)?.keywords).toContainEqual({ keyword: "Blocker", raw: "＜Blocker＞" })));

it("exposes Blocker on the battle-area Digimon", async () => {
  const s = setupEngine({ 0: { battleArea: [{ card: "BT14-011", as: "monochromon" }] } });
  await s.ready();
  expect(observe(s.engine).hasKeyword(s.perm("monochromon"), "Blocker")).toBe(true);
});
