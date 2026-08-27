import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-071.js";
import { advance } from "../../engine/testkit/advance.js";
import { EffectTiming } from "@aegis/shared";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-071", () => {
  it("gains one memory by placing Eiji Nagasumi from hand or trash underneath at the start of main phase", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      cost: { kind: "place", target: { filter: { nameOrTrait: [{ tokens: ["Eiji Nagasumi"], match: "name" }] } } },
    }));
  it("inherits once-per-turn memory when a Dark Animal or SoC Digimon is played", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenPlayed", actions: [{ kind: "GainMemory", amount: 1 }] }],
    }));
  it("places Eiji and gains memory at start of main phase", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT14-071", as: "source" }], hand: [{ card: "BT14-087", as: "eiji" }] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 3;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("source"));
    await settle(() => s.perm("source").stack.some((card) => card.cardId === "BT14-087"));
    expect(s.perm("source").stack.some((card) => card.cardId === "BT14-087")).toBe(true);
    expect(s.state.memory).toBe(4);
  });
});
