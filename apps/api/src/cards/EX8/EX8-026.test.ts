import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./EX8-026.js";

describe("EX8-026", () => {
  it("has Blast Digivolve, de-digivolves and bottom-decks an opposing Digimon on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords?.[0]).toMatchObject({ keyword: "BlastDigivolve" });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([{ kind: "DeDigivolve", amount: 1 }, { kind: "Return", to: "deckBottom", target: { filter: { playCostLte: 7 } } }]);
  });
  it("prevents opposing Digimon from suspending while you have at least 1 memory and grants Aquatic", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({ kind: "Restrict", restriction: "suspend", while: { kind: "memoryAtLeast", value: 1 } });
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")?.actions[0]).toMatchObject({ kind: "GrantStatic", tokens: ["Aquatic"] });
  });
  it("applies and removes the live opposing suspend restriction at the memory threshold", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX8-026", as: "metal" }] }, 1: { battleArea: [{ card: "AD1-001", as: "opponent" }] } });
    s.state.memory = 1;
    await advance(s.engine).recompute();
    await settle(() => observe(s.engine).isRestricted(s.perm("opponent"), "suspend"));
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "suspend")).toBe(true);

    s.state.memory = 0;
    await advance(s.engine).recompute();
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "suspend")).toBe(false);
  });
});
