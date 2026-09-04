import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-033.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX7-033", () => {
  it("also has the Dinosaur trait", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")?.actions[0]).toMatchObject({
      kind: "GrantStatic",
      grant: "trait",
      tokens: ["Dinosaur"],
    }));
  it("inherits Piercing", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Piercing",
      raw: "＜Piercing＞",
    }));

  it("exposes the Dinosaur rule trait and inherited Piercing on a live stack", async () => {
    const source = setupEngine({ 0: { battleArea: [{ card: "EX7-033", as: "source" }] } });
    await source.ready();
    expect(observe(source.engine).hasEffectiveTrait(source.perm("source"), "Dinosaur")).toBe(true);

    const host = setupEngine({ 0: { battleArea: [{ card: "EX7-036", as: "host", under: ["EX7-033"] }] } });
    await host.ready();
    expect(observe(host.engine).hasPierce(host.perm("host"))).toBe(true);
  });
});
