import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-090.js";

describe("BT11-090 Nicolai Petrov", () => {
  it("maps catalog facts and every printed effect to IR", () => {
    expect(getCardDefinition("BT11-090")).toMatchObject({ cardId: "BT11-090", colors: ["Blue"], kinds: ["Tamer"], playCost: 3 });
    expect(compiled.effects).toMatchObject([
      { trigger: "StartOfYourMainPhase", actions: [{ kind: "GainKeyword", keyword: { keyword: "Jamming" } }] },
      { trigger: "YourTurn", actions: [{ kind: "SubTrigger", event: "whenEffectAddsToOpponentHand" }] },
      { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost" }] },
    ]);
  });

  it("grants Jamming to a Gaomon/Gaogamon-named Digimon at start of main", async () => {
    const s = setupEngine(
      { 0: { battleArea: ["BT11-090", { card: "BT11-020", as: "gaogamon" }] } },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.state.players[0]!.battleArea[0]!);
    expect(observe(s.engine).hasKeyword(s.perm("gaogamon"), "Jamming")).toBe(true);
  });

  it("suspends itself to gain 1 memory when an effect adds cards to the opponent's hand on its turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT11-090", as: "nicolai" }] } }, { autoAcceptOptional: true });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenEffectAddsToOpponentHand", { effectAddedToHandSeat: 1 });

    expect(s.perm("nicolai").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
  });

  it("does not gain memory from the same event on the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT11-090", as: "nicolai" }] } }, { autoAcceptOptional: true });
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenEffectAddsToOpponentHand", { effectAddedToHandSeat: 1 });

    expect(s.perm("nicolai").isSuspended).toBe(false);
    expect(s.state.memory).toBe(0);
  });
});
