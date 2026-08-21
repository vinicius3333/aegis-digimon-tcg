import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT14-010.js";

describe("BT14-010", () => it("has Jamming", () => expect(compiled.effects?.find((entry) => entry.keywords?.length)?.keywords).toContainEqual({ keyword: "Jamming", raw: "＜Jamming＞" })));

it("exposes Jamming on the battle-area Digimon", async () => {
  const s = setupEngine({ 0: { battleArea: [{ card: "BT14-010", as: "kokatorimon" }] } });
  await s.ready();
  expect(observe(s.engine).hasKeyword(s.perm("kokatorimon"), "Jamming")).toBe(true);
});
