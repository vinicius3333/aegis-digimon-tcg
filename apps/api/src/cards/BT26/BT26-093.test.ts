import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-093.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT26-093 compiled fidelity", () => {
  it("registers the hand placement cost, global attack watcher, grants, and Security play", () => {
    const card = compiled;
    expect(card?.coverage).toBe("full");
    expect(card?.effects?.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    });
    expect(card?.effects?.find((effect) => effect.trigger === "StartOfYourMainPhase")?.actions).toMatchObject([
      { kind: "PlaceUnder", faceDown: true },
      { kind: "Draw", amount: 1 },
      { kind: "GainMemory", amount: 1 },
    ]);
    const watcher = card?.effects?.find((effect) => effect.trigger === "AllTurns")?.actions?.[0];
    expect(watcher).toMatchObject({ kind: "SubTrigger", event: "whenAttacking" });
    expect(watcher?.actions).toMatchObject([
      { kind: "Suspend", target: { isSelf: true } },
      { kind: "PlaceUnder", fromDeckTop: true, faceDown: true },
      { kind: "GainKeyword", keyword: { keyword: "Collision" } },
      { kind: "GainKeyword", keyword: { keyword: "Blocker" } },
    ]);
  });

  it("places a BEATBREAK card under itself, draws, and gains memory at main-phase start", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-093", as: "reina" }],
          hand: [{ card: "ST23-08", as: "beatbreak" }],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("reina"));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.perm("reina").stack.some((card) => card.cardId === "ST23-08")).toBe(true);
  });

  it("pays the attack reaction and grants Collision and Blocker to a BEATBREAK Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT26-093", as: "reina" },
          { card: "BT26-052", as: "beatbreak" },
        ],
        deck: [{ card: "BT1-001", as: "placed" }],
      },
    }, { autoSelectCards: true });
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenAttacking", {
      attackerPermanentId: s.perm("beatbreak").permanentId,
    });

    expect(s.perm("reina").isSuspended).toBe(true);
    expect(s.perm("reina").stack[0]).toMatchObject({ instanceId: s.inst("placed").instanceId, faceUp: false });
    expect(observe(s.engine).hasKeyword(s.perm("beatbreak"), "Collision")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("beatbreak"), "Blocker")).toBe(true);
  });
});
