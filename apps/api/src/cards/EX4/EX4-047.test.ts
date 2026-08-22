import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX4-047.js";

describe("EX4-047 DarkKnightmon", () => {
  it("grants Blocker to one own Digimon and, while DigiXrosing, one opposing Digimon", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions;
    expect(actions?.[0]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "Blocker" }, target: { filter: { controller: "mine" } } });
    expect(actions?.[1]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "Blocker" }, target: { filter: { controller: "opponent" } }, condition: { kind: "digiXrosCount", minimum: 1 } });
  });
  it("reveals two and adds one Blue Flare or Twilight card on deletion", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({ kind: "RevealAdd", revealCount: 2, rest: "trash", add: [{ filter: { nameOrTrait: [{ match: "trait", tokens: ["Blue Flare", "Twilight"] }] } }] });
  });

  it("grants Blocker to one own Digimon on play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX4-047", as: "source" }, { card: "BT1-009", as: "target" }] } }, { autoSelectCards: true });
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));

    expect(["source", "target"].some((name) => observe(s.engine).hasKeyword(s.perm(name), "Blocker"))).toBe(true);
  });
});
