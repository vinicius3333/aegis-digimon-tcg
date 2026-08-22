import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-096.js";
import "../index.js";

describe("BT26-096 Kosuke Misono", () => {
  it("sets memory at the start of turn only at two or less", () => {
    expect(compiled).toMatchObject({
      coverage: "full",
      effects: [{ trigger: "StartOfYourTurn", actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }] }],
    });
  });

  it("returns itself to the deck bottom before playing a Chronomon-text Digimon at cost minus 2", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-096", as: "kosuke" }],
        hand: [{ card: "BT26-009", as: "target" }],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 1;

    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("kosuke"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("target").instanceId));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(s.inst("kosuke").instanceId);
  });
});
