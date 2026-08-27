import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT16-036.js";
import "../index.js";

describe("BT16-036", () => {
  it("models Barrier, Blocker, Partition, and the Boss/D-Brigade traits", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      keywords: [{ keyword: "Barrier" }, { keyword: "Blocker" }, { keyword: "Partition" }],
      actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Boss", "D-Brigade"] }],
    });
  });

  it("DNA digivolves for free and applies its When Digivolving effects", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Main",
      actions: [{ kind: "DnaDigivolve", payCost: false, optional: true }],
    });
    expect(compiled.effects?.[2]?.actions?.[0]).toMatchObject({ kind: "DeDigivolve", amount: 3 });
    expect(compiled.effects?.[2]?.actions?.[1]).toMatchObject({
      kind: "ModifyDP",
      amount: -8000,
      duration: "forTheTurn",
    });
  });

  it("trashes the top card of both security stacks at opponent-turn end", () => {
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "EndOfOpponentsTurn",
      actions: [{ kind: "Trash" }, { kind: "Trash" }],
    });
  });

  it("trashes your security card even when the opponent has no security", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT16-036", as: "chaosmon" }], security: ["BT1-009"] },
      1: { security: [] },
    });
    s.state.turnSeat = 1;

    await advance(s.engine).fire(EffectTiming.EndOfOpponentsTurn, s.perm("chaosmon"));

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("keeps Barrier, Blocker, Partition, Boss, and D-Brigade active live", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT16-036", as: "chaosmon" }] } });
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("chaosmon"), "Barrier")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("chaosmon"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("chaosmon"), "Partition")).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("chaosmon"), "Boss")).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("chaosmon"), "D-Brigade")).toBe(true);
  });
});
